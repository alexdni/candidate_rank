/**
 * API Route: /api/profiles/[id]/resumes
 * Handles listing resumes for a profile and adding new resume metadata
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ResumeInsert = Database['public']['Tables']['resumes']['Insert']

// GET /api/profiles/[id]/resumes - List all resumes for a profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify profile belongs to user (RLS will handle this, but explicit check for better errors)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Not found', message: 'Profile not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch resumes for this profile, sorted by upload date (newest first)
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('profile_id', params.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching resumes:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ resumes }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in GET /api/profiles/[id]/resumes:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/profiles/[id]/resumes - Add resume metadata to profile
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify profile belongs to user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Not found', message: 'Profile not found or access denied' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { filename, blob_url, analysis_result } = body

    // Validation
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', message: 'Filename is required' },
        { status: 400 }
      )
    }

    if (!blob_url || typeof blob_url !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', message: 'Blob URL is required' },
        { status: 400 }
      )
    }

    // Create resume metadata
    const resumeData: ResumeInsert = {
      profile_id: params.id,
      filename,
      blob_url,
      analysis_result: analysis_result || null,
    }

    const { data: resume, error } = await supabase
      .from('resumes')
      .insert(resumeData)
      .select()
      .single()

    if (error) {
      // Handle duplicate blob_url for this profile
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate', message: 'This resume has already been added to this profile' },
          { status: 409 }
        )
      }
      console.error('Error creating resume:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ resume }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/profiles/[id]/resumes:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
