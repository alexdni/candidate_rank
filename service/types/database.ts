/**
 * Database types for Supabase tables
 */

import { Criterion } from '@/lib/resumeAnalyzer'

export interface Profile {
  id: string
  user_id: string
  name: string
  description: string | null
  criteria: Criterion[]
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  profile_id: string
  filename: string
  blob_url: string
  analysis_result: {
    criteria: Record<string, boolean>
    summary: string
    qualificationsCount?: number
  } | null
  linkedin_url?: string | null
  github_url?: string | null
  verification_result?: any | null
  verified_at?: string | null
  uploaded_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at'>>
      }
      resumes: {
        Row: Resume
        Insert: Omit<Resume, 'id' | 'uploaded_at'>
        Update: Partial<Omit<Resume, 'id' | 'profile_id' | 'uploaded_at'>>
      }
    }
  }
}
