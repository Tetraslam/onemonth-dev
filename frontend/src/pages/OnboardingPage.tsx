import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CurriculumCreationForm } from '@/components/CurriculumCreationForm'
import { Button } from '@/components/ui/button'

export default function OnboardingPage() {
  const navigate = useNavigate()

  // if user already has curricula, bounce to dashboard
  useEffect(() => {
    const checkCurricula = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/auth')
        return
      }
      const token = session.access_token
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const curricula = await res.json()
      if (curricula && curricula.length > 0) navigate('/dashboard')
    }
    checkCurricula()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-black mb-6 text-center">Let's craft your first curriculum</h1>
        <CurriculumCreationForm />
        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Skip for now</Button>
        </div>
      </div>
    </div>
  )
} 