# Proposal: Automated Profile Verifier

## Why

Currently, the resume screening system relies solely on AI analysis of resume PDF content to determine if candidates meet job criteria. However, resumes can contain inaccurate or exaggerated claims that cannot be verified without manual investigation. This creates risk for hiring teams and reduces confidence in candidate rankings.

Manual verification of LinkedIn profiles and GitHub repositories is time-consuming and inconsistent. Recruiters must:
- Manually search for candidate profiles
- Cross-reference job titles, companies, and skills
- Review GitHub repositories to verify technical experience
- Compare claimed experience against actual public evidence

This manual process is slow, error-prone, and doesn't scale when screening dozens of candidates.

## What Changes

### URL Extraction (`url-extraction`)

**Added Requirements:**
- Automatically extract LinkedIn and GitHub URLs from resume PDF text during analysis
- Store extracted URLs in candidate metadata
- Support common URL formats and variations

**Benefits:**
- No manual URL entry required
- Candidate data enriched automatically
- Foundation for verification workflow

### Profile Verification (`profile-verification`)

**Added Requirements:**
- On-demand verification via "Verify" button on candidate cards
- Scrape public LinkedIn profiles to extract job titles, companies, and skills
- Fetch GitHub repository data via public API (languages, commits, READMEs)
- Match extracted data against job criteria keywords
- Generate verification score (0-100) based on match strength
- Display verification badge and score on candidate cards
- Handle failures gracefully with "Unable to verify" state

**Benefits:**
- Objective validation of candidate claims
- Increased confidence in candidate rankings
- Quick identification of high-quality verified candidates
- Reduced time spent on manual background checking

### Rate Limiting (`rate-limiting`)

**Added Requirements:**
- Implement rate limiting for LinkedIn scraping and GitHub API calls
- Queue verification requests to prevent API throttling
- Display verification status (pending, in-progress, completed, failed)

**Benefits:**
- Compliance with API rate limits (GitHub: 60/hour unauthenticated)
- Prevents service disruption from excessive requests
- Better user feedback during verification process

## Scope

This change affects:
- `lib/pdfExtractor.ts` - Enhanced URL extraction during PDF parsing
- `lib/profileVerifier.ts` - New module for LinkedIn/GitHub verification
- `pages/api/verify.ts` - New API endpoint for on-demand verification
- `app/components/CandidateRanking.tsx` - Verify button and badge display
- Database schema - New fields for verification results

## Out of Scope

- LinkedIn API integration (requires company API access, not publicly available)
- Authentication for private GitHub repositories
- Real-time verification during upload (on-demand only)
- Historical commit analysis beyond basic activity metrics
- Verification of other platforms (Twitter, personal websites, etc.)

## Dependencies

**External Services:**
- GitHub public REST API (no authentication required, 60 requests/hour limit)
- Public LinkedIn profile pages (web scraping with DOM parsing)

**New Libraries:**
- `cheerio` - HTML parsing for LinkedIn scraping
- `octokit` or direct `fetch` for GitHub API

## Success Criteria

1. LinkedIn and GitHub URLs are automatically extracted from >90% of resumes that contain them
2. Verification button appears on all candidate cards
3. Verification generates a score (0-100) based on criteria match strength
4. Verified badge displays with color coding (green >75, yellow 50-75, gray <50)
5. Rate limiting prevents GitHub API throttling
6. "Unable to verify" state displays when URLs missing or profiles inaccessible
7. Verification completes within 10 seconds for profiles with <10 GitHub repos
