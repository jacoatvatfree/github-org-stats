import { useState } from 'react'
import toast from 'react-hot-toast'

export default function LoginForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    token: '',
    organization: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.token || !formData.organization) {
      toast.error('Please fill in all fields')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          GitHub Organization Analyzer
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              GitHub Token
            </label>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              value={formData.token}
              onChange={(e) => setFormData(prev => ({...prev, token: e.target.value}))}
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization Name
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              value={formData.organization}
              onChange={(e) => setFormData(prev => ({...prev, organization: e.target.value}))}
              placeholder="organization"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
          >
            Analyze Organization
          </button>
        </form>
      </div>
    </div>
  )
}
