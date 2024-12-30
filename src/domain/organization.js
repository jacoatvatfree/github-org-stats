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
      .slice(0, limit);
  }

  getMostActiveContributors(limit = 5) {
    const contributorStats = new Map();
    
    this.repos.forEach(repo => {
      repo.contributors.forEach(contributor => {
        const current = contributorStats.get(contributor.login) || 0;
        contributorStats.set(contributor.login, current + contributor.contributions);
      });
    });

    return Array.from(contributorStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([login, contributions]) => ({ login, contributions }));
  }

  getYearlyStats() {
    return this.yearlyStats;
  }
}
