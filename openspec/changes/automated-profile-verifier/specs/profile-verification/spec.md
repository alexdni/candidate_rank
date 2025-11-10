# Specification: Profile Verification

## ADDED Requirements

### Requirement: On-demand verification via UI trigger

Users MUST be able to initiate profile verification for any candidate by clicking a "Verify" button on the candidate card.

#### Scenario: Verify button appears on candidate cards

**Given** a candidate is displayed in the ranking view
**When** the candidate card renders
**Then** a "Verify" button SHALL be visible
**And** the button SHALL be enabled if verificationStatus is 'unverified' or 'failed'
**And** the button SHALL be disabled if verificationStatus is 'pending'

#### Scenario: User initiates verification

**Given** a candidate has LinkedIn or GitHub URLs
**When** the user clicks the "Verify" button
**Then** the verificationStatus SHALL change to 'pending'
**And** a POST request to `/api/verify` SHALL be sent with candidate data
**And** the button text SHALL change to "Verifying..."

#### Scenario: Verification completes successfully

**Given** verification is in progress for a candidate
**When** the API returns a successful response with score 85
**Then** the verificationStatus SHALL change to 'verified'
**And** the verificationScore SHALL be set to 85
**And** a verification badge SHALL appear on the card

#### Scenario: Verification fails

**Given** verification is in progress for a candidate
**When** the API returns an error response
**Then** the verificationStatus SHALL change to 'failed'
**And** an error message SHALL display "Unable to verify"
**And** the "Verify" button SHALL be re-enabled for retry

---

### Requirement: LinkedIn profile verification extracts professional data

The system MUST scrape public LinkedIn profiles to extract job titles, company names, and skills for comparison against criteria.

#### Scenario: Extract positions from LinkedIn profile

**Given** a LinkedIn URL "https://linkedin.com/in/johndoe" is provided
**When** the profile is scraped
**Then** the system SHALL extract all position titles (e.g., "Software Engineer", "Tech Lead")
**And** the system SHALL extract all company names (e.g., "Google", "Meta")
**And** the extracted data SHALL be stored in verificationDetails.linkedinData.positions

#### Scenario: Extract skills from LinkedIn profile

**Given** a LinkedIn profile has listed skills
**When** the profile is scraped
**Then** the system SHALL extract skill names (e.g., "Python", "React", "Machine Learning")
**And** the extracted data SHALL be stored in verificationDetails.linkedinData.skills

#### Scenario: Match LinkedIn data against criteria

**Given** criteria include keywords ["Python", "Machine Learning", "Senior Engineer"]
**And** LinkedIn profile shows positions "Senior Software Engineer" and skills "Python, TensorFlow"
**When** matching is performed
**Then** the system SHALL identify 3 matches: "Python", "Machine Learning" (implied by TensorFlow), "Senior Engineer"
**And** the linkedinData.matchScore SHALL be calculated as (3 matches / 3 keywords) * 100 = 100

#### Scenario: Private LinkedIn profile returns limited data

**Given** a LinkedIn URL points to a private profile
**When** the profile is scraped
**Then** the system SHALL extract whatever public data is available
**And** if no data is extractable, matchScore SHALL be 0
**And** verificationDetails.errors SHALL include "LinkedIn profile is private or limited"

---

### Requirement: GitHub profile verification validates technical experience

The system MUST fetch GitHub repository data via the public API to validate technical skills and project experience.

#### Scenario: Fetch user repositories from GitHub

**Given** a GitHub URL "https://github.com/janedoe" is provided
**When** the verification runs
**Then** the system SHALL call `GET https://api.github.com/users/janedoe/repos`
**And** the system SHALL retrieve up to 100 repositories sorted by stars descending
**And** repository names, languages, and star counts SHALL be stored

#### Scenario: Extract README content from repositories

**Given** a repository "awesome-project" is found
**When** the verification processes this repository
**Then** the system SHALL attempt to fetch `https://raw.githubusercontent.com/janedoe/awesome-project/main/README.md`
**And** if not found, it SHALL try alternate branch names (master, develop)
**And** README text SHALL be stored in verificationDetails.githubData.repositories[].readme

#### Scenario: Match repository data against criteria

**Given** criteria include keywords ["Python", "Machine Learning", "Computer Vision"]
**And** GitHub shows repos: "ml-pipeline" (Python, 50 stars), "cv-project" (Python, 30 stars)
**When** matching is performed
**Then** the system SHALL identify matches in repo names ("ml-pipeline" → "Machine Learning", "cv-project" → "Computer Vision")
**And** the system SHALL identify Python as a matching language
**And** the githubData.matchScore SHALL reflect (2 repo matches + 1 language match) / 3 keywords

#### Scenario: Score bonus for commit activity

**Given** a repository has more than 10 commits
**When** scoring is calculated
**Then** the repository SHALL receive a commit activity bonus
**And** repositories with <10 commits SHALL not receive the bonus
**And** total commit count SHALL be stored in verificationDetails.githubData.totalCommits

#### Scenario: GitHub profile not found

**Given** a GitHub URL points to a non-existent user
**When** the verification runs
**Then** the API SHALL return a 404 error
**And** verificationDetails.errors SHALL include "GitHub profile not found"
**And** githubData.matchScore SHALL be 0

---

### Requirement: Combined verification score calculated from multiple sources

The system MUST compute an overall verification score (0-100) that weights LinkedIn and GitHub data appropriately.

#### Scenario: Both LinkedIn and GitHub data available

**Given** LinkedIn verification returns matchScore of 80
**And** GitHub verification returns matchScore of 60
**When** the overall score is calculated
**Then** the overallScore SHALL be (80 * 0.6) + (60 * 0.4) = 48 + 24 = 72

#### Scenario: Only LinkedIn data available

**Given** LinkedIn verification returns matchScore of 90
**And** GitHub URL is not present in the resume
**When** the overall score is calculated
**Then** the overallScore SHALL be 90 (100% weight to LinkedIn)
**And** githubData SHALL be undefined

#### Scenario: Only GitHub data available

**Given** GitHub verification returns matchScore of 75
**And** LinkedIn URL is not present in the resume
**When** the overall score is calculated
**Then** the overallScore SHALL be 75 (100% weight to GitHub)
**And** linkedinData SHALL be undefined

#### Scenario: Neither LinkedIn nor GitHub data available

**Given** no LinkedIn or GitHub URLs are present
**When** verification is attempted
**Then** the API SHALL return an error
**And** the error message SHALL be "No LinkedIn or GitHub URLs found"
**And** verificationStatus SHALL be set to 'failed'

---

### Requirement: Verification badge displays score visually

The UI MUST display a color-coded verification badge that communicates the verification score at a glance.

#### Scenario: High verification score displays green badge

**Given** a candidate has verificationScore of 85
**When** the candidate card renders
**Then** a badge with text "✓ Verified 85/100" SHALL be displayed
**And** the badge background color SHALL be green (#10b981)

#### Scenario: Medium verification score displays yellow badge

**Given** a candidate has verificationScore of 60
**When** the candidate card renders
**Then** a badge with text "✓ Verified 60/100" SHALL be displayed
**And** the badge background color SHALL be yellow (#f59e0b)

#### Scenario: Low verification score displays gray badge

**Given** a candidate has verificationScore of 35
**When** the candidate card renders
**Then** a badge with text "✓ Verified 35/100" SHALL be displayed
**And** the badge background color SHALL be gray (#6b7280)

#### Scenario: Unverified candidate shows no badge

**Given** a candidate has verificationStatus of 'unverified'
**When** the candidate card renders
**Then** no verification badge SHALL be displayed
**And** only the "Verify" button SHALL be visible

#### Scenario: Failed verification shows error state

**Given** a candidate has verificationStatus of 'failed'
**When** the candidate card renders
**Then** a message "Unable to verify" SHALL be displayed
**And** no score badge SHALL be shown
**And** the "Verify" button SHALL be enabled for retry

---

### Requirement: Verification results persist across sessions

Verification results MUST be stored in the database and retrieved when candidates are loaded.

#### Scenario: Verification result saved to database

**Given** an authenticated user's candidate is verified with score 78
**When** the verification completes
**Then** the resume record SHALL be updated with verification_result JSONB column
**And** the verification_result SHALL contain linkedinData, githubData, overallScore, and verifiedAt timestamp

#### Scenario: Verification result loaded on page refresh

**Given** a candidate was previously verified with score 82
**When** the user refreshes the page and candidates are reloaded
**Then** the candidate SHALL have verificationStatus of 'verified'
**And** the verificationScore SHALL be 82
**And** the verification badge SHALL display without re-running verification

#### Scenario: Anonymous mode verification not persisted

**Given** a user is in anonymous mode (not signed in)
**When** verification completes
**Then** the verification result SHALL only exist in local component state
**And** the result SHALL be lost on page refresh
**And** no database update SHALL occur

---

### Requirement: Verification handles errors gracefully

The system MUST handle various error conditions without breaking the user experience.

#### Scenario: Network error during LinkedIn scraping

**Given** verification is in progress
**When** the LinkedIn scraping request times out after 10 seconds
**Then** the system SHALL retry up to 3 times with exponential backoff
**And** if all retries fail, verificationStatus SHALL be 'failed'
**And** the error message SHALL be "Network error - unable to reach LinkedIn"

#### Scenario: LinkedIn blocks request with CAPTCHA

**Given** LinkedIn returns a CAPTCHA challenge page
**When** the scraping logic detects CAPTCHA (no expected data found)
**Then** the verification SHALL fail with error "LinkedIn verification blocked - please try again later"
**And** the candidate SHALL remain in 'failed' state

#### Scenario: GitHub rate limit exceeded

**Given** GitHub API rate limit has been reached
**When** verification attempts a GitHub API call
**Then** the system SHALL check the `X-RateLimit-Remaining` header
**And** if the limit is exceeded, verification SHALL be queued
**And** the candidate verificationStatus SHALL remain 'pending'
**And** verification SHALL complete when rate limit resets

#### Scenario: HTML parsing fails for LinkedIn

**Given** LinkedIn changes their HTML structure
**When** the cheerio parser cannot find expected selectors
**Then** the system SHALL log a warning
**And** linkedinData.matchScore SHALL be 0
**And** verificationDetails.errors SHALL include "Unable to parse LinkedIn profile structure"
**And** the verification SHALL continue with GitHub data only
