# Specification: Rate Limiting

## ADDED Requirements

### Requirement: GitHub API rate limits enforced

The system MUST respect GitHub API rate limits to prevent throttling and ensure continued service availability.

#### Scenario: Check rate limit before making requests

**Given** the system is about to verify a GitHub profile
**When** the verification logic initiates
**Then** the system SHALL check the current GitHub API rate limit status
**And** if remaining requests < 5, the verification SHALL be queued
**And** the system SHALL wait until the rate limit resets

#### Scenario: Rate limit header tracked

**Given** a GitHub API request returns headers
**When** the response is received
**Then** the system SHALL read `X-RateLimit-Remaining` header
**And** the system SHALL read `X-RateLimit-Reset` timestamp
**And** these values SHALL be stored in memory for rate limit enforcement

#### Scenario: Unauthenticated rate limit of 60 per hour enforced

**Given** the system makes GitHub API requests without authentication
**When** 60 requests have been made within the current hour
**Then** subsequent verification requests SHALL be queued
**And** verificationStatus SHALL remain 'pending'
**And** requests SHALL resume processing after the rate limit reset time

#### Scenario: User notified of rate limit delay

**Given** a verification is queued due to rate limiting
**When** the user views the candidate card
**Then** the verificationStatus SHALL be 'pending'
**And** a message SHALL display "Verification pending (rate limited)"
**And** the button SHALL show "Queued" or similar indicator

---

### Requirement: Verification queue manages pending requests

The system MUST queue verification requests when rate limits are approached to ensure fair processing order.

#### Scenario: Verification request added to queue

**Given** GitHub rate limit has been exceeded
**When** a user clicks "Verify" on a candidate
**Then** the verification request SHALL be added to an in-memory queue
**And** the candidate verificationStatus SHALL be set to 'pending'
**And** the queue position SHALL be tracked

#### Scenario: Queue processes requests in FIFO order

**Given** the queue contains 3 verification requests: [A, B, C]
**When** rate limit resets and processing resumes
**Then** requests SHALL be processed in order: A, then B, then C
**And** each candidate's verificationStatus SHALL update to 'verified' or 'failed' in sequence

#### Scenario: Queue persists across page reloads

**Given** verification requests are queued
**When** the user refreshes the page
**Then** the queue SHALL be lost (in-memory only)
**And** candidates SHALL remain in 'pending' state
**And** users MAY click "Verify" again to re-queue

#### Scenario: Queue cleared on application restart

**Given** the Next.js application restarts
**When** the server process reloads
**Then** the verification queue SHALL be reset to empty
**And** any pending verifications SHALL remain in 'pending' state
**And** no automatic retry SHALL occur

---

### Requirement: LinkedIn scraping rate limited to prevent blocking

The system MUST implement delays between LinkedIn requests to avoid being blocked by anti-bot measures.

#### Scenario: Minimum delay between LinkedIn requests

**Given** the system has just completed a LinkedIn scraping request
**When** another LinkedIn verification is queued
**Then** the system SHALL wait at least 3 seconds before the next request
**And** this delay SHALL apply across all verification requests

#### Scenario: Exponential backoff on suspected blocking

**Given** a LinkedIn request returns a CAPTCHA or 429 status
**When** the system detects potential blocking
**Then** the delay before the next request SHALL double (3s → 6s → 12s)
**And** the backoff SHALL reset to 3s after a successful request

#### Scenario: Concurrent LinkedIn requests limited

**Given** multiple verification requests are queued
**When** processing the queue
**Then** only 1 LinkedIn request SHALL be active at any given time
**And** subsequent requests SHALL wait for the current one to complete

---

### Requirement: Timeout limits prevent hanging requests

The system MUST enforce timeout limits on external requests to prevent indefinite blocking.

#### Scenario: LinkedIn scraping timeout after 10 seconds

**Given** a LinkedIn scraping request is initiated
**When** 10 seconds elapse without a response
**Then** the request SHALL be aborted
**And** the system SHALL retry up to 3 times
**And** if all retries fail, the verification SHALL fail with error "LinkedIn request timed out"

#### Scenario: GitHub API timeout after 10 seconds

**Given** a GitHub API request is initiated
**When** 10 seconds elapse without a response
**Then** the request SHALL be aborted
**And** the system SHALL retry up to 3 times
**And** if all retries fail, the verification SHALL fail with error "GitHub request timed out"

#### Scenario: Overall verification timeout after 30 seconds

**Given** a verification request is initiated
**When** 30 seconds elapse without completion
**Then** the entire verification SHALL be aborted
**And** the verificationStatus SHALL be set to 'failed'
**And** the error message SHALL be "Verification timed out - please try again"

---

### Requirement: Caching reduces redundant requests

The system MUST cache verification results to avoid re-verifying the same profile repeatedly.

#### Scenario: Verification result cached for 24 hours

**Given** a candidate profile is verified at 2:00 PM
**When** the user clicks "Verify" again at 3:00 PM (1 hour later)
**Then** the cached result SHALL be returned immediately
**And** no external API calls SHALL be made
**And** the verifiedAt timestamp SHALL remain 2:00 PM

#### Scenario: Cache expires after 24 hours

**Given** a candidate profile was verified 25 hours ago
**When** the user clicks "Verify" again
**Then** the cached result SHALL be discarded
**And** a new verification request SHALL be initiated
**And** the verifiedAt timestamp SHALL be updated to the current time

#### Scenario: Cache key based on profile URLs

**Given** two candidates have the same GitHub URL "https://github.com/johndoe"
**When** the first candidate is verified
**Then** the result SHALL be cached by GitHub URL
**And** when the second candidate is verified, the cached result SHALL be reused
**And** both candidates SHALL have the same githubData

#### Scenario: Cache invalidated on manual refresh

**Given** a candidate has cached verification data
**When** the user explicitly clicks "Verify" button again
**Then** the system SHALL offer a "Force Refresh" option (future enhancement)
**And** in initial version, cached data SHALL be returned without refresh option

---

### Requirement: Concurrent verification limited

The system MUST limit the number of simultaneous verification requests to prevent resource exhaustion.

#### Scenario: Maximum 3 concurrent verifications

**Given** 5 verification requests are queued
**When** processing begins
**Then** only 3 verifications SHALL run concurrently
**And** the remaining 2 SHALL wait in the queue
**And** as each completes, the next queued request SHALL start

#### Scenario: User-initiated verifications prioritized

**Given** the queue contains background verification requests
**When** a user manually clicks "Verify" on a candidate
**Then** the user-initiated request SHALL be added to the front of the queue
**And** it SHALL be processed before older background requests

---

### Requirement: Rate limit monitoring logged

The system MUST log rate limit status for monitoring and debugging.

#### Scenario: Rate limit warnings logged

**Given** GitHub API rate limit drops below 10 remaining requests
**When** a verification request completes
**Then** a warning SHALL be logged: "GitHub rate limit low: X requests remaining"
**And** the log SHALL include the reset timestamp

#### Scenario: Rate limit exceeded logged as error

**Given** GitHub API returns 403 Forbidden with rate limit exceeded
**When** the response is received
**Then** an error SHALL be logged: "GitHub rate limit exceeded, queuing requests"
**And** the log SHALL include how many requests are queued

#### Scenario: LinkedIn blocking logged

**Given** LinkedIn returns a CAPTCHA or 429 status
**When** the response is detected
**Then** a warning SHALL be logged: "LinkedIn anti-bot detection triggered"
**And** the log SHALL include the candidate's LinkedIn URL (for debugging patterns)
