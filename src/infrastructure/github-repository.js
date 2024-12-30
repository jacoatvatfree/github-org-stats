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

    // Get all data in parallel
    const [members, allRepos] = await Promise.all([
      this.getMembers(orgName),
      this.getAllPages(
        this.client.rest.repos.listForOrg.bind(this.client.rest.repos),
        {
          org: orgName,
          sort: "updated",
          type: "all",
        },
      ),
    ]);

    // Filter non-forked repos
    const ownRepos = allRepos.filter((repo) => !repo.fork);

    // Get stats for all repos in parallel
    const repoStats = await Promise.all(
      ownRepos.map(async (repo) => {
        try {
          const [contributorStats, issuesAndPRs] = await Promise.all([
            this.getContributorStatsWithRetry(orgName, repo.name),
            // Get issues and PRs in one call - PRs are also issues in GitHub's API
            this.getAllPages(
              this.client.rest.issues.listForRepo.bind(this.client.rest.issues),
              {
                owner: orgName,
                repo: repo.name,
                since: startOfYear,
                state: "all",
              },
            ),
          ]);

          // Separate API calls for issues and PRs
          const issues = issuesAndPRs.filter((item) => !item.pull_request);

          // Get PRs with full details including head
          const pullRequests = await this.getAllPages(
            this.client.rest.pulls.list.bind(this.client.rest.pulls),
            {
              owner: orgName,
              repo: repo.name,
              state: "closed",
              sort: "created",
              direction: "desc",
            },
          );

          const yearlyIssues = issues.filter(
            (item) => new Date(item.created_at).getFullYear() === currentYear,
          );

          const yearlyPRs = pullRequests.filter(
            (item) => new Date(item.created_at).getFullYear() === currentYear,
          );

          return {
            name: repo.name,
            stars: repo.stargazers_count,
            contributorStats,
            issues: {
              opened: yearlyIssues.length,
              closed: yearlyIssues.filter((item) => item.state === "closed")
                .length,
            },
            pullRequests: {
              opened: yearlyPRs.length,
              closed: yearlyPRs.filter((pr) => pr.state === "closed").length,
              types: this.categorizePRTypes(yearlyPRs),
            },
            createdAt: repo.created_at,
            archivedAt: repo.archived_at,
          };
        } catch (error) {
          console.warn(`Failed to get stats for ${repo.name}:`, error);
          return null;
        }
      }),
    ).then((results) => results.filter(Boolean));

    // Calculate member contributions from repo stats
    const memberStats = {};
    repoStats.forEach((repo) => {
      if (repo.contributorStats) {
        repo.contributorStats.forEach((contributor) => {
          const login = contributor.author?.login;
          if (login) {
            const yearCommits = contributor.weeks
              .filter(
                (week) => new Date(week.w * 1000).getFullYear() === currentYear,
              )
              .reduce((sum, week) => sum + week.c, 0);
            memberStats[login] = (memberStats[login] || 0) + yearCommits;
          }
        });
      }
    });

    const enhancedMembers = members.map((member) => ({
      ...member,
      contributions: memberStats[member.login] || 0,
    }));

    const result = {
      repos: repoStats.map(({ name, stars, contributorStats, issues }) => ({
        name,
        stars,
        contributors: contributorStats?.length || 0,
        closedIssues: issues.closed || 0,
        commitCount:
          contributorStats?.reduce(
            (sum, contributor) =>
              sum +
              contributor.weeks.reduce(
                (weekSum, week) =>
                  weekSum +
                  (new Date(week.w * 1000).getFullYear() === currentYear
                    ? week.c
                    : 0),
                0,
              ),
            0,
          ) || 0,
      })),
      members: enhancedMembers,
      yearlyStats: this.calculateYearlyStats(repoStats, currentYear),
    };

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

  categorizePRTypes(prs) {
    const types = {};

    // Only count closed PRs
    const closedPRs = prs.filter((pr) => pr.state === "closed");

    closedPRs.forEach((pr) => {
      if (pr.head?.ref) {
        // Get type from branch name before the "/" or set as "unknown"
        const type = pr.head.ref.includes("/")
          ? pr.head.ref.split("/")[0].toLowerCase()
          : "unknown";

        types[type] = (types[type] || 0) + 1;
      } else {
        // If no branch ref is available, count as unknown
        types["unknown"] = (types["unknown"] || 0) + 1;
      }
    });

    return types;
  }

  calculateYearlyStats(repoStats, currentYear) {
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
      commits: repoStats.reduce(
        (sum, repo) =>
          sum +
          (repo.contributorStats?.reduce(
            (total, contributor) =>
              total +
              contributor.weeks
                .filter(
                  (week) =>
                    new Date(week.w * 1000).getFullYear() === currentYear,
                )
                .reduce((weekSum, week) => weekSum + week.c, 0),
            0,
          ) || 0),
        0,
      ),
      issues: {
        opened: repoStats.reduce((sum, repo) => sum + repo.issues.opened, 0),
        closed: repoStats.reduce((sum, repo) => sum + repo.issues.closed, 0),
      },
      pullRequests: {
        opened: repoStats.reduce(
          (sum, repo) => sum + repo.pullRequests.opened,
          0,
        ),
        closed: repoStats.reduce(
          (sum, repo) => sum + repo.pullRequests.closed,
          0,
        ),
        types: repoStats.reduce((types, repo) => {
          Object.entries(repo.pullRequests.types).forEach(([type, count]) => {
            types[type] = (types[type] || 0) + count;
          });
          return types;
        }, {}),
      },
    };
  }

  async getCommits(owner, repo, since) {
    try {
      const commits = await this.getAllPages(
        this.client.rest.repos.listCommits.bind(this.client.rest.repos),
        {
          owner,
          repo,
          since,
        },
      );
      return commits.length;
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

  async getContributorStatsWithRetry(owner, repo, retries = 3) {
    try {
      const response = await this.client.rest.repos.getContributorsStats({
        owner,
        repo,
      });

      // If status is 202, GitHub is still calculating the stats
      if (response.status === 202 && retries > 0) {
        // Wait for 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.getContributorStatsWithRetry(owner, repo, retries - 1);
      }

      // Ensure we have valid data
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn(`Failed to get contributor stats for ${repo}:`, error);
      return [];
    }
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

  async getMemberContributions(owner, repos) {
    const memberStats = {};
    const currentYear = new Date().getFullYear();

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (repo) => {
          try {
            const { data: stats } =
              await this.client.rest.repos.getContributorsStats({
                owner,
                repo: repo.name,
              });

            if (stats) {
              stats.forEach((contributor) => {
                const login = contributor.author?.login;
                if (login) {
                  // Get commits for current year from weekly data
                  const yearCommits = contributor.weeks
                    .filter(
                      (week) =>
                        new Date(week.w * 1000).getFullYear() === currentYear,
                    )
                    .reduce((sum, week) => sum + week.c, 0);

                  memberStats[login] = (memberStats[login] || 0) + yearCommits;
                }
              });
            }
          } catch (error) {
            console.warn(
              `Failed to get contributor stats for ${repo.name}:`,
              error,
            );
          }
        }),
      );

      // Add a small delay between batches
      if (i + batchSize < repos.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return memberStats;
  }
}
