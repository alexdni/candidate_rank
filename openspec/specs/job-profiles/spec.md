# job-profiles Specification

## Purpose
TBD - created by archiving change add-user-profile-backend. Update Purpose after archive.
## Requirements
### Requirement: Create Job Profile

The system MUST allow authenticated users to create named job profiles with associated screening criteria.

#### Scenario: User creates a new job profile
**Given** an authenticated user
**When** they provide a profile name "Senior React Native Developer" and description "Looking for 5+ years experience"
**And** define screening criteria (e.g., React Native, TypeScript, Testing)
**Then** a new profile is created in the database with a unique ID
**And** the profile is associated with the user's user_id
**And** the criteria are stored as JSONB
**And** the profile appears in the user's profile list

#### Scenario: User creates profile with duplicate name
**Given** an authenticated user with an existing profile named "Mobile Developer"
**When** they attempt to create another profile with the same name
**Then** the system returns an error "A profile with this name already exists"
**And** no duplicate profile is created
**And** the user is prompted to choose a different name

#### Scenario: User creates profile without name
**Given** an authenticated user on the create profile form
**When** they submit the form with an empty name field
**Then** the system shows a validation error "Profile name is required"
**And** the profile is not created

#### Scenario: User creates profile with empty criteria
**Given** an authenticated user
**When** they create a profile with a name but no screening criteria defined
**Then** the profile is created successfully with an empty criteria array `[]`
**And** the user can add criteria later via profile editing

---

### Requirement: List User's Job Profiles

The system MUST allow users to view all their created job profiles.

#### Scenario: User with multiple profiles views profile list
**Given** an authenticated user with 3 created profiles
**When** they navigate to the profiles section
**Then** all 3 profiles are displayed in a list or dropdown
**And** each profile shows name, description, and creation date
**And** profiles are sorted by most recently updated first

#### Scenario: New user with no profiles
**Given** an authenticated user who just signed up
**When** they view the profiles section
**Then** an empty state is displayed with message "No job profiles yet"
**And** a "Create your first profile" button is prominently shown

#### Scenario: User filters profiles by name
**Given** a user with 10+ profiles
**When** they type "React" in the search/filter field
**Then** only profiles with "React" in the name or description are shown
**And** the list updates in real-time as they type

---

### Requirement: Select Active Job Profile

The system MUST allow users to switch between different job profiles and load associated data.

#### Scenario: User selects a profile from dropdown
**Given** an authenticated user with multiple profiles
**When** they select "Senior React Native Developer" from the profile dropdown
**Then** the application loads the criteria associated with that profile
**And** any previously uploaded resumes for that profile are displayed
**And** the criteria inputs are populated with the profile's saved criteria
**And** the profile remains selected across page refreshes (stored in localStorage)

#### Scenario: User switches from one profile to another
**Given** an active profile "Frontend Developer" with 5 uploaded resumes
**When** the user switches to profile "Backend Developer"
**Then** the frontend clears the previous profile's data
**And** loads the new profile's criteria and resumes
**And** the analysis results are specific to the new profile's criteria

#### Scenario: User loads application with previously selected profile
**Given** a user last used profile "Mobile Developer" before closing the browser
**When** they return to the application and log in
**Then** the "Mobile Developer" profile is automatically selected
**And** the associated criteria and resumes are loaded
**And** they can continue where they left off

---

### Requirement: Update Job Profile

The system MUST allow users to edit existing job profiles, including name, description, and criteria.

#### Scenario: User updates profile name and description
**Given** a profile named "iOS Developer"
**When** the user edits the name to "Senior iOS Developer" and updates the description
**Then** the profile is updated in the database
**And** the updated_at timestamp is refreshed
**And** the changes are immediately reflected in the profile list

#### Scenario: User adds new criteria to existing profile
**Given** a profile with 2 criteria ("Swift", "UIKit")
**When** the user adds a third criterion "SwiftUI"
**Then** the criteria JSONB is updated with all 3 items
**And** future resume analyses use the updated criteria set
**And** previously analyzed resumes retain their original analysis (not re-analyzed)

#### Scenario: User removes a criterion from profile
**Given** a profile with 3 criteria
**When** the user deletes one criterion
**Then** the criteria array is updated to contain only 2 items
**And** the profile is saved successfully
**And** a warning is shown if resumes have already been analyzed with that criterion

#### Scenario: User renames profile to match existing profile name
**Given** a user with profiles "Frontend" and "Backend"
**When** they try to rename "Frontend" to "Backend"
**Then** the system returns an error "A profile with this name already exists"
**And** the rename operation is cancelled
**And** the original name is preserved

---

### Requirement: Delete Job Profile

The system MUST allow users to permanently delete job profiles and associated data.

#### Scenario: User deletes an empty profile
**Given** a profile with no uploaded resumes
**When** the user clicks "Delete Profile" and confirms the action
**Then** the profile is removed from the database
**And** the profile disappears from the profile list
**And** a success message is displayed "Profile deleted successfully"

#### Scenario: User deletes profile with resumes
**Given** a profile with 10 uploaded resumes
**When** the user attempts to delete the profile
**Then** a confirmation dialog is shown warning "This will delete all associated resumes (10)"
**And** if confirmed, the profile and all resume metadata are deleted (CASCADE)
**And** the PDF files in Vercel Blob are NOT deleted (blob URLs become orphaned)

#### Scenario: User cancels profile deletion
**Given** a user initiating profile deletion
**When** they see the confirmation dialog and click "Cancel"
**Then** the deletion is aborted
**And** the profile and all data remain intact
**And** the user is returned to the profile view

---

### Requirement: Associate Resumes with Profile

The system MUST store resume metadata with the active job profile when users upload and analyze resumes.

#### Scenario: User uploads resume with active profile selected
**Given** a user has selected profile "Senior React Native Developer"
**When** they upload a PDF resume "john_doe.pdf"
**And** the analysis completes successfully
**Then** a new record is created in the `resumes` table with:
- `profile_id` pointing to the active profile
- `filename` as "john_doe.pdf"
- `blob_url` from Vercel Blob upload
- `analysis_result` containing the AI analysis JSON
**And** the resume appears in the profile's resume list

#### Scenario: User uploads multiple resumes to same profile
**Given** an active profile "Frontend Developer"
**When** the user uploads 5 PDFs in one batch
**Then** 5 separate records are created in the `resumes` table
**And** all records share the same `profile_id`
**And** each has a unique `id` and `blob_url`
**And** all 5 resumes are displayed together in the profile view

#### Scenario: User uploads same resume to different profiles
**Given** a resume "jane_doe.pdf" uploaded to profile "Frontend"
**When** the user switches to profile "Backend" and uploads the same file
**Then** a new blob is created (separate blob_url)
**And** a separate `resumes` record is created for the Backend profile
**And** both profiles independently track the same candidate
**And** the analyses may differ based on different criteria

---

### Requirement: View Resumes for Selected Profile

The system MUST allow users to see all resumes previously uploaded to a job profile.

#### Scenario: User views resumes for active profile
**Given** a profile "Mobile Developer" with 15 uploaded resumes
**When** the user selects that profile
**Then** all 15 resumes are displayed in a list
**And** each resume shows:
- Candidate name (extracted from filename or analysis)
- Upload date
- Qualifications count
- Summary from analysis
**And** resumes are sorted by qualifications count (highest first)

#### Scenario: User views profile with no resumes
**Given** a newly created profile with no uploads
**When** the user selects that profile
**Then** the resume list is empty
**And** a message is shown "No resumes uploaded yet"
**And** the upload section is prominently displayed

#### Scenario: User clicks on a resume to view details
**Given** a resume listed in the profile view
**When** the user clicks on the resume row
**Then** a detailed view is displayed showing:
- Full analysis results (criteria match breakdown)
- Summary
- Link to view the PDF (blob_url)
**And** the user can open the PDF in a new tab

---

### Requirement: Remove Resume from Profile

The system MUST allow users to delete individual resumes from a job profile.

#### Scenario: User deletes a single resume
**Given** a profile with 10 resumes
**When** the user clicks "Delete" on one resume and confirms
**Then** the resume record is removed from the `resumes` table
**And** the resume disappears from the profile's resume list
**And** the profile still contains the other 9 resumes
**And** the PDF in Vercel Blob is NOT deleted (orphaned blob)

#### Scenario: User deletes all resumes from a profile
**Given** a profile with 5 resumes
**When** the user selects all resumes and clicks "Delete Selected"
**Then** all 5 records are removed from the database
**And** the profile still exists but shows no resumes
**And** the profile's criteria are preserved

---

### Requirement: Persist Criteria with Profile

The system MUST save screening criteria defined for a profile and reload them when the profile is selected.

#### Scenario: User defines criteria and switches profiles
**Given** a user creates profile "Frontend" with criteria ["React", "CSS", "TypeScript"]
**When** they switch to a different profile "Backend"
**And** later switch back to "Frontend"
**Then** the criteria are automatically loaded and displayed
**And** the criteria inputs are pre-filled with the saved values
**And** the user can immediately upload resumes without reconfiguring criteria

#### Scenario: User modifies criteria and saves profile
**Given** a profile with existing criteria
**When** the user adds a new criterion "GraphQL"
**And** clicks "Save Profile"
**Then** the updated criteria JSONB is stored in the database
**And** the `updated_at` timestamp is refreshed
**And** the new criterion is immediately available for resume analysis

---

### Requirement: Profile Data Isolation

The system MUST enforce that each user can only access their own profiles and resumes through Row Level Security policies.

#### Scenario: User attempts to access another user's profile
**Given** User A has a profile with ID "profile-123"
**And** User B is authenticated
**When** User B directly requests profile-123 via API
**Then** the Supabase RLS policy denies access
**And** the API returns an empty result or 403 Forbidden
**And** User B cannot view or modify User A's data

#### Scenario: User lists all profiles
**Given** User A has 3 profiles and User B has 5 profiles
**When** User A requests GET /api/profiles
**Then** only User A's 3 profiles are returned
**And** User B's profiles are not visible to User A
**And** the query is filtered by `user_id = auth.uid()` at the database level

---

### Requirement: Profile Performance Optimization

The system MUST ensure profile and resume data load quickly even with large datasets.

#### Scenario: User loads profile with 100+ resumes
**Given** a profile containing 150 uploaded resumes
**When** the user selects that profile
**Then** the profile metadata and criteria load within 500ms
**And** resumes are paginated (e.g., 20 per page)
**And** the user can scroll through pages smoothly
**And** database queries use indexed columns (profile_id, user_id)

#### Scenario: User searches resumes within profile
**Given** a profile with 200 resumes
**When** the user searches for "senior engineer"
**Then** the search is performed on cached analysis_result JSONB
**And** results are returned within 1 second
**And** only matching resumes are displayed

---

