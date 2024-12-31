export class StatsCalculator {
  static calculateMonthlyIssueStats(issues, year) {
    const monthlyStats = Array(12).fill().map(() => ({
      opened: 0,
      closed: 0,
      total: 0  // Track running total of open issues
    }));

    // Sort issues by date to calculate running totals
    const sortedIssues = [...issues]
      .filter(issue => !issue.pull_request) // Exclude PRs
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let runningTotal = 0;

    sortedIssues.forEach(issue => {
      const createdDate = new Date(issue.created_at);
      const closedDate = issue.closed_at ? new Date(issue.closed_at) : null;
      
      // Only process issues from this year or before
      if (createdDate.getFullYear() <= year) {
        // If created this year, increment opened count
        if (createdDate.getFullYear() === year) {
          const month = createdDate.getMonth();
          monthlyStats[month].opened++;
          runningTotal++;
        } else {
          // If created before this year, just add to running total
          runningTotal++;
        }

        // If closed this year, increment closed count
        if (closedDate && closedDate.getFullYear() === year) {
          const month = closedDate.getMonth();
          monthlyStats[month].closed++;
          runningTotal--;
        }

        // Update running total for the month
        if (createdDate.getFullYear() === year) {
          const month = createdDate.getMonth();
          for (let i = month; i < 12; i++) {
            monthlyStats[i].total = runningTotal;
          }
        }
      }
    });

    return monthlyStats;
  }

  static categorizePRTypes(prs) {
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
        types["unknown"] = (types["unknown"] || 0) + 1;
      }
    });

    return types;
  }

  static calculateYearlyStats(repoStats, currentYear) {
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
}
