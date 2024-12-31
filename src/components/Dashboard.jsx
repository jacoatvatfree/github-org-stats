import { useState, useEffect } from "react";
import { GithubRepository } from "../infrastructure/github-repository";
import { Organization } from "../domain/organization";
import {
  StarIcon,
  UsersIcon,
  ChartBarIcon,
  CodeBracketIcon,
  CircleStackIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import BurnupChart from "./BurnupChart";
import PullRequestTypeChart from "./PullRequestTypeChart";

export default function Dashboard({ credentials }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const repo = new GithubRepository(credentials.token);
        setLoadingMessage("Fetching organization data...");

        const orgData = await repo.getOrganization(
          credentials.organization,
          {
            fromDate: credentials.fromDate,
            toDate: credentials.toDate
          },
          (current, total) => {
            setProgress({ current, total });
            setLoadingMessage(
              `Processing repositories (${current}/${total})...`,
            );
          },
        );

        const organization = new Organization(
          credentials.organization,
          orgData.repos,
          orgData.members,
          orgData.yearlyStats,
        );

        setData({
          totalStars: organization.getTotalStars(),
          topReposByStars: organization.getMostPopularRepos(),
          topReposByCommits: organization.getMostActiveRepos(),
          topMembers: organization
            .getMostActiveMembers()
            .filter((x) => x.contributions > 0),
          memberCount: organization.members.length,
          yearlyStats: organization.getYearlyStats(),
          prTypeStats: organization.getPullRequestTypeStats(),
          monthlyIssueStats: orgData.monthlyIssueStats,
        });
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [credentials]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <div className="text-gray-600 text-lg">{loadingMessage}</div>
        {progress.total > 0 && (
          <div className="mt-4 w-64">
            <div className="bg-primary-100 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-500">
          {credentials.organization} overview
        </h1>
        <div className="text-sm text-gray-600">
          {new Date(credentials.fromDate).toLocaleDateString()} - {new Date(credentials.toDate).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <StatCard
            title="Total Stars"
            value={data.totalStars}
            icon={StarIcon}
          />
          <StatCard title="Members" value={data.memberCount} icon={UsersIcon} />
        </div>
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-secondary-50 p-6 rounded-xl shadow-sm hover:shadow-gb transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-primary-500">
            <ChatBubbleBottomCenterTextIcon className="h-5 w-5 mr-2" />
            Issues Burn Up
          </h2>
          <BurnupChart monthlyStats={data.monthlyIssueStats} fromDate={credentials.fromDate} toDate={credentials.toDate} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-secondary-500 mb-6">
        Statistics
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Repositories"
          value={`+${data.yearlyStats.repositories.created} / -${data.yearlyStats.repositories.archived}`}
          subtitle="Created / Archived"
          icon={CircleStackIcon}
        />
        <StatCard
          title="Total Commits"
          value={data.yearlyStats.commits}
          icon={CodeBracketIcon}
        />
        <StatCard
          title="Issues"
          value={`${data.yearlyStats.issues.opened} / ${data.yearlyStats.issues.closed}`}
          subtitle="Opened / Closed"
          icon={ChatBubbleBottomCenterTextIcon}
        />
        <StatCard
          title="Pull Requests"
          value={`${data.yearlyStats.pullRequests.opened} / ${data.yearlyStats.pullRequests.closed}`}
          subtitle="Opened / Closed"
          icon={ArrowsRightLeftIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-secondary-50 p-6 rounded-xl shadow-sm hover:shadow-gb transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-primary-500">
            <CodeBracketIcon className="h-5 w-5 mr-2" />
            Top Repositories
          </h2>
          <div className="space-y-4">
            {data.topReposByCommits.map((repo) => (
              <div
                key={repo.name}
                className="flex justify-between items-center hover:bg-white/50 p-2 rounded-lg transition-colors"
              >
                <span className="text-gray-900">{repo.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-gray-600">
                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 mr-1" />
                    {repo.closedIssues}
                  </span>
                  <span className="flex items-center text-gray-600">
                    <CodeBracketIcon className="h-4 w-4 mr-1" />
                    {repo.commitCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-secondary-50 p-6 rounded-xl shadow-sm hover:shadow-gb transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-primary-500">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Top Organization Members
          </h2>
          <div className="space-y-4">
            {data.topMembers.map((member) => (
              <div
                key={member.login}
                className="flex justify-between items-center hover:bg-white/50 p-2 rounded-lg transition-colors"
              >
                <span className="text-gray-900">{member.login}</span>
                <span className="text-gray-600">
                  {member.contributions} contributions
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-secondary-50 p-6 rounded-xl shadow-sm hover:shadow-gb transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-primary-500">
            <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
            Pull Requests by Type
          </h2>
          <PullRequestTypeChart prTypeStats={data.prTypeStats} />
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => setShowJson(!showJson)}
          className="mb-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-white transition-colors print:hidden"
        >
          {showJson ? "Hide" : "Show"} JSON Data
        </button>

        {showJson && (
          <pre className="bg-gradient-to-br from-white to-primary-50 p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-gradient-to-br from-white to-secondary-50 p-6 rounded-xl shadow-sm hover:shadow-gb transition-shadow">
      <div className="flex items-center">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Icon className="h-6 w-6 text-primary-500" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-gray-600">{title}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
