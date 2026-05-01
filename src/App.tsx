import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import EmploymentContract from '@/pages/EmploymentContract'
import Upload from '@/pages/Upload'
import Cases from '@/pages/Cases'
import SignIn from '@/pages/SignIn'
import SignUp from '@/pages/SignUp'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import Debug from '@/pages/Debug'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

const isDev = import.meta.env.DEV

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in/*" element={<SignIn />} />
        <Route path="/sign-up/*" element={<SignUp />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buckets/employment-contract"
          element={
            <ProtectedRoute>
              <EmploymentContract />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <Cases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug"
          element={
            isDev ? (
              <ProtectedRoute>
                <Debug />
              </ProtectedRoute>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
