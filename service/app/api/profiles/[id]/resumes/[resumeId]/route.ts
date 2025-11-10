/**
 * API Route: /api/profiles/[id]/resumes/[resumeId]
 * Handles operations on a specific resume within a profile
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/profiles/[id]/resumes/[resumeId] - Delete a resume from profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; resumeId: string } }
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

    // Verify profile belongs to user (RLS will also enforce this)
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

    // Delete resume (RLS ensures only resumes in user's profiles can be deleted)
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', params.resumeId)
      .eq('profile_id', params.id)

    if (error) {
      console.error('Error deleting resume:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    // Note: We do NOT delete the PDF from Vercel Blob storage
    // Blob URLs become orphaned but this is intentional (see design.md)

    return NextResponse.json({ message: 'Resume deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/profiles/[id]/resumes/[resumeId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
