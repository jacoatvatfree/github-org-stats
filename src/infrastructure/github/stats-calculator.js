export class StatsCalculator {
  static calculateMonthlyIssueStats(issues, fromDate, toDate) {
    const monthDiff = (toDate.getMonth() - fromDate.getMonth()) + 
                     (12 * (toDate.getFullYear() - fromDate.getFullYear())) + 1;
    
    const monthlyStats = Array(monthDiff).fill().map(() => ({
      opened: 0,
      closed: 0,
      total: 0
    }));

    const sortedIssues = [...issues]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let runningTotal = 0;

    sortedIssues.forEach(issue => {
      const createdDate = new Date(issue.created_at);
      const closedDate = issue.closed_at ? new Date(issue.closed_at) : null;
      
      if (createdDate >= fromDate && createdDate <= toDate) {
        const monthIndex = (createdDate.getMonth() - fromDate.getMonth()) + 
                         (12 * (createdDate.getFullYear() - fromDate.getFullYear()));
        monthlyStats[monthIndex].opened++;
        runningTotal++;
      }

      if (closedDate && closedDate >= fromDate && closedDate <= toDate) {
        const monthIndex = (closedDate.getMonth() - fromDate.getMonth()) + 
                         (12 * (closedDate.getFullYear() - fromDate.getFullYear()));
        monthlyStats[monthIndex].closed++;
        runningTotal--;
      }

      // Update running total for all months after this issue
      if (createdDate >= fromDate && createdDate <= toDate) {
        const monthIndex = (createdDate.getMonth() - fromDate.getMonth()) + 
                         (12 * (createdDate.getFullYear() - fromDate.getFullYear()));
        for (let i = monthIndex; i < monthlyStats.length; i++) {
          monthlyStats[i].total = runningTotal;
        }
      }
    });

    return monthlyStats;
  }

  static categorizePRTypes(prs) {
    const types = {};

    const closedPRs = prs.filter((pr) => pr.state === "closed");

    closedPRs.forEach((pr) => {
      if (pr.head?.ref) {
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

  static calculateYearlyStats(repoStats, fromDate, toDate) {
    return {
      repositories: {
        created: repoStats.filter(
          (repo) => {
            const createdAt = new Date(repo.createdAt);
            return createdAt >= fromDate && createdAt <= toDate;
          }
        ).length,
        archived: repoStats.filter(
          (repo) =>
            repo.archivedAt && 
            new Date(repo.archivedAt) >= fromDate && 
            new Date(repo.archivedAt) <= toDate
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
                  (week) => {
                    const weekDate = new Date(week.w * 1000);
                    return weekDate >= fromDate && weekDate <= toDate;
                  }
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
