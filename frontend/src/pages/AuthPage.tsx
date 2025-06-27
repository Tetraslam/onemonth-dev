import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'

export function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black mb-2 text-foreground">onemonth.dev</h1>
          <p className="text-foreground/80 font-bold">Master any subject in 30 days.</p>
        </div>
        
        <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow-lg">
          <div className="bg-primary rounded-md p-4 mb-6 border-2 border-foreground neo-brutal-shadow-sm">
            <h2 className="font-black text-xl text-primary-foreground">Welcome Back</h2>
            <p className="text-sm mt-1 text-primary-foreground/80">Sign in to your account</p>
          </div>
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: {
                  backgroundColor: 'hsl(45 100% 51%)',
                  color: '#000',
                  borderRadius: '0.5rem',
                  fontWeight: 'bold',
                  border: '2px solid rgb(0 0 0 / 0.15)',
                  boxShadow: '4px 4px 0 0 rgb(0 0 0 / 0.9)',
                },
                anchor: {
                  color: 'hsl(251 91% 67%)',
                  fontWeight: 'bold',
                },
                input: {
                  backgroundColor: '#fff',
                  borderColor: 'rgb(0 0 0 / 0.15)',
                  borderWidth: '2px',
                  borderRadius: '0.5rem',
                  color: 'rgb(0 0 0 / 0.85)',
                  fontWeight: '500',
                },
                label: {
                  color: 'rgb(0 0 0 / 0.85)',
                  fontWeight: 'bold',
                },
                message: {
                  color: '#ef4444',
                  fontWeight: 'bold',
                },
              },
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(45 100% 51%)',
                    brandAccent: 'hsl(45 100% 45%)',
                  },
                },
              },
            }}
            providers={[]}
            theme="light"
          />
        </div>
      </div>
      
      {/* Decorative shapes with gradient backgrounds */}
      <div className="fixed top-10 left-10 w-32 h-32 neo-gradient-blue rounded-full border-4 border-foreground neo-brutal-shadow-lg" />
      <div className="fixed bottom-10 right-10 w-24 h-24 neo-gradient-pink rotate-45 border-4 border-foreground neo-brutal-shadow-lg" />
    </div>
  )
} 