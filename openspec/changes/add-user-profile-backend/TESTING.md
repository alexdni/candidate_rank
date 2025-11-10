# End-to-End Testing Guide

## Test Environment Setup

### Prerequisites
- ✅ Supabase project created and configured
- ✅ Google OAuth credentials configured in Supabase dashboard
- ✅ Database migrations applied (profiles and resumes tables)
- ✅ Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `BLOB_READ_WRITE_TOKEN`
  - `ANTHROPIC_API_KEY`
- ✅ Application builds successfully

## Test Scenarios

### 1. Anonymous Mode (No Authentication)

**Objective:** Verify backward compatibility with original functionality

**Steps:**
1. Start the application: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Verify UI shows:
   - "Sign In" button in top-right corner
   - No "Job Profile" selector visible
   - "Screening Criteria" section visible
   - Upload section with file input
4. Add custom screening criteria:
   - Fill in criterion name and description
   - Add multiple criteria using "+ Add Criterion" button
5. Upload test resume PDFs
6. Verify:
   - Resume analysis completes successfully
   - Candidate rankings display correctly
   - Match criteria shown for each candidate
   - PDF viewer modal works when clicking candidate names

**Expected Result:** ✅ All original features work without authentication

---

### 2. Email/Password Authentication

**Objective:** Test email-based signup and login flows

#### 2.1 Sign Up with Email

**Steps:**
1. Click "Sign In" button
2. Enter new email and password (min 6 characters)
3. Click "Sign Up"
4. Check email inbox for verification link
5. Click verification link
6. Return to application

**Expected Result:** ✅ User is authenticated and redirected to home page

#### 2.2 Sign In with Email

**Steps:**
1. Sign out if currently logged in
2. Click "Sign In" button
3. Enter existing email and password
4. Click "Sign In"

**Expected Result:** ✅ User is authenticated and sees profile selector

#### 2.3 Error Handling

**Test Cases:**
- Invalid email format → Shows error message
- Password too short → Shows "Password must be at least 6 characters"
- Wrong credentials → Shows "Invalid login credentials"
- Attempt to sign up with existing email → Shows appropriate error

**Expected Result:** ✅ All error cases display clear user feedback

---

### 3. Google OAuth Authentication

**Objective:** Test social login integration

**Steps:**
1. Click "Sign In" button
2. Click "Continue with Google"
3. Select Google account
4. Grant permissions if prompted
5. Redirected back to application

**Expected Result:** ✅ User is authenticated via Google account

---

### 4. Profile Management

**Objective:** Test CRUD operations for job profiles

#### 4.1 Create New Profile

**Steps:**
1. Sign in with any method
2. Verify "Job Profile" selector appears
3. Click the selector dropdown
4. Click "+ Create New Profile"
5. Fill in profile form:
   - Name: "Senior React Native Developer"
   - Description: "5+ years experience required"
   - Add criteria:
     - Criterion 1: "React Native Experience" / "5+ years of React Native development"
     - Criterion 2: "TypeScript Skills" / "Strong TypeScript knowledge"
     - Criterion 3: "Mobile Architecture" / "Experience with mobile app architecture"
6. Click "Create Profile"

**Expected Result:**
- ✅ Modal closes
- ✅ New profile appears in dropdown
- ✅ Profile is automatically selected
- ✅ Criteria display shows all 3 criteria below selector

#### 4.2 View Profile Criteria

**Steps:**
1. Select a profile from dropdown
2. Observe criteria display section

**Expected Result:**
- ✅ Shows "📋 Screening Criteria (X)" header
- ✅ Lists all criteria with numbering
- ✅ Shows criterion name and description
- ✅ Shows hint: "💾 Uploaded resumes will be saved to this profile"

#### 4.3 Switch Between Profiles

**Steps:**
1. Create 2-3 different profiles with different criteria
2. Switch between profiles using dropdown
3. Observe criteria display updates

**Expected Result:**
- ✅ Criteria display updates immediately
- ✅ Selected profile persists after page refresh (localStorage)
- ✅ Active profile shows checkmark ✓ in dropdown

#### 4.4 Edit Profile (Future Feature)

**Status:** ⚠️ Edit functionality UI not yet implemented
**Note:** Backend API endpoint exists at `PUT /api/profiles/[id]`

#### 4.5 Delete Profile (Future Feature)

**Status:** ⚠️ Delete functionality UI not yet implemented
**Note:** Backend API endpoint exists at `DELETE /api/profiles/[id]`

---

### 5. Resume Upload with Profile

**Objective:** Test resume-profile association and persistence

#### 5.1 Upload Resume to Active Profile

**Steps:**
1. Sign in and select a profile
2. Upload one or more PDF resumes
3. Wait for analysis to complete
4. Verify candidates appear in rankings
5. Refresh the page (Cmd/Ctrl + R)
6. Verify:
   - Same profile is still selected
   - Uploaded resumes still appear in rankings
   - No re-analysis occurred (loaded from database)

**Expected Result:**
- ✅ Resumes saved to database with analysis results
- ✅ Resume metadata persists across sessions
- ✅ PDF blobs accessible via Vercel Blob URLs

#### 5.2 Upload Multiple Resumes

**Steps:**
1. Select a profile
2. Upload 5+ resume PDFs simultaneously
3. Observe processing indicator
4. Verify all resumes analyzed and saved

**Expected Result:**
- ✅ Shows "Analyzing resume..." with progress
- ✅ Displays current file being processed
- ✅ All resumes appear in candidate rankings
- ✅ All saved to selected profile

#### 5.3 Switch Profile and Upload

**Steps:**
1. Create "Profile A" and upload 2 resumes
2. Create "Profile B" with different criteria
3. Upload 2 different resumes to "Profile B"
4. Switch back to "Profile A"
5. Verify only "Profile A" resumes are shown
6. Switch to "Profile B"
7. Verify only "Profile B" resumes are shown

**Expected Result:**
- ✅ Each profile maintains its own resume set
- ✅ Switching profiles loads correct resumes
- ✅ No cross-contamination between profiles

---

### 6. Anonymous Mode with Authenticated User

**Objective:** Test "None (Anonymous Mode)" option

**Steps:**
1. Sign in and create a profile
2. Upload some resumes to the profile
3. Click profile dropdown
4. Select "None (Anonymous Mode)"
5. Verify:
   - Criteria display section disappears
   - "Screening Criteria" input section appears
   - Candidate rankings cleared
6. Add custom criteria manually
7. Upload new resumes
8. Verify resumes analyzed but NOT saved to database
9. Refresh page
10. Verify resumes are gone (ephemeral)

**Expected Result:**
- ✅ Authenticated users can still use anonymous mode
- ✅ Anonymous uploads not persisted to database
- ✅ Can switch back to profile to see saved resumes

---

### 7. Session Management

**Objective:** Test session persistence and refresh

#### 7.1 Session Persistence

**Steps:**
1. Sign in
2. Close browser tab
3. Open new tab to same URL
4. Verify still authenticated

**Expected Result:** ✅ Session persists via cookies

#### 7.2 Sign Out

**Steps:**
1. Sign in
2. Click "Sign Out" button
3. Verify:
   - Redirected to signed-out state
   - Profile selector hidden
   - Criteria input shown
   - Candidates cleared

**Expected Result:** ✅ Clean sign-out flow

---

### 8. API Security

**Objective:** Verify Row Level Security policies

#### 8.1 Protected Routes

**Test:**
```bash
# Without authentication cookie
curl http://localhost:3000/api/profiles
```

**Expected Result:** ✅ Returns 401 Unauthorized

#### 8.2 User Isolation

**Steps:**
1. Sign in as User A
2. Create profiles and upload resumes
3. Note profile IDs from database
4. Sign out
5. Sign in as User B
6. Attempt to access User A's profile via API:
   ```bash
   curl http://localhost:3000/api/profiles/{user_a_profile_id} \
     -H "Cookie: [user_b_auth_cookies]"
   ```

**Expected Result:**
- ✅ User B cannot access User A's profiles
- ✅ RLS policies enforce user isolation
- ✅ Returns 404 or empty result

---

### 9. Edge Cases

#### 9.1 Duplicate Profile Names

**Steps:**
1. Create profile named "Test Profile"
2. Attempt to create another profile with same name

**Expected Result:** ✅ Error message about duplicate name

#### 9.2 No Criteria

**Steps:**
1. Open profile creation modal
2. Remove all criteria
3. Attempt to submit

**Expected Result:** ✅ Validation error: "At least one criterion is required"

#### 9.3 Incomplete Criteria

**Steps:**
1. Add criterion with name but no description
2. Attempt to submit profile

**Expected Result:** ✅ Validation error: "All criteria must have a name and description"

#### 9.4 Empty Profile Name

**Steps:**
1. Leave profile name blank
2. Fill in criteria
3. Attempt to submit

**Expected Result:** ✅ Validation error: "Profile name is required"

---

## Database Verification

### Check Profiles Table

```sql
SELECT id, user_id, name, description, created_at, updated_at
FROM profiles
ORDER BY updated_at DESC;
```

**Expected:** ✅ Profiles associated with correct user_id

### Check Resumes Table

```sql
SELECT r.id, r.filename, r.blob_url, r.uploaded_at, p.name as profile_name
FROM resumes r
JOIN profiles p ON r.profile_id = p.id
ORDER BY r.uploaded_at DESC;
```

**Expected:** ✅ Resumes linked to correct profiles

### Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'resumes');
```

**Expected:** ✅ All RLS policies active and correctly configured

---

## Performance Testing

### Load Test - Multiple Resumes

**Steps:**
1. Prepare 20+ test resume PDFs
2. Select a profile
3. Upload all 20 resumes simultaneously
4. Measure:
   - Time to complete all analyses
   - Database write performance
   - UI responsiveness during processing

**Expected Result:**
- ✅ No UI freezing or crashes
- ✅ All resumes processed successfully
- ✅ Database writes complete without errors

### Load Test - Multiple Profiles

**Steps:**
1. Create 10+ profiles with 5+ criteria each
2. Upload 5 resumes to each profile
3. Switch between profiles rapidly

**Expected Result:**
- ✅ Fast profile switching
- ✅ Correct resume sets loaded each time
- ✅ No memory leaks or performance degradation

---

## Build and Deployment Verification

### Production Build

```bash
npm run build
```

**Expected Result:**
- ✅ No build errors
- ✅ All routes generated successfully
- ✅ Middleware compiled correctly

### Vercel Deployment

**Steps:**
1. Push changes to Git
2. Deploy to Vercel
3. Verify environment variables set in Vercel dashboard
4. Test all flows in production environment

**Expected Result:**
- ✅ Deployment succeeds
- ✅ All features work in production
- ✅ OAuth redirects work with production URL

---

## Known Limitations (By Design)

1. **PDF Blob Persistence:** Deleted resumes remain in Vercel Blob storage (blob URLs become inactive but files not deleted)
2. **Apple Sign In:** Not implemented (user explicitly skipped)
3. **Profile Editing UI:** Backend API exists, but UI not yet implemented
4. **Profile Deletion UI:** Backend API exists, but UI not yet implemented
5. **Resume Management UI:** Cannot individually delete resumes from UI (API exists)
6. **Team Collaboration:** No sharing or multi-user access to profiles

---

## Test Summary Checklist

- [ ] Anonymous mode works without authentication
- [ ] Email/password signup and login functional
- [ ] Google OAuth authentication works
- [ ] Profile creation with criteria succeeds
- [ ] Profile criteria display correctly
- [ ] Profile switching updates UI correctly
- [ ] Resume uploads save to active profile
- [ ] Resumes persist across page refreshes
- [ ] Each profile maintains separate resume sets
- [ ] Anonymous mode still accessible when authenticated
- [ ] Session persists across browser restarts
- [ ] Sign out clears state properly
- [ ] Protected API routes return 401 without auth
- [ ] RLS policies enforce user isolation
- [ ] Duplicate profile names rejected
- [ ] Form validation prevents incomplete data
- [ ] Production build succeeds
- [ ] Deployment to Vercel works
- [ ] All error cases show user-friendly messages

---

## Test Results Log

**Date:** ___________
**Tester:** ___________
**Environment:** [ ] Local Development [ ] Vercel Preview [ ] Production

### Summary
- Total tests executed: _____
- Tests passed: _____
- Tests failed: _____
- Blockers found: _____

### Issues Found

1. **Issue:** ___________
   **Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
   **Steps to reproduce:** ___________
   **Expected:** ___________
   **Actual:** ___________

2. _(Add more as needed)_

### Sign-off

- [ ] All critical paths tested and working
- [ ] No blockers identified
- [ ] Ready for production deployment

**Signature:** ___________
**Date:** ___________
