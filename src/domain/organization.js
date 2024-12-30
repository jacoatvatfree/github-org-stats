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
    const memberStats = new Map();

    // Initialize all members with 0 contributions
    this.members.forEach((member) => {
      memberStats.set(member.login, 0);
    });

    // Sum up contributions for each member across all repos
    this.repos.forEach((repo) => {
      if (repo.contributors && Array.isArray(repo.contributors)) {
        repo.contributors.forEach((contributor) => {
          // Only count if they are a member
          if (memberStats.has(contributor.login)) {
            const current = memberStats.get(contributor.login);
            memberStats.set(
              contributor.login,
              current + contributor.contributions,
            );
          }
        });
      }
    });

    return Array.from(memberStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([login, contributions]) => ({ login, contributions }));
  }

  getYearlyStats() {
    return this.yearlyStats;
  }
}
