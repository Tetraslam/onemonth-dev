import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UTM tracking utilities
export function addUTMParams(url: string, params: {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
}) {
  const urlObj = new URL(url, window.location.origin)
  
  if (params.source) urlObj.searchParams.set('utm_source', params.source)
  if (params.medium) urlObj.searchParams.set('utm_medium', params.medium)
  if (params.campaign) urlObj.searchParams.set('utm_campaign', params.campaign)
  if (params.content) urlObj.searchParams.set('utm_content', params.content)
  if (params.term) urlObj.searchParams.set('utm_term', params.term)
  
  return urlObj.toString()
}

// Track internal navigation with custom parameters
export function trackInternalNavigation(from: string, to: string, action?: string) {
  const params = new URLSearchParams(window.location.search)
  
  // Preserve existing UTM params
  const utmParams: Record<string, string> = {}
  params.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value
    }
  })
  
  // Add internal tracking
  if (action) {
    params.set('ref_action', action)
  }
  params.set('ref_from', from)
  
  return `${to}${params.toString() ? '?' + params.toString() : ''}`
}

// Add UTM params to email URLs
export function addEmailUTMParams(url: string, emailType: string, additionalParams?: Record<string, string>) {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set('utm_source', 'email')
    urlObj.searchParams.set('utm_medium', 'transactional')
    urlObj.searchParams.set('utm_campaign', emailType)
    
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value)
      })
    }
    
    return urlObj.toString()
  } catch (e) {
    // If URL parsing fails, just append params
    const params = new URLSearchParams({
      utm_source: 'email',
      utm_medium: 'transactional',
      utm_campaign: emailType,
      ...additionalParams
    })
    return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`
  }
}

// Conversion tracking for DataFast
export function trackConversion(conversionType: 'signup' | 'subscription' | 'curriculum_created' | 'first_day_completed') {
  // Use DataFast's goal tracking method (client-side)
  // Goal names follow DataFast rules: lowercase, max 32 chars, spaces converted to underscores
  if (typeof (window as any).datafast !== 'undefined') {
    (window as any).datafast(conversionType)
  }
}

// Track custom goals with DataFast
export function trackGoal(goalName: string) {
  // Ensure goal name follows DataFast rules
  const formattedGoalName = goalName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .substring(0, 32)
  
  if (typeof (window as any).datafast !== 'undefined') {
    (window as any).datafast(formattedGoalName)
  }
}

// Track funnel steps
export function trackFunnelStep(step: 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'curriculum_creation' | 'learning') {
  // Just track as a goal, don't modify URL
  trackGoal(`funnel_${step}`)
}

// Referral tracking
export function generateReferralLink(userId: string, source?: string) {
  const baseUrl = window.location.origin
  const params = new URLSearchParams({
    ref: userId,
    utm_source: 'referral',
    utm_medium: source || 'direct',
    utm_campaign: 'user-referral'
  })
  
  return `${baseUrl}?${params.toString()}`
}

// Track referral on landing
export function trackReferral() {
  const params = new URLSearchParams(window.location.search)
  const referrer = params.get('ref')
  
  if (referrer) {
    // Store referrer in localStorage for attribution
    localStorage.setItem('referrer_id', referrer)
    
    // Track referral as a goal
    trackGoal('referral_visit')
  }
}

// Get referrer for attribution during signup
export function getReferrer(): string | null {
  return localStorage.getItem('referrer_id')
}

// Clear referrer after successful attribution
export function clearReferrer() {
  localStorage.removeItem('referrer_id')
} 