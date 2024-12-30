export class Organization {
  constructor(name, repos, members, yearlyStats) {
    this.name = name;
    this.repos = repos;
    this.members = members;
    this.yearlyStats = yearlyStats;
  }

  getTotalStars() {
    return this.repos.reduce((sum, repo) => sum + repo.stars, 0);
  }

  getMostPopularRepos(limit = 5) {
    return [...this.repos]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, limit)
      .map(({ name, stars }) => ({ name, stars }));
  }

  getMostActiveRepos(limit = 5) {
    return [...this.repos]
      .filter((repo) => !repo.fork)
      .sort((a, b) => (b.commitCount || 0) - (a.commitCount || 0))
      .slice(0, limit)
      .map(({ name, commitCount }) => ({
        name,
        commitCount: commitCount || 0,
      }));
  }

  getMostActiveMembers(limit = 5) {
    return [...this.members]
      .sort((a, b) => (b.contributions || 0) - (a.contributions || 0))
      .slice(0, limit)
      .map(({ login, contributions }) => ({
        login,
        contributions: contributions || 0,
      }));
  }

  getPullRequestTypeStats() {
    const typeStats = {};

    if (this.yearlyStats.pullRequests.types) {
      Object.entries(this.yearlyStats.pullRequests.types)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          typeStats[type] = count;
        });
    }

    return typeStats;
  }

  getYearlyStats() {
    return this.yearlyStats;
  }
}
