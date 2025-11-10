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

  // Use NEXT_PUBLIC_SITE_URL if available, otherwise fall back to request origin
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin

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
