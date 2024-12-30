import { Octokit } from 'octokit';

export class GithubRepository {
  constructor(token) {
    this.client = new Octokit({ auth: token });
  }

  async getOrganization(orgName) {
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01T00:00:00Z`;

    const [repos, members, yearlyStats] = await Promise.all([
      this.getRepositories(orgName),
      this.getMembers(orgName),
      this.getYearlyStats(orgName, startOfYear)
    ]);

    return { repos, members, yearlyStats };
  }

  async getRepositories(orgName) {
    const { data: repos } = await this.client.rest.repos.listForOrg({
      org: orgName,
      sort: 'updated',
      per_page: 100
    });

    const reposWithContributors = await Promise.all(
      repos.map(async repo => {
        const contributors = await this.getContributors(orgName, repo.name);
        return {
          name: repo.name,
          stars: repo.stargazers_count,
          contributors
        };
      })
    );

    return reposWithContributors;
  }

  async getYearlyStats(orgName, startOfYear) {
    const { data: allRepos } = await this.client.rest.repos.listForOrg({
      org: orgName,
      per_page: 100
    });

    const repoStats = await Promise.all(allRepos.map(async repo => {
      const [commits, issues, pulls] = await Promise.all([
        this.getCommits(orgName, repo.name, startOfYear),
        this.getIssues(orgName, repo.name, startOfYear),
        this.getPullRequests(orgName, repo.name, startOfYear)
      ]);

      return {
        commits,
        issues,
        pulls,
        createdAt: repo.created_at,
        archivedAt: repo.archived_at
      };
    }));

    const currentYear = new Date().getFullYear();

    return {
      repositories: {
        created: repoStats.filter(repo => 
          new Date(repo.createdAt).getFullYear() === currentYear
        ).length,
        archived: repoStats.filter(repo => 
          repo.archivedAt && new Date(repo.archivedAt).getFullYear() === currentYear
        ).length
      },
      commits: repoStats.reduce((sum, repo) => sum + repo.commits, 0),
      issues: {
        opened: repoStats.reduce((sum, repo) => sum + repo.issues.opened, 0),
        closed: repoStats.reduce((sum, repo) => sum + repo.issues.closed, 0)
      },
      pullRequests: {
        opened: repoStats.reduce((sum, repo) => sum + repo.pulls.opened, 0),
        closed: repoStats.reduce((sum, repo) => sum + repo.pulls.closed, 0)
      }
    };
  }

  async getCommits(owner, repo, since) {
    try {
      const { data } = await this.client.rest.repos.listCommits({
        owner,
        repo,
        since,
        per_page: 1
      });
      return data.length;
    } catch (error) {
      return 0;
    }
  }

  async getIssues(owner, repo, since) {
    try {
      const [opened, closed] = await Promise.all([
        this.client.rest.issues.listForRepo({
          owner,
          repo,
          state: 'all',
          since,
          per_page: 100
        }),
        this.client.rest.issues.listForRepo({
          owner,
          repo,
          state: 'closed',
          since,
          per_page: 100
        })
      ]);

      return {
        opened: opened.data.length,
        closed: closed.data.length
      };
    } catch (error) {
      return { opened: 0, closed: 0 };
    }
  }

  async getPullRequests(owner, repo, since) {
    try {
      const [opened, closed] = await Promise.all([
        this.client.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
          per_page: 100
        }),
        this.client.rest.pulls.list({
          owner,
          repo,
          state: 'closed',
          sort: 'created',
          direction: 'desc',
          per_page: 100
        })
      ]);

      const currentYear = new Date().getFullYear();
      
      return {
        opened: opened.data.filter(pr => 
          new Date(pr.created_at).getFullYear() === currentYear
        ).length,
        closed: closed.data.filter(pr => 
          new Date(pr.closed_at).getFullYear() === currentYear
        ).length
      };
    } catch (error) {
      return { opened: 0, closed: 0 };
    }
  }

  async getMembers(orgName) {
    const { data: members } = await this.client.rest.orgs.listMembers({
      org: orgName,
      per_page: 100
    });
    return members;
  }

  async getContributors(owner, repo) {
    try {
      const { data: contributors } = await this.client.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100
      });
      return contributors;
    } catch (error) {
      return [];
    }
  }
}
