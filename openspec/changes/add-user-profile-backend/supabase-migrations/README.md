# Supabase Database Migrations

This directory contains SQL migration scripts for setting up the user profile backend infrastructure in Supabase.

## Prerequisites

Before running these migrations, ensure you have:

1. Created a Supabase project at https://supabase.com
2. Obtained your project credentials:
   - Project URL (already in `.env` as `NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/Public key (already in `.env` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role key (needed for admin operations - add as `SUPABASE_SERVICE_ROLE_KEY`)

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `001_create_profiles_tables.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Verify success (should see "Success. No rows returned")
7. Repeat steps 3-6 for `002_enable_rls.sql`

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Or run individual migration files
psql <your-database-url> -f 001_create_profiles_tables.sql
psql <your-database-url> -f 002_enable_rls.sql
```

### Option 3: Direct psql Connection

If you have PostgreSQL client installed:

```bash
# Get connection string from Supabase dashboard (Settings > Database)
# Connection string format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

psql "<your-connection-string>" -f 001_create_profiles_tables.sql
psql "<your-connection-string>" -f 002_enable_rls.sql
```

## Migration Files

### `001_create_profiles_tables.sql`

Creates the core database schema:

- **`profiles` table**: Stores job profile metadata (name, description, criteria)
- **`resumes` table**: Stores resume metadata and analysis results
- **Indexes**: Optimizes queries by `user_id`, `profile_id`, and timestamps
- **Triggers**: Auto-updates `updated_at` timestamp on profile modifications

**Key features:**
- UUID primary keys for security and distributed systems
- Foreign key constraints with CASCADE delete (deleting a profile removes all associated resumes)
- JSONB columns for flexible criteria and analysis storage
- Unique constraints to prevent duplicate profile names per user

### `002_enable_rls.sql`

Enables Row Level Security and creates access policies:

- **RLS Policies**: Ensures users can only access their own profiles and resumes
- **Database-level security**: Protection even if API layer is bypassed
- **Policy types**: SELECT, INSERT, UPDATE, DELETE for both tables

**Security guarantees:**
- Users cannot view other users' profiles or resumes
- Users cannot modify or delete other users' data
- Unauthenticated requests return no data
- Policies use `auth.uid()` which is set by Supabase Auth

## Verification

After running migrations, verify the setup:

### 1. Check Tables Exist

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'resumes');
```

Expected output: 2 rows (`profiles`, `resumes`)

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'resumes');
```

Expected output: Both tables should have `rowsecurity = true`

### 3. Check Policies Exist

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('profiles', 'resumes');
```

Expected output: 8 policies total (4 for profiles, 4 for resumes)

### 4. Test Data Isolation

Create a test user in Supabase Auth dashboard, then run:

```sql
-- This should return 0 rows if no profiles created yet
SELECT * FROM profiles;

-- Insert a test profile
INSERT INTO profiles (user_id, name, description, criteria)
VALUES (auth.uid(), 'Test Profile', 'Testing RLS', '[{"id":"c1","name":"Test","description":"Test criterion","keywords":[]}]');

-- This should now return 1 row
SELECT * FROM profiles;
```

## Rollback

If you need to undo these migrations:

```sql
-- Drop policies (run first to avoid dependency issues)
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view resumes in own profiles" ON resumes;
DROP POLICY IF EXISTS "Users can insert resumes in own profiles" ON resumes;
DROP POLICY IF EXISTS "Users can update resumes in own profiles" ON resumes;
DROP POLICY IF EXISTS "Users can delete resumes in own profiles" ON resumes;

-- Drop tables (CASCADE removes all related objects)
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

## Troubleshooting

### Issue: "permission denied for schema public"

**Solution**: Ensure you're running migrations with sufficient privileges. Use the Service Role key or Database Password from Supabase dashboard.

### Issue: "relation already exists"

**Solution**: Migrations are idempotent (use `IF NOT EXISTS` and `DROP IF EXISTS`). You can safely re-run them. If you need a clean slate, run the rollback script first.

### Issue: Policies not enforcing correctly

**Solution**:
1. Verify RLS is enabled: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
2. Check that Supabase Auth is configured correctly in your application
3. Verify `auth.uid()` is returning a valid UUID (test in SQL Editor while authenticated)

### Issue: Performance degradation

**Solution**:
1. Check that indexes exist: `\d profiles` and `\d resumes` in psql
2. Run `EXPLAIN ANALYZE` on slow queries to identify missing indexes
3. Consider adding composite indexes if query patterns change

## Next Steps

After running migrations:

1. Configure OAuth providers in Supabase dashboard (Google, Apple)
2. Update `.env` with `SUPABASE_SERVICE_ROLE_KEY`
3. Implement API routes as outlined in [tasks.md](../tasks.md)
4. Test authentication flow end-to-end
5. Monitor database performance via Supabase dashboard

## Support

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Migration Best Practices**: https://supabase.com/docs/guides/database/migrations
