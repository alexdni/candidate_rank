# Proposal: Add User Profile Backend with Supabase Authentication

## Overview

Add comprehensive backend functionality to enable user authentication and persistent job profile management. This change introduces Supabase-based identity management with SSO support and allows authenticated users to create, manage, and switch between multiple job profiles that store resume collections and screening criteria.

## Why

Currently, the resume screening system operates statelessly - users must re-upload resumes and re-configure criteria for each session. This creates friction for:

1. **Recurring screening workflows**: HR teams screening for the same role repeatedly
2. **Multiple job roles**: Organizations managing different positions simultaneously
3. **Session continuity**: Loss of work when browser refreshes or users switch devices
4. **Collaboration**: No ability to share screening configurations across team members

Adding user profiles with persistent storage solves these pain points and enables future features like team collaboration, audit trails, and analytics.

## Scope

This change introduces two major capabilities:

### 1. Authentication (`authentication`)
- Supabase Auth integration with email/password and SSO (Google, Apple)
- Session management and token refresh
- API route protection middleware
- User profile data structure

### 2. Job Profiles (`job-profiles`)
- CRUD operations for job profiles
- Resume metadata storage (blob URLs, filenames, upload timestamps)
- Criteria template storage and retrieval
- Profile switching and selection
- Association with authenticated user

## Out of Scope

- Team/organization management (multi-tenant)
- Role-based access control (RBAC)
- Profile sharing or collaboration features
- Migration of existing anonymous usage data
- Audit logging or analytics

These features are intentionally deferred to future changes.

## Dependencies

- Supabase project must be created and configured (user provides credentials)
- Vercel Blob storage remains the source of truth for PDF files
- OpenAI API key requirement unchanged

## Success Criteria

1. Users can sign up with email/password or SSO (Google/Apple)
2. Users can create multiple job profiles with names and descriptions
3. Each profile stores uploaded resume metadata and screening criteria
4. Users can switch between profiles and see saved data load instantly
5. All API routes enforce authentication
6. Database schema is properly indexed and performant
7. No breaking changes to existing anonymous screening workflow (backward compatible during transition)

## Related Changes

- Future: `add-team-collaboration` - Multi-user access to shared profiles
- Future: `add-profile-templates` - Public template marketplace
- Future: `add-analytics-dashboard` - Usage tracking and insights
