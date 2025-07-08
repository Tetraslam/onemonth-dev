import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { CurriculumCreationForm } from '@/components/CurriculumCreationForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PaywallGate } from '@/components/PaywallGate'
import { Navbar } from '@/components/Navbar'

export default function NewCurriculumPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/auth')
      }
    }
    checkAuth()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center p-6">
        <div className="w-full max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="mb-4 font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-black mb-6 text-center">Create a New Curriculum</h1>
          <PaywallGate feature="curriculum creation">
            <CurriculumCreationForm />
          </PaywallGate>
        </div>
      </div>
    </div>
  )
} 