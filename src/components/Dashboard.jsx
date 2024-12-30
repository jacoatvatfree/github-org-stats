import { useEffect, useState } from 'react'
import { GithubRepository } from '../infrastructure/github-repository'
import { Organization } from '../domain/organization'
import {
  StarIcon,
  UsersIcon,
  ChartBarIcon,
  CodeBracketIcon,
  CircleStackIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function Dashboard({ credentials }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const repo = new GithubRepository(credentials.token)
        const orgData = await repo.getOrganization(credentials.organization)
        const organization = new Organization(
          credentials.organization,
          orgData.repos,
          orgData.members,
          orgData.yearlyStats
        )
        
        setData({
          totalStars: organization.getTotalStars(),
          topRepos: organization.getMostPopularRepos(),
          topContributors: organization.getMostActiveContributors(),
          memberCount: organization.members.length,
          yearlyStats: organization.getYearlyStats()
        })
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [credentials])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {credentials.organization} Overview
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Stars"
          value={data.totalStars}
          icon={StarIcon}
        />
        <StatCard
          title="Members"
          value={data.memberCount}
          icon={UsersIcon}
        />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {currentYear} Statistics
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <StarIcon className="h-5 w-5 mr-2" />
            Top Repositories
          </h2>
          <div className="space-y-4">
            {data.topRepos.map((repo) => (
              <div key={repo.name} className="flex justify-between items-center">
                <span className="text-gray-900">{repo.name}</span>
                <span className="flex items-center text-gray-600">
                  <StarIcon className="h-4 w-4 mr-1" />
                  {repo.stars}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Top Contributors
          </h2>
          <div className="space-y-4">
            {data.topContributors.map((contributor) => (
              <div key={contributor.login} className="flex justify-between items-center">
                <span className="text-gray-900">{contributor.login}</span>
                <span className="text-gray-600">
                  {contributor.contributions} contributions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-gray-600">{title}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}
