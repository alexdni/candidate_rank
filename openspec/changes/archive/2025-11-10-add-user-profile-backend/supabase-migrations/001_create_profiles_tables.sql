-- Migration 001: Create profiles and resumes tables
-- This migration sets up the core database schema for user job profiles and resume metadata

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: Each user can only have one profile with a given name
  CONSTRAINT profiles_user_id_name_unique UNIQUE (user_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles(updated_at DESC);

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  blob_url TEXT NOT NULL,
  analysis_result JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: Prevent duplicate resume entries per profile
  CONSTRAINT resumes_profile_blob_unique UNIQUE (profile_id, blob_url)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS resumes_profile_id_idx ON resumes(profile_id);
CREATE INDEX IF NOT EXISTS resumes_uploaded_at_idx ON resumes(uploaded_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'User-created job profiles with associated screening criteria';
COMMENT ON COLUMN profiles.user_id IS 'References auth.users - owner of this profile';
COMMENT ON COLUMN profiles.criteria IS 'JSONB array of screening criteria (matches Criterion[] TypeScript type)';

COMMENT ON TABLE resumes IS 'Resume metadata and analysis results associated with job profiles';
COMMENT ON COLUMN resumes.blob_url IS 'URL to PDF file in Vercel Blob storage';
COMMENT ON COLUMN resumes.analysis_result IS 'JSONB object containing AI analysis output (criteria matches, summary, etc.)';
