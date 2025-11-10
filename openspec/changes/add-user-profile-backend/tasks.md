# Implementation Tasks

## Overview

This task list provides a sequential implementation path for adding user authentication and job profile management. Tasks are ordered to deliver user-visible progress incrementally while maintaining a working application at each checkpoint.

## Prerequisites

Before starting implementation, ensure:
- [X] Supabase project is created and accessible
- [X] SUPABASE_SERVICE_ROLE_KEY is obtained and stored in .env
- [X] Google OAuth credentials are configured in Supabase dashboard
- [ ] Apple Sign In is configured in Supabase dashboard (if desired)

---

## Phase 1: Database Setup (Foundational)

### Task 1.1: Create Supabase database schema
**What**: Write and execute SQL migrations for `profiles` and `resumes` tables
**How**:
- Create SQL file `supabase/migrations/001_create_profiles_tables.sql`
- Define `profiles` table with columns: id, user_id, name, description, criteria, created_at, updated_at
- Define `resumes` table with columns: id, profile_id, filename, blob_url, analysis_result, uploaded_at
- Add indexes on user_id, profile_id, and timestamp columns
- Execute via Supabase dashboard or CLI

**Validation**: Run `SELECT * FROM profiles` in Supabase SQL editor - should return empty result set without errors

**Dependencies**: None

---

### Task 1.2: Enable Row Level Security policies
**What**: Configure RLS policies to enforce user data isolation
**How**:
- Create SQL file `supabase/migrations/002_enable_rls.sql`
- Enable RLS on both tables
- Add SELECT/INSERT/UPDATE/DELETE policies for profiles (filtered by `auth.uid() = user_id`)
- Add SELECT/INSERT/UPDATE/DELETE policies for resumes (joined through profiles table)
- Execute migration

**Validation**:
- Create test user in Supabase Auth
- Attempt to query `profiles` table with and without authentication
- Verify unauthenticated queries return no results

**Dependencies**: Task 1.1

---

## Phase 2: Authentication Backend (API Foundation)

### Task 2.1: Install Supabase client dependencies
**What**: Add Supabase libraries to Next.js project
**How**:
```bash
cd service
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Validation**: Check `package.json` contains new dependencies

**Dependencies**: None (can run in parallel with Phase 1)

---

### Task 2.2: Create Supabase client utilities
**What**: Set up reusable Supabase client instances for browser and server
**How**:
- Create `service/lib/supabaseClient.ts` with browser client (using public anon key)
- Create `service/lib/supabaseServer.ts` with server client (for API routes)
- Export typed client with `Database` type from schema

**Validation**: Import and instantiate client in a test file - should not throw errors

**Dependencies**: Task 2.1

---

### Task 2.3: Create authentication middleware
**What**: Protect API routes with JWT validation
**How**:
- Create `service/middleware.ts` at project root
- Use `createMiddlewareClient` from Supabase helpers
- Check session existence for paths matching `/api/profiles/*` and `/api/analyze`
- Return 401 if no valid session
- Allow request to proceed if authenticated

**Validation**:
- Start dev server
- Make request to `/api/profiles` without auth - should return 401
- (Full validation after frontend is built)

**Dependencies**: Task 2.2

---

### Task 2.4: Create profile CRUD API routes
**What**: Implement REST API for profile management
**How**:
- Create `service/pages/api/profiles/index.ts` for GET (list) and POST (create)
- Create `service/pages/api/profiles/[id].ts` for GET (read), PUT (update), DELETE (delete)
- Extract user_id from Supabase session in each handler
- Use Supabase client to query/insert/update/delete with RLS enforcement
- Return JSON responses with proper error handling

**Validation**: Use curl or Postman to test endpoints (with mock JWT) - verify CRUD operations work

**Dependencies**: Task 2.3

---

### Task 2.5: Create resume metadata API routes
**What**: Add endpoints for managing resumes within profiles
**How**:
- Create `service/pages/api/profiles/[id]/resumes.ts` for GET (list resumes) and POST (add resume)
- Create `service/pages/api/profiles/[id]/resumes/[resumeId].ts` for DELETE
- Integrate with existing upload and analysis logic
- Store analysis results in `analysis_result` JSONB column

**Validation**: Upload a resume and verify metadata is stored in database with correct profile association

**Dependencies**: Task 2.4

---

### Task 2.6: Update analysis endpoint to save to profile
**What**: Modify `/api/analyze` to optionally accept profileId and save results
**How**:
- Update `service/pages/api/analyze.ts` to accept `profileId` in request body
- If `profileId` is provided and user is authenticated, insert into `resumes` table
- Keep backward compatibility for anonymous usage (profileId optional)

**Validation**: Analyze resume with profileId - verify record appears in database

**Dependencies**: Task 2.5

---

## Phase 3: Authentication Frontend (User-Facing)

### Task 3.1: Create authentication UI components
**What**: Build login and signup forms with SSO buttons
**How**:
- Create `service/app/components/AuthModal.tsx` with tabs for Login/Signup
- Add email/password input fields with validation
- Add "Sign in with Google" and "Sign in with Apple" buttons
- Style with Tailwind CSS to match existing design
- Handle form submission and display errors

**Validation**: Render component in isolation - forms should display correctly

**Dependencies**: Task 2.2

---

### Task 3.2: Implement authentication context provider
**What**: Provide user session state throughout the app
**How**:
- Create `service/app/contexts/AuthContext.tsx`
- Use `supabase.auth.onAuthStateChange` to track session
- Provide `user`, `signIn`, `signUp`, `signOut`, `signInWithOAuth` methods
- Wrap app in `<AuthProvider>` in `service/app/layout.tsx`

**Validation**: Log `user` state in console - should reflect authentication status

**Dependencies**: Task 3.1

---

### Task 3.3: Add OAuth callback route
**What**: Handle redirects from Google/Apple OAuth flows
**How**:
- Create `service/app/auth/callback/route.ts`
- Exchange code for session using Supabase helpers
- Redirect to main app on success
- Handle errors gracefully

**Validation**: Complete Google Sign In flow - should redirect back and establish session

**Dependencies**: Task 3.2

---

### Task 3.4: Add login/signup modal triggers
**What**: Show authentication UI to unauthenticated users
**How**:
- Modify `service/app/page.tsx` to check authentication state
- Display AuthModal if user is null
- Hide resume upload section until authenticated
- Show user email and "Log Out" button when authenticated

**Validation**: Visit app without login - should show auth modal; after login, should show main UI

**Dependencies**: Task 3.3

---

## Phase 4: Profile Management Frontend

### Task 4.1: Create profile context provider
**What**: Manage selected profile state globally
**How**:
- Create `service/app/contexts/ProfileContext.tsx`
- Store active profile, profiles list, and CRUD methods
- Persist selected profile ID to localStorage
- Fetch profiles on mount for authenticated users

**Validation**: Select profile and refresh page - selected profile should persist

**Dependencies**: Task 3.4

---

### Task 4.2: Build profile selector dropdown
**What**: UI component for switching between profiles
**How**:
- Create `service/app/components/ProfileSelector.tsx`
- Display dropdown with all user's profiles
- Highlight currently selected profile
- Add "+ New Profile" option
- Load selected profile's criteria and resumes when changed

**Validation**: Create 3 profiles and switch between them - criteria should update accordingly

**Dependencies**: Task 4.1

---

### Task 4.3: Build create/edit profile form
**What**: Modal for creating and editing job profiles
**How**:
- Create `service/app/components/ProfileForm.tsx`
- Input fields for name, description
- Integrate with existing CriteriaInput component for criteria definition
- Call POST /api/profiles for create, PUT /api/profiles/[id] for update
- Show validation errors

**Validation**: Create profile with duplicate name - should show error; valid profile should save successfully

**Dependencies**: Task 4.2

---

### Task 4.4: Display resumes from selected profile
**What**: Load and show previously uploaded resumes for active profile
**How**:
- Modify CandidateRanking component to accept profile prop
- Fetch resumes from `/api/profiles/[id]/resumes` when profile is selected
- Display cached analysis results from database
- Show "No resumes yet" state for empty profiles

**Validation**: Select profile with existing resumes - should display them; empty profile should show empty state

**Dependencies**: Task 4.3

---

### Task 4.5: Implement profile deletion
**What**: Allow users to delete profiles with confirmation
**How**:
- Add "Delete Profile" button to ProfileForm or ProfileSelector
- Show confirmation dialog warning about resume deletion
- Call DELETE /api/profiles/[id] on confirm
- Remove profile from local state and select different profile (or none)

**Validation**: Delete profile with resumes - should confirm and remove; verify cascade delete in database

**Dependencies**: Task 4.4

---

### Task 4.6: Integrate profile with upload flow
**What**: Save uploaded resumes to active profile automatically
**How**:
- Modify `service/app/page.tsx` to include active profileId in analysis requests
- Update handleFilesUploaded to pass profileId to /api/analyze
- Show success message indicating resume was saved to profile
- Refresh profile's resume list after upload

**Validation**: Upload resume with profile selected - should appear in profile's resume list immediately

**Dependencies**: Task 4.5

---

## Phase 5: Polish and Optimization

### Task 5.1: Add loading states and error handling
**What**: Improve UX with spinners and error messages
**How**:
- Add loading indicators for profile fetch, create, update, delete
- Show toast notifications for success/error actions
- Handle network errors gracefully
- Add retry logic for failed requests

**Validation**: Simulate network failure - should show error message and allow retry

**Dependencies**: Task 4.6

---

### Task 5.2: Implement resume pagination for large profiles
**What**: Optimize display of profiles with 50+ resumes
**How**:
- Add pagination to resume list (20 per page)
- Implement "Load More" or page numbers
- Update API to support `?limit=20&offset=0` query params
- Cache fetched pages in state

**Validation**: Create profile with 60 resumes - should paginate correctly

**Dependencies**: Task 5.1

---

### Task 5.3: Add profile search and filter
**What**: Help users find profiles and resumes quickly
**How**:
- Add search input to ProfileSelector for filtering by name
- Add filter controls to resume list (e.g., qualified candidates only)
- Implement client-side filtering on fetched data

**Validation**: Search for profile name - should filter dropdown; filter resumes - should update list

**Dependencies**: Task 5.2

---

### Task 5.4: Write database indexes optimization script
**What**: Ensure queries perform well at scale
**How**:
- Analyze query patterns with EXPLAIN in Supabase
- Add composite indexes if needed (e.g., `(user_id, updated_at)`)
- Document index rationale in migration file

**Validation**: Run EXPLAIN on profile list query - should use indexes, not sequential scan

**Dependencies**: Task 1.2

---

### Task 5.5: Update documentation
**What**: Document new authentication and profile features
**How**:
- Update README.md with setup instructions for Supabase
- Add screenshots of profile UI
- Document environment variables (SUPABASE_URL, etc.)
- Create user guide for profile management

**Validation**: Follow README from scratch - should successfully set up auth

**Dependencies**: None (documentation can be written anytime)

---

## Phase 6: Testing and Validation

### Task 6.1: Write unit tests for API routes
**What**: Test profile CRUD operations in isolation
**How**:
- Use Jest or Vitest to test route handlers
- Mock Supabase client
- Test success cases, error cases, and edge cases
- Verify RLS is enforced (mocked user_id)

**Validation**: Run `npm test` - all tests should pass

**Dependencies**: Task 2.6

---

### Task 6.2: Write integration tests for auth flow
**What**: Test end-to-end authentication scenarios
**How**:
- Use Playwright or Cypress for E2E tests
- Test signup, login, logout flows
- Test SSO with Google (use test account)
- Verify protected routes redirect unauthenticated users

**Validation**: Run E2E tests - should complete without failures

**Dependencies**: Task 3.4

---

### Task 6.3: Write integration tests for profile workflows
**What**: Test profile creation, selection, and resume upload
**How**:
- E2E test: Create profile → Upload resume → Switch profile → Verify isolation
- Test profile deletion with cascade
- Test duplicate name validation

**Validation**: E2E tests pass and verify database state

**Dependencies**: Task 4.6

---

### Task 6.4: Security audit
**What**: Verify no data leakage or unauthorized access
**How**:
- Attempt to access another user's profile via direct API calls (should fail)
- Verify JWT expiration and refresh works
- Check for XSS vulnerabilities in profile names/descriptions
- Test CSRF protection on state-changing operations

**Validation**: All security tests pass; no unauthorized data access possible

**Dependencies**: All previous tasks

---

### Task 6.5: Performance testing
**What**: Ensure app performs well with realistic data volumes
**How**:
- Seed database with 100 profiles and 1000 resumes per user
- Measure page load times, API response times
- Verify pagination works correctly
- Check database query performance

**Validation**: Profile list loads in < 500ms; resume list (paginated) loads in < 1s

**Dependencies**: Task 5.4

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel dashboard
- [ ] Supabase database migrations executed in production
- [ ] RLS policies enabled and tested
- [ ] OAuth redirect URIs configured for production domain
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Backup strategy documented for Supabase database
- [ ] Rate limiting configured on API routes (to prevent abuse)
- [ ] User acceptance testing completed

---

## Parallel Work Opportunities

The following tasks can be worked on in parallel to speed up development:

- **Track A (Backend)**: Tasks 1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
- **Track B (Frontend)**: Tasks 3.1 → 3.2 → 3.3 → 3.4 (starts after 2.2)
- **Track C (Profile UI)**: Tasks 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 (starts after 3.4)
- **Track D (Documentation)**: Task 5.5 can be written anytime

Testing (Phase 6) should be done after all implementation phases are complete.

---

## Rollback Plan

If issues arise post-deployment:

1. **Authentication issues**: Toggle feature flag to show anonymous mode
2. **Database issues**: Revert migrations via Supabase dashboard
3. **RLS issues**: Temporarily disable RLS (EMERGENCY ONLY) and investigate
4. **Complete rollback**: Revert to previous Vercel deployment and disable Supabase integration

---

## Success Metrics

After implementation, verify:

- [ ] 100% of authenticated users can create and manage profiles
- [ ] Profile switching works without page refresh
- [ ] Zero unauthorized data access attempts succeed
- [ ] Page load times remain under 2 seconds
- [ ] All E2E tests passing in CI/CD pipeline
