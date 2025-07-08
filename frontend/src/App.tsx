import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import DashboardPage from '@/pages/DashboardPage'
import CurriculumPage from '@/pages/CurriculumPage'
import { LogbookPage } from '@/pages/LogbookPage'
import NewCurriculumPage from '@/pages/NewCurriculumPage'
import OnboardingPage from '@/pages/OnboardingPage'
import PaymentSuccessPage from '@/pages/PaymentSuccessPage'
import SubscribeDialog from '@/components/SubscribeDialog'
import { useSubscribeModal } from '@/stores/useSubscribeModal'
import { ProtectedRoute } from '@/components/ProtectedRoute'


function App() {
  const { isOpen, close } = useSubscribeModal()

  return (
    <Router>
      <Toaster position="top-right" />
      <SubscribeDialog open={isOpen} onClose={close} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/curriculum/new" element={
          <ProtectedRoute>
            <NewCurriculumPage />
          </ProtectedRoute>
        } />
        <Route path="/curriculum/:id" element={
          <ProtectedRoute>
            <CurriculumPage />
          </ProtectedRoute>
        } />
        <Route path="/logbook" element={
          <ProtectedRoute>
            <LogbookPage />
          </ProtectedRoute>
        } />
        <Route path="/payment-success" element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App
