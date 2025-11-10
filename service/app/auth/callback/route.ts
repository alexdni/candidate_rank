/**
 * OAuth Callback Route
 * Handles redirects from OAuth providers (Google, Apple)
 * Exchanges authorization code for session
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Determine redirect URL - always use production URL if on production domain
  let origin = requestUrl.origin
  const hostname = requestUrl.hostname

  if (hostname === 'candidaterank.vercel.app' || hostname.endsWith('.vercel.app')) {
    origin = 'https://candidaterank.vercel.app'
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    origin = process.env.NEXT_PUBLIC_SITE_URL
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      // Redirect to home with error parameter
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`)
    }
  }

  // Redirect to home page
  return NextResponse.redirect(origin)
}
