# Implementation Tasks

## Overview

This task list provides a sequential implementation path for building the automated profile verifier. Tasks are ordered to deliver incremental user-visible value and enable early testing of core functionality.

---

## Task 1: Install dependencies and setup database schema

**What**: Add required npm packages and create database migration for verification fields

**How**:
- Run `npm install cheerio @types/cheerio` for LinkedIn scraping
- Create migration file `003_add_verification_columns.sql`:
  ```sql
  ALTER TABLE resumes
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN github_url TEXT,
  ADD COLUMN verification_result JSONB,
  ADD COLUMN verified_at TIMESTAMPTZ;

  CREATE INDEX IF NOT EXISTS resumes_verified_at_idx ON resumes(verified_at DESC);
  ```
- Apply migration to Supabase database

**Validation**:
- Verify `cheerio` is listed in package.json dependencies
- Run `\d resumes` in Supabase SQL editor to confirm new columns exist
- Confirm no errors in migration logs

**Dependencies**: None

---

## Task 2: Add URL extraction to PDF extractor

**What**: Enhance `lib/pdfExtractor.ts` to extract LinkedIn and GitHub URLs from resume text

**How**:
- Define regex patterns:
  ```typescript
  const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)/gi;
  const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)/gi;
  ```
- Create `extractUrls(text: string)` function that:
  - Runs regex.exec() to find all matches
  - Normalizes URLs (add https://, remove www, strip trailing slashes)
  - Returns `{ linkedinUrl?: string, githubUrl?: string }`
- Modify `extractTextFromPDF()` to call `extractUrls()` and return both text and URLs
- Update return type to `{ text: string, linkedinUrl?: string, githubUrl?: string }`

**Validation**:
- Unit test with sample text containing "linkedin.com/in/testuser" → returns "https://linkedin.com/in/testuser"
- Unit test with "github.com/testuser/repo" → returns "https://github.com/testuser"
- Unit test with no URLs → returns undefined for both fields
- Unit test with multiple URLs → returns only the first of each type

**Dependencies**: Task 1

---

## Task 3: Update analysis API to include URLs

**What**: Modify `/pages/api/analyze.ts` to extract and return URLs in the response

**How**:
- Update call to `extractTextFromPDF()` to receive `{ text, linkedinUrl, githubUrl }`
- Add linkedinUrl and githubUrl to the CandidateResult response:
  ```typescript
  const candidate: CandidateResult = {
    name: filename.replace('.pdf', ''),
    criteria: analysis.criteria,
    summary: analysis.summary,
    qualificationsCount: calculateQualificationsCount(analysis.criteria),
    linkedinUrl,
    githubUrl,
  };
  ```
- Update CandidateResult interface in `lib/resumeAnalyzer.ts` to include optional linkedinUrl and githubUrl fields

**Validation**:
- Upload a resume with LinkedIn URL via UI
- Check network tab: `/api/analyze` response includes `linkedinUrl` field
- Verify URL is correctly normalized

**Dependencies**: Task 2

---

## Task 4: Update Candidate interface and database storage

**What**: Add URL fields to Candidate interface and persist to database when resumes are saved

**How**:
- Update `Candidate` interface in `app/page.tsx`:
  ```typescript
  export interface Candidate {
    name: string;
    criteria: Record<string, boolean>;
    summary: string;
    qualificationsCount: number;
    blobUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    verificationStatus?: 'unverified' | 'pending' | 'verified' | 'failed';
    verificationScore?: number;
    verificationDetails?: VerificationDetails;
  }
  ```
- Update `/api/profiles/[id]/resumes/route.ts` POST handler to save linkedin_url and github_url to database
- Update GET handler to return linkedin_url and github_url from database records

**Validation**:
- Upload resume with URLs while signed in
- Query database: `SELECT linkedin_url, github_url FROM resumes` → URLs are stored
- Refresh page: Candidate data includes linkedinUrl and githubUrl

**Dependencies**: Task 3

---

## Task 5: Create profile verifier module

**What**: Build `lib/profileVerifier.ts` with core verification logic

**How**:
- Create interfaces:
  ```typescript
  export interface VerificationDetails {
    linkedinData?: {
      positions: { title: string; company: string }[];
      skills: string[];
      matchScore: number;
    };
    githubData?: {
      repositories: { name: string; language: string; stars: number; readme: string }[];
      totalCommits: number;
      matchScore: number;
    };
    overallScore: number;
    verifiedAt: string;
    errors?: string[];
  }
  ```
- Create `verifyLinkedIn(url: string, keywords: string[])` function using cheerio to scrape public profile
- Create `verifyGitHub(url: string, keywords: string[])` function using GitHub API
- Create `calculateOverallScore(linkedinScore, githubScore)` function
- Export main `verifyProfile(linkedinUrl, githubUrl, keywords)` function

**Validation**:
- Unit test with mocked fetch responses
- Test with real LinkedIn/GitHub URLs (manual)
- Verify score calculation: (80 * 0.6 + 60 * 0.4) = 72

**Dependencies**: Task 1

---

## Task 6: Implement LinkedIn scraping logic

**What**: Complete the `verifyLinkedIn()` function with cheerio-based HTML parsing

**How**:
- Fetch profile HTML: `const response = await fetch(linkedinUrl, { headers: { 'User-Agent': 'Mozilla/5.0...' } })`
- Parse with cheerio: `const $ = cheerio.load(await response.text())`
- Extract positions using selectors (inspect LinkedIn public profile HTML to find class names)
- Extract skills using selectors
- Match extracted text against keywords (case-insensitive)
- Calculate matchScore: `(matchedItems / totalKeywords) * 100`
- Handle errors: CAPTCHA detection, private profiles, network errors

**Validation**:
- Test with public LinkedIn profile URL
- Verify positions and skills are extracted correctly
- Test with private profile → returns limited data with appropriate error message
- Test with invalid URL → throws error

**Dependencies**: Task 5

---

## Task 7: Implement GitHub API integration

**What**: Complete the `verifyGitHub()` function using GitHub REST API

**How**:
- Extract username from GitHub URL using regex
- Fetch repos: `GET https://api.github.com/users/{username}/repos?sort=stars&per_page=100`
- For each repo:
  - Check language field for keyword matches
  - Check repo name for keyword matches
  - Fetch README: `GET https://raw.githubusercontent.com/{user}/{repo}/main/README.md`
  - Search README text for keywords
- Calculate matchScore based on matches
- Apply commit activity bonus for repos with >10 commits
- Handle rate limiting: check `X-RateLimit-Remaining` header
- Handle errors: 404 not found, rate limit exceeded, network errors

**Validation**:
- Test with real GitHub username
- Verify repos are fetched and scored correctly
- Test with non-existent user → returns error
- Mock rate limit response → verify error handling

**Dependencies**: Task 5

---

## Task 8: Create verification API endpoint

**What**: Build `/pages/api/verify.ts` endpoint to handle verification requests

**How**:
- Create POST endpoint that accepts:
  ```typescript
  { linkedinUrl?: string, githubUrl?: string, keywords: string[], resumeId?: string }
  ```
- Call `verifyProfile()` from lib/profileVerifier
- If resumeId provided (authenticated user), update database:
  ```sql
  UPDATE resumes SET verification_result = $1, verified_at = NOW() WHERE id = $2
  ```
- Return verification result:
  ```typescript
  { verificationStatus: 'verified', verificationScore: 85, verificationDetails: {...} }
  ```
- Handle errors: return 400 if no URLs, 500 for scraping failures

**Validation**:
- POST to `/api/verify` with test data
- Verify response includes verificationScore and verificationDetails
- Check database: verification_result JSONB is populated
- Test error cases: no URLs → 400 error

**Dependencies**: Tasks 5, 6, 7

---

## Task 9: Implement rate limiting and queueing

**What**: Add rate limit enforcement and request queueing to prevent API throttling

**How**:
- Create `lib/verificationQueue.ts`:
  ```typescript
  class VerificationQueue {
    private queue: VerificationRequest[] = [];
    private githubRequestCount = 0;
    private lastResetTime = Date.now();

    async enqueue(request) { /* FIFO queue logic */ }
    private async processQueue() { /* rate limit checks */ }
  }
  ```
- In `verifyGitHub()`, check rate limit before requests:
  ```typescript
  if (githubRequestCount >= 55) {
    await sleep(60000); // wait for reset
  }
  ```
- Add 3-second delay between LinkedIn requests
- Implement exponential backoff on CAPTCHA/429 responses

**Validation**:
- Simulate 60 GitHub requests → verify queueing behavior
- Verify requests wait when rate limit exceeded
- Test LinkedIn delay: 2 requests should take >3 seconds

**Dependencies**: Task 8

---

## Task 10: Add Verify button to candidate cards

**What**: Update `CandidateRanking.tsx` to display Verify button and handle verification

**How**:
- Add button to candidate card JSX:
  ```tsx
  <TouchableOpacity
    onPress={() => handleVerify(candidate)}
    disabled={candidate.verificationStatus === 'pending'}
  >
    <Text>{candidate.verificationStatus === 'pending' ? 'Verifying...' : 'Verify'}</Text>
  </TouchableOpacity>
  ```
- Implement `handleVerify()`:
  ```typescript
  const handleVerify = async (candidate: Candidate) => {
    setCandidateStatus(candidate.name, 'pending');
    const response = await fetch('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ linkedinUrl: candidate.linkedinUrl, githubUrl: candidate.githubUrl, keywords: criteria.flatMap(c => c.keywords || []) })
    });
    const result = await response.json();
    updateCandidateVerification(candidate.name, result);
  };
  ```
- Update candidate state with verification result

**Validation**:
- Click "Verify" button → button text changes to "Verifying..."
- Wait for completion → verification badge appears
- Verify button disables during verification

**Dependencies**: Task 8

---

## Task 11: Add verification badge to candidate cards

**What**: Display color-coded verification badge based on score

**How**:
- Add badge component:
  ```tsx
  {candidate.verificationStatus === 'verified' && (
    <View style={{ backgroundColor: getScoreColor(candidate.verificationScore), padding: 4, borderRadius: 4 }}>
      <Text style={{ color: 'white', fontSize: 12 }}>
        ✓ Verified {candidate.verificationScore}/100
      </Text>
    </View>
  )}
  ```
- Implement `getScoreColor()`:
  ```typescript
  function getScoreColor(score: number) {
    if (score >= 75) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // yellow
    return '#6b7280'; // gray
  }
  ```
- Position badge near ranking number or in card header

**Validation**:
- Verify score 85 → green badge
- Verify score 60 → yellow badge
- Verify score 30 → gray badge
- Unverified → no badge

**Dependencies**: Task 10

---

## Task 12: Add error handling UI

**What**: Display user-friendly error messages when verification fails

**How**:
- Update candidate card to show error state:
  ```tsx
  {candidate.verificationStatus === 'failed' && (
    <Text style={{ color: '#ef4444', fontSize: 13 }}>
      Unable to verify: {candidate.verificationDetails?.errors?.[0] || 'Unknown error'}
    </Text>
  )}
  ```
- Common errors:
  - "No LinkedIn or GitHub URLs found"
  - "Profile is private or inaccessible"
  - "Network error - please try again"
  - "Rate limited - verification queued"

**Validation**:
- Trigger verification with no URLs → displays "No URLs found"
- Trigger with private profile → displays appropriate error
- Verify button remains enabled for retry

**Dependencies**: Task 11

---

## Task 13: Add timeout and retry logic

**What**: Implement timeout limits and retry logic for network requests

**How**:
- Wrap fetch calls with timeout:
  ```typescript
  const fetchWithTimeout = (url, timeout = 10000) => {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
  };
  ```
- Add retry logic with exponential backoff:
  ```typescript
  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchWithTimeout(url);
      } catch (error) {
        if (i === retries - 1) throw error;
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
      }
    }
  }
  ```
- Apply to both LinkedIn and GitHub requests

**Validation**:
- Mock slow network → verify 10s timeout triggers
- Mock intermittent failure → verify 3 retries occur
- Verify exponential backoff delays

**Dependencies**: Task 9

---

## Task 14: Implement caching for verification results

**What**: Cache verification results to avoid redundant requests

**How**:
- Create simple in-memory cache:
  ```typescript
  const verificationCache = new Map<string, { result: VerificationDetails, timestamp: number }>();

  function getCachedVerification(url: string) {
    const cached = verificationCache.get(url);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.result;
    }
    return null;
  }
  ```
- Check cache before making external requests
- Store results after successful verification
- Cache key: combination of linkedinUrl + githubUrl

**Validation**:
- Verify same candidate twice within 24h → second request returns instantly
- Verify after 25h → new request is made
- Check logs: no external requests on cache hit

**Dependencies**: Task 13

---

## Task 15: Add logging and monitoring

**What**: Implement logging for rate limits, errors, and verification events

**How**:
- Add console.log statements (upgrade to proper logger in production):
  ```typescript
  console.log(`[Verification] Starting for ${linkedinUrl}, ${githubUrl}`);
  console.log(`[GitHub] Rate limit: ${remaining} requests remaining, resets at ${resetTime}`);
  console.warn(`[LinkedIn] Anti-bot detection triggered for ${linkedinUrl}`);
  console.error(`[Verification] Failed for ${url}: ${error.message}`);
  ```
- Log verification scores for analysis:
  ```typescript
  console.log(`[Verification] Score ${overallScore}: LinkedIn=${linkedinScore}, GitHub=${githubScore}`);
  ```

**Validation**:
- Trigger verification → logs appear in console
- Check rate limit logs when approaching limit
- Verify error logs on failures

**Dependencies**: Task 14

---

## Task 16: End-to-end testing

**What**: Test complete verification flow with real data

**How**:
- Upload resume with LinkedIn and GitHub URLs
- Click "Verify" button
- Observe verification process (pending → verified)
- Check badge display with correct color
- Verify score matches manual review of profiles
- Refresh page → verify result persists
- Test error scenarios:
  - No URLs in resume
  - Private LinkedIn profile
  - Non-existent GitHub user
  - Rate limit exceeded (simulate with 60+ requests)

**Validation**:
- All success criteria from proposal met
- No console errors during happy path
- Error messages are user-friendly
- Verification completes within 10 seconds for typical profiles

**Dependencies**: All previous tasks

---

## Success Criteria

After all tasks are complete, verify:
- [x] LinkedIn and GitHub URLs extracted from >90% of resumes containing them
- [x] Verify button appears on all candidate cards
- [x] Verification score (0-100) displayed with color-coded badge
- [x] Green badge for score >75, yellow for 50-75, gray for <50
- [x] Rate limiting prevents GitHub API throttling
- [x] "Unable to verify" message shown on errors
- [x] Verification completes within 10 seconds for profiles with <10 repos
- [x] Results persist in database for authenticated users
- [x] Cache prevents redundant verifications within 24 hours
- [x] All error scenarios handled gracefully
