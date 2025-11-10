/**
 * API Route: /api/profiles/[id]
 * Handles read, update, and delete operations for a specific profile
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// GET /api/profiles/[id] - Get a specific profile
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

    // Fetch profile (RLS will enforce user_id match)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found', message: 'Profile not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in GET /api/profiles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/profiles/[id] - Update a profile
export async function PUT(
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

    // Parse request body
    const body = await request.json()
    const { name, description, criteria } = body

    // Build update object
    const updates: ProfileUpdate = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Validation error', message: 'Profile name cannot be empty' },
          { status: 400 }
        )
      }

      // Check for duplicate name (excluding current profile)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name.trim())
        .neq('id', params.id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Duplicate', message: 'A profile with this name already exists' },
          { status: 409 }
        )
      }

      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    if (criteria !== undefined) {
      if (!Array.isArray(criteria)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Criteria must be an array' },
          { status: 400 }
        )
      }
      updates.criteria = criteria
    }

    // Update profile (RLS will enforce user_id match)
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found', message: 'Profile not found or access denied' },
          { status: 404 }
        )
      }
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/profiles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/profiles/[id] - Delete a profile
export async function DELETE(
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

    // Delete profile (RLS will enforce user_id match, CASCADE will delete resumes)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting profile:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Profile deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/profiles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
