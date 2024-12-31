import { GitHubApiClient } from './github/api-client';
import { CacheManager } from './github/cache-manager';
import { StatsCalculator } from './github/stats-calculator';

export class GithubRepository {
  constructor(token) {
    this.api = new GitHubApiClient(token);
    this.cache = new CacheManager();
  }

  async getOrganization(orgName, onProgress) {
    // Try to get data from cache first
    const cachedData = this.cache.get(orgName);
    if (cachedData) {
      return cachedData;
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01T00:00:00Z`;

    // Get all data in parallel
    const [members, allRepos] = await Promise.all([
      this.api.getMembers(orgName),
      this.api.getRepos(orgName),
    ]);

    // Filter non-forked repos
    const ownRepos = allRepos.filter((repo) => !repo.fork);

    let processed = 0;
    const totalRepos = ownRepos.length;

    // Get stats for all repos in parallel
    const repoStats = await Promise.all(
      ownRepos.map(async (repo) => {
        try {
          const [contributorStats, issues, pullRequests] = await Promise.all([
            this.api.getContributorStats(orgName, repo.name),
            this.api.getIssues(orgName, repo.name, startOfYear),
            this.api.getPullRequests(orgName, repo.name),
          ]);

          // Filter issues (exclude PRs)
          const filteredIssues = issues.filter((item) => !item.pull_request);
          const yearlyIssues = filteredIssues.filter(
            (item) => new Date(item.created_at).getFullYear() === currentYear
          );

          const yearlyPRs = pullRequests.filter(
            (item) => new Date(item.created_at).getFullYear() === currentYear,
          );

          processed++;
          if (onProgress) {
            onProgress(processed, totalRepos);
          }

          return {
            name: repo.name,
            stars: repo.stargazers_count,
            contributorStats,
            issues: {
              opened: yearlyIssues.length,
              closed: yearlyIssues.filter((item) => item.state === "closed").length,
              monthlyStats: StatsCalculator.calculateMonthlyIssueStats(filteredIssues, currentYear)
            },
            pullRequests: {
              opened: yearlyPRs.length,
              closed: yearlyPRs.filter((pr) => pr.state === "closed").length,
              types: StatsCalculator.categorizePRTypes(yearlyPRs),
            },
            createdAt: repo.created_at,
            archivedAt: repo.archived_at,
          };
        } catch (error) {
          console.warn(`Failed to get stats for ${repo.name}:`, error);
          processed++;
          if (onProgress) {
            onProgress(processed, totalRepos);
          }
          return null;
        }
      }),
    ).then((results) => results.filter(Boolean));

    // Calculate member contributions
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
      yearlyStats: StatsCalculator.calculateYearlyStats(repoStats, currentYear),
      monthlyIssueStats: repoStats.reduce((acc, repo) => {
        if (!repo.issues.monthlyStats) return acc;
        
        repo.issues.monthlyStats.forEach((month, index) => {
          if (!acc[index]) {
            acc[index] = { opened: 0, closed: 0, total: 0 };
          }
          acc[index].opened += month.opened;
          acc[index].closed += month.closed;
          acc[index].total += month.total;
        });
        return acc;
      }, Array(12).fill().map(() => ({ opened: 0, closed: 0, total: 0 })))
    };

    // Save the fresh data to cache
    this.cache.save(orgName, result);

    return result;
  
  }
}
