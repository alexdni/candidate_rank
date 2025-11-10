-- Migration 003: Add verification columns to resumes table
-- This migration adds support for storing LinkedIn/GitHub URLs and verification results

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS verification_result JSONB,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS resumes_verified_at_idx ON resumes(verified_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN resumes.linkedin_url IS 'LinkedIn profile URL extracted from resume';
COMMENT ON COLUMN resumes.github_url IS 'GitHub profile URL extracted from resume';
COMMENT ON COLUMN resumes.verification_result IS 'JSONB object containing verification details (scores, matched data, errors)';
COMMENT ON COLUMN resumes.verified_at IS 'Timestamp of when profile verification was last performed';
