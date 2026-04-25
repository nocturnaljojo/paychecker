import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <Link to="/" className="text-pc-caption text-pc-text-muted">
        ← Home
      </Link>
      <h1 className="text-pc-h1 font-semibold mt-4">Dashboard</h1>
      <p className="text-pc-body mt-2">
        Worker dashboard — shifts, payslips, comparisons.
      </p>
      <p className="text-pc-caption text-pc-text-muted mt-1">
        Placeholder — features/ folders fill this in over Phase 0.
      </p>
    </main>
  )
}

export default Dashboard
