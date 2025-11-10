-- Migration 002: Enable Row Level Security policies
-- This migration implements database-level access control to ensure users can only access their own data

-- Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Policy: Users can view their own profiles
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profiles
DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;
CREATE POLICY "Users can insert own profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profiles
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
CREATE POLICY "Users can update own profiles"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own profiles
DROP POLICY IF EXISTS "Users can delete own profiles" ON profiles;
CREATE POLICY "Users can delete own profiles"
  ON profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESUMES TABLE POLICIES
-- ============================================================================

-- Policy: Users can view resumes in their own profiles
DROP POLICY IF EXISTS "Users can view resumes in own profiles" ON resumes;
CREATE POLICY "Users can view resumes in own profiles"
  ON resumes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Policy: Users can insert resumes in their own profiles
DROP POLICY IF EXISTS "Users can insert resumes in own profiles" ON resumes;
CREATE POLICY "Users can insert resumes in own profiles"
  ON resumes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Policy: Users can update resumes in their own profiles
DROP POLICY IF EXISTS "Users can update resumes in own profiles" ON resumes;
CREATE POLICY "Users can update resumes in own profiles"
  ON resumes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Policy: Users can delete resumes in their own profiles
DROP POLICY IF EXISTS "Users can delete resumes in own profiles" ON resumes;
CREATE POLICY "Users can delete resumes in own profiles"
  ON resumes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES (for testing - not executed automatically)
-- ============================================================================

-- To verify RLS is working correctly, run these queries as different users:

-- 1. As authenticated user, should only see own profiles:
-- SELECT * FROM profiles;

-- 2. As authenticated user, should only see resumes in own profiles:
-- SELECT * FROM resumes;

-- 3. Attempt to insert profile with different user_id (should fail):
-- INSERT INTO profiles (user_id, name, description, criteria)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'Test', '[]');
-- Expected: Should return 0 rows (policy prevents insertion)

-- 4. Attempt to view another user's profile by ID (should return empty):
-- SELECT * FROM profiles WHERE id = '<other-users-profile-id>';
-- Expected: Should return 0 rows (policy filters out)
