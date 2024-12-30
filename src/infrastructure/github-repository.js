import { Octokit } from "octokit";

export class GithubRepository {
  constructor(token) {
    this.client = new Octokit({ auth: token });
    this.CACHE_KEY = "github_org_cache";
    this.CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  async getAllPages(method, params) {
    let allData = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await method({ ...params, page, per_page: 100 });
      allData = [...allData, ...response.data];

      const linkHeader = response.headers.link;
      hasNextPage = linkHeader && linkHeader.includes('rel="next"');
      page++;
    }

    return allData;
  }

  saveToCache(orgName, data) {
    const cache = {
      timestamp: new Date().getTime(),
      orgName,
      data,
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  getFromCache(orgName) {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    const cache = JSON.parse(cached);
    const now = new Date().getTime();

    // Check if cache is expired or for different org
    if (
      cache.orgName !== orgName ||
      now - cache.timestamp > this.CACHE_EXPIRATION
    ) {
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }

    return cache.data;
  }

  async getOrganization(orgName) {
    // Try to get data from cache first
    const cachedData = this.getFromCache(orgName);
    if (cachedData) {
      return cachedData;
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01T00:00:00Z`;

    const [repos, members, yearlyStats] = await Promise.all([
      this.getRepositories(orgName),
      this.getMembers(orgName),
      this.getYearlyStats(orgName, startOfYear),
    ]);

    const result = { repos, members, yearlyStats };

    // Save the fresh data to cache
    this.saveToCache(orgName, result);

    return result;
  }

  async getRepositories(orgName, onProgress) {
    let allRepos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await this.client.rest.repos.listForOrg({
        org: orgName,
        sort: "updated",
        per_page: 100,
        page: page,
      });

      allRepos = [...allRepos, ...response.data];

      const linkHeader = response.headers.link;
      hasNextPage = linkHeader && linkHeader.includes('rel="next"');
      page++;
    }

    let processed = 0;
    const ownRepos = [];

    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01T00:00:00Z`;

    for (const repo of allRepos) {
      try {
        const [contributors, yearlyCommits] = await Promise.all([
          this.getContributors(orgName, repo.name),
          this.getCommits(orgName, repo.name, startOfYear),
        ]);
        if (!repo.fork) {
          ownRepos.push({
            name: repo.name,
            stars: repo.stargazers_count,
            contributors: contributors || [],
            commitCount: yearlyCommits,
          });
        }
      } catch (error) {
        console.warn(`Failed to get contributors for ${repo.name}:`, error);
        ownRepos.push({
          name: repo.name,
          stars: repo.stargazers_count,
          contributors: [],
        });
      }

      processed++;
      if (onProgress) {
        onProgress(processed, allRepos.length);
      }
    }

    return ownRepos;
  }

  async getYearlyStats(orgName, startOfYear) {
    const { data: allRepos } = await this.client.rest.repos.listForOrg({
      org: orgName,
      per_page: 100,
    });

    const repoStats = await Promise.all(
      allRepos.map(async (repo) => {
        const [commits, issues, pulls] = await Promise.all([
          this.getCommits(orgName, repo.name, startOfYear),
          this.getIssues(orgName, repo.name, startOfYear),
          this.getPullRequests(orgName, repo.name, startOfYear),
        ]);

        return {
          commits,
          issues,
          pulls,
          createdAt: repo.created_at,
          archivedAt: repo.archived_at,
        };
      }),
    );

    const currentYear = new Date().getFullYear();

    // Get PR types from branch names
    const prTypes = {};
    for (const repo of allRepos) {
      try {
        const pulls = await this.client.rest.pulls.list({
          owner: orgName,
          repo: repo.name,
          state: "all",
          per_page: 100,
        });

        pulls.data.forEach((pr) => {
          const branchName = pr.head.ref;
          const type = branchName.includes("/")
            ? branchName.split("/")[0]
            : "unknown";
          if (type && new Date(pr.created_at).getFullYear() === currentYear) {
            prTypes[type] = (prTypes[type] || 0) + 1;
          }
        });
      } catch (error) {
        console.warn(`Failed to get PRs for ${repo.name}:`, error);
      }
    }

    return {
      repositories: {
        created: repoStats.filter(
          (repo) => new Date(repo.createdAt).getFullYear() === currentYear,
        ).length,
        archived: repoStats.filter(
          (repo) =>
            repo.archivedAt &&
            new Date(repo.archivedAt).getFullYear() === currentYear,
        ).length,
      },
      commits: repoStats.reduce((sum, repo) => sum + repo.commits, 0),
      issues: {
        opened: repoStats.reduce((sum, repo) => sum + repo.issues.opened, 0),
        closed: repoStats.reduce((sum, repo) => sum + repo.issues.closed, 0),
      },
      pullRequests: {
        opened: repoStats.reduce((sum, repo) => sum + repo.pulls.opened, 0),
        closed: repoStats.reduce((sum, repo) => sum + repo.pulls.closed, 0),
        types: prTypes,
      },
    };
  }

  async getCommits(owner, repo, since) {
    try {
      const response = await this.client.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner,
          repo,
          since,
          per_page: 1,
        },
      );

      const linkHeader = response.headers.link;
      if (linkHeader) {
        const matches = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (matches) {
          return parseInt(matches[1], 10);
        }
      }

      return response.data.length;
    } catch (error) {
      console.warn(`Failed to get commits for ${repo}:`, error);
      return 0;
    }
  }

  async getIssues(owner, repo, since) {
    try {
      const [opened, closed] = await Promise.all([
        this.getAllPages(
          this.client.rest.issues.listForRepo.bind(this.client.rest.issues),
          { owner, repo, state: "all", since },
        ),
        this.getAllPages(
          this.client.rest.issues.listForRepo.bind(this.client.rest.issues),
          { owner, repo, state: "closed", since },
        ),
      ]);

      return {
        opened: opened.length,
        closed: closed.length,
      };
    } catch (error) {
      return { opened: 0, closed: 0 };
    }
  }

  async getPullRequests(owner, repo, since) {
    try {
      const [opened, closed] = await Promise.all([
        this.getAllPages(
          this.client.rest.pulls.list.bind(this.client.rest.pulls),
          {
            owner,
            repo,
            state: "all",
            sort: "created",
            direction: "desc",
          },
        ),
        this.getAllPages(
          this.client.rest.pulls.list.bind(this.client.rest.pulls),
          {
            owner,
            repo,
            state: "closed",
            sort: "created",
            direction: "desc",
          },
        ),
      ]);

      const currentYear = new Date().getFullYear();

      return {
        opened: opened.filter(
          (pr) => new Date(pr.created_at).getFullYear() === currentYear,
        ).length,
        closed: closed.filter(
          (pr) => new Date(pr.closed_at).getFullYear() === currentYear,
        ).length,
      };
    } catch (error) {
      return { opened: 0, closed: 0 };
    }
  }

  async getMembers(orgName) {
    return await this.getAllPages(
      this.client.rest.orgs.listMembers.bind(this.client.rest.orgs),
      { org: orgName },
    );
  }

  async getContributors(owner, repo) {
    try {
      return await this.getAllPages(
        this.client.rest.repos.listContributors.bind(this.client.rest.repos),
        { owner, repo },
      );
    } catch (error) {
      return [];
    }
  }
}
