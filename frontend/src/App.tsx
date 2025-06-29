import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import DashboardPage from '@/pages/DashboardPage'
import CurriculumPage from '@/pages/CurriculumPage'
import { LogbookPage } from '@/pages/LogbookPage'
import './App.css'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check viewport first
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If mobile, always show auth page (which has the mobile blocker)
  if (isMobile) {
    return (
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/dashboard" />} />
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <DashboardPage /> : <Navigate to="/auth" />} />
        <Route path="/curriculum/:id" element={session ? <CurriculumPage /> : <Navigate to="/auth" />} />
        <Route path="/logbook" element={session ? <LogbookPage /> : <Navigate to="/auth" />} />
      </Routes>
    </Router>
  )
}

export default App
