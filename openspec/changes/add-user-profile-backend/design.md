# Design: User Profile Backend Architecture

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  - Authentication UI (Login/Signup/SSO buttons)                  │
│  - Profile selector dropdown                                     │
│  - Protected routes with auth checks                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client (Browser)                     │
│  - Session management                                            │
│  - Token refresh                                                 │
│  - SSO redirect handling                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                          │
│  - /api/auth/* - Callback handlers                               │
│  - /api/profiles/* - CRUD operations                             │
│  - /api/analyze - Enhanced with profile storage                  │
│  - Middleware: Auth verification on protected routes             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Backend                               │
│  ┌────────────────────┐  ┌─────────────────────────────────┐    │
│  │  Auth Service      │  │  PostgreSQL Database            │    │
│  │  - User identity   │  │  - profiles table               │    │
│  │  - SSO providers   │  │  - resumes table                │    │
│  │  - JWT tokens      │  │  - criteria table               │    │
│  └────────────────────┘  └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Vercel Blob        │
                   │  (PDF Storage)      │
                   └─────────────────────┘
```

## Database Schema

### Tables

#### `profiles`
Stores job profile metadata and associated screening criteria.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_user_id_name_unique UNIQUE (user_id, name)
);

CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_updated_at_idx ON profiles(updated_at DESC);
```

**Rationale**:
- `criteria` stored as JSONB for flexibility (matches frontend `Criterion[]` type)
- Unique constraint on `(user_id, name)` prevents duplicate profile names per user
- Cascade delete ensures orphaned profiles are cleaned up when user deletes account

#### `resumes`
Stores metadata about uploaded resumes associated with profiles.

```sql
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  blob_url TEXT NOT NULL,
  analysis_result JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT resumes_profile_blob_unique UNIQUE (profile_id, blob_url)
);

CREATE INDEX resumes_profile_id_idx ON resumes(profile_id);
CREATE INDEX resumes_uploaded_at_idx ON resumes(uploaded_at DESC);
```

**Rationale**:
- `blob_url` points to Vercel Blob storage (source of truth for PDF content)
- `analysis_result` stores the AI analysis output (JSONB) for faster retrieval
- Unique constraint prevents duplicate resume entries per profile
- Cascade delete ensures resumes are removed when profile is deleted

### Row Level Security (RLS)

Supabase RLS policies ensure users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/modify their own profiles
CREATE POLICY "Users can view own profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Resumes: Users can only access resumes in their profiles
CREATE POLICY "Users can view resumes in own profiles"
  ON resumes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert resumes in own profiles"
  ON resumes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update resumes in own profiles"
  ON resumes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete resumes in own profiles"
  ON resumes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = resumes.profile_id
      AND profiles.user_id = auth.uid()
    )
  );
```

## Authentication Flow

### SSO Flow (Google/Apple)

```
User clicks "Sign in with Google"
          │
          ▼
Frontend calls supabase.auth.signInWithOAuth({ provider: 'google' })
          │
          ▼
Supabase redirects to Google OAuth consent screen
          │
          ▼
User grants permission
          │
          ▼
Google redirects to /api/auth/callback
          │
          ▼
Supabase exchanges code for JWT
          │
          ▼
Frontend receives session with access_token
          │
          ▼
Session stored in localStorage + httpOnly cookie
```

### Email/Password Flow

```
User submits email + password
          │
          ▼
Frontend calls supabase.auth.signUp({ email, password })
          │
          ▼
Supabase sends confirmation email (optional)
          │
          ▼
User confirms email (or auto-confirmed if disabled)
          │
          ▼
Frontend calls supabase.auth.signInWithPassword({ email, password })
          │
          ▼
Supabase returns JWT access_token
          │
          ▼
Session stored, user authenticated
```

## API Route Protection

All profile-related and analysis routes require authentication:

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes
  const protectedPaths = ['/api/profiles', '/api/analyze']
  const isProtected = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  if (isProtected && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return res
}

export const config = {
  matcher: ['/api/profiles/:path*', '/api/analyze']
}
```

## Data Flow: Creating a Profile

```
Frontend: User creates profile "Senior React Native Developer"
          │
          ▼
POST /api/profiles
{
  name: "Senior React Native Developer",
  description: "Looking for 5+ years RN experience",
  criteria: [
    { id: "c1", name: "React Native", description: "5+ years", keywords: ["react native"] },
    { id: "c2", name: "TypeScript", description: "Strong typing", keywords: ["typescript"] }
  ]
}
          │
          ▼
API verifies JWT and extracts user_id
          │
          ▼
Insert into profiles table with user_id from JWT
          │
          ▼
Return created profile with generated UUID
          │
          ▼
Frontend updates UI with new profile
```

## Data Flow: Uploading Resumes to Profile

```
Frontend: User uploads PDF with profile selected
          │
          ▼
POST /api/upload (unchanged - returns blob_url)
          │
          ▼
POST /api/analyze
{
  filename: "john_doe.pdf",
  fileData: "base64...",
  criteria: [...],
  profileId: "uuid-of-selected-profile"  // NEW
}
          │
          ▼
API analyzes resume (existing logic)
          │
          ▼
API inserts into resumes table:
{
  profile_id: profileId,
  filename: filename,
  blob_url: blob_url,
  analysis_result: { criteria: {...}, summary: "..." }
}
          │
          ▼
Return analysis result to frontend
```

## Trade-offs and Decisions

### Why Supabase over Custom Auth?

**Chosen**: Supabase Auth
**Alternatives considered**: NextAuth.js, Auth0, Clerk

**Rationale**:
- Integrated with PostgreSQL (single backend service)
- Built-in SSO provider support (Google, Apple, GitHub, etc.)
- RLS policies enforce data security at database level
- Free tier sufficient for MVP
- Already configured in .env (NEXT_PUBLIC_SUPABASE_URL exists)

### Why JSONB for Criteria Storage?

**Chosen**: JSONB column in `profiles` table
**Alternatives considered**: Normalized `criteria` table with foreign keys

**Rationale**:
- Criteria structure is dynamic and user-defined (1-5 items, variable fields)
- No need to query individual criteria independently
- Simpler API responses (no joins required)
- Matches frontend TypeScript type (`Criterion[]`)
- PostgreSQL JSONB supports indexing if needed later

### Why Store Analysis Results?

**Chosen**: Store `analysis_result` JSONB in `resumes` table
**Alternatives considered**: Re-analyze on profile load

**Rationale**:
- Faster profile loading (no OpenAI API calls)
- Cost savings (avoid duplicate API charges)
- Historical record of analysis at upload time
- Criteria may change; original analysis preserved

### Why Vercel Blob + Supabase Database?

**Chosen**: Hybrid storage (Blob for PDFs, Supabase for metadata)
**Alternatives considered**: Supabase Storage for everything

**Rationale**:
- Vercel Blob already integrated and working
- Supabase Storage has different pricing model
- Separation of concerns: Blob for files, Postgres for structured data
- Migration path if needed (blob URLs are portable)

## Security Considerations

1. **JWT Validation**: All protected routes verify JWT signature and expiration
2. **RLS Policies**: Database-level access control prevents unauthorized data access
3. **No Client-Side Secrets**: Supabase anon key is public; RLS enforces security
4. **HTTPS Only**: Supabase requires HTTPS for production (enforced by Vercel)
5. **Token Refresh**: Supabase client auto-refreshes tokens before expiration
6. **SQL Injection**: Parameterized queries via Supabase client (no raw SQL from user input)

## Performance Considerations

1. **Indexes**: User-specific queries optimized with `user_id` indexes
2. **Connection Pooling**: Supabase provides pgBouncer pooler (already configured in .env)
3. **Caching**: Browser caches profile data; revalidate on profile switch
4. **Lazy Loading**: Resumes fetched only when profile selected (not on initial load)

## Migration Strategy

To maintain backward compatibility during rollout:

1. **Phase 1**: Add auth UI but keep anonymous mode available
2. **Phase 2**: Prompt users to create account to save profiles (optional)
3. **Phase 3**: After adoption, consider requiring auth for analysis (breaking change in future spec)

## Environment Variables

New required variables:

```bash
# Supabase (already exist in .env)
NEXT_PUBLIC_SUPABASE_URL=https://uvmilifdzzjilqtoydrh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=<to_be_provided_by_user>
```

## Testing Strategy

1. **Unit Tests**: API route handlers with mocked Supabase client
2. **Integration Tests**: Full auth flow with test user accounts
3. **E2E Tests**: Playwright scenarios for signup → create profile → upload resume
4. **Security Tests**: Attempt to access other users' profiles (should fail)
5. **Performance Tests**: Profile loading with 50+ resumes

## Future Extensions

This architecture enables:

- **Team Collaboration**: Add `organization_id` to profiles table
- **Role-Based Access**: Add `role` column and permission checks
- **Profile Templates**: Public `is_template` flag for sharing
- **Analytics**: Track profile usage, most common criteria
- **Email Notifications**: Integrate with Supabase Auth triggers
