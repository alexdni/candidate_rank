# Specification: URL Extraction

## ADDED Requirements

### Requirement: Extract LinkedIn URLs from resume text

The PDF extraction process MUST automatically identify and extract LinkedIn profile URLs from resume text during the initial parsing phase.

#### Scenario: Standard LinkedIn URL format detected

**Given** a resume PDF contains the text "linkedin.com/in/johndoe"
**When** the PDF is processed by the extractor
**Then** the extracted data SHALL include `linkedinUrl: "https://linkedin.com/in/johndoe"`
**And** the URL SHALL be normalized with https protocol
**And** trailing slashes SHALL be removed

#### Scenario: LinkedIn URL with https protocol

**Given** a resume contains "https://www.linkedin.com/in/janedoe/"
**When** the PDF is processed
**Then** the extracted data SHALL include `linkedinUrl: "https://linkedin.com/in/janedoe"`
**And** the www subdomain SHALL be normalized out

#### Scenario: Multiple LinkedIn URLs present

**Given** a resume contains multiple LinkedIn URLs
**When** the PDF is processed
**Then** only the first LinkedIn URL SHALL be extracted
**And** subsequent URLs SHALL be ignored

#### Scenario: No LinkedIn URL present

**Given** a resume contains no LinkedIn URL
**When** the PDF is processed
**Then** the `linkedinUrl` field SHALL be undefined
**And** no error SHALL be raised

---

### Requirement: Extract GitHub URLs from resume text

The PDF extraction process MUST automatically identify and extract GitHub profile URLs from resume text during the initial parsing phase.

#### Scenario: Standard GitHub URL format detected

**Given** a resume PDF contains the text "github.com/johndoe"
**When** the PDF is processed by the extractor
**Then** the extracted data SHALL include `githubUrl: "https://github.com/johndoe"`
**And** the URL SHALL be normalized with https protocol
**And** trailing slashes SHALL be removed

#### Scenario: GitHub URL with protocol

**Given** a resume contains "https://www.github.com/janedoe/"
**When** the PDF is processed
**Then** the extracted data SHALL include `githubUrl: "https://github.com/janedoe"`
**And** the www subdomain SHALL be normalized out

#### Scenario: GitHub repository URL instead of profile

**Given** a resume contains "github.com/user/repository"
**When** the PDF is processed
**Then** the extracted data SHALL include `githubUrl: "https://github.com/user"`
**And** the repository path SHALL be stripped to extract the username

#### Scenario: Multiple GitHub URLs present

**Given** a resume contains multiple GitHub URLs
**When** the PDF is processed
**Then** only the first GitHub URL SHALL be extracted
**And** subsequent URLs SHALL be ignored

#### Scenario: No GitHub URL present

**Given** a resume contains no GitHub URL
**When** the PDF is processed
**Then** the `githubUrl` field SHALL be undefined
**And** no error SHALL be raised

---

### Requirement: URL extraction integrates with existing analysis pipeline

Extracted URLs MUST be included in the candidate analysis result without breaking existing functionality.

#### Scenario: URLs included in API response

**Given** a resume is analyzed via the `/api/analyze` endpoint
**When** LinkedIn and GitHub URLs are detected
**Then** the response JSON SHALL include `linkedinUrl` and `githubUrl` fields
**And** existing fields (criteria, summary, qualificationsCount) SHALL remain unchanged

#### Scenario: URLs stored with resume metadata

**Given** an authenticated user uploads a resume to a profile
**When** the resume is saved to the database
**Then** the `resumes` table record SHALL include linkedin_url and github_url columns
**And** these values SHALL persist for future retrieval

#### Scenario: Candidate cards receive URL data

**Given** candidates are loaded in the ranking view
**When** candidate data includes LinkedIn or GitHub URLs
**Then** the Candidate interface SHALL expose linkedinUrl and githubUrl properties
**And** these SHALL be accessible to UI components

---

### Requirement: URL validation prevents malformed data

Extracted URLs MUST be validated before storage to ensure they are well-formed and accessible.

#### Scenario: Valid URLs pass validation

**Given** an extracted URL is "https://linkedin.com/in/validuser"
**When** URL validation runs
**Then** the URL SHALL be marked as valid
**And** it SHALL be included in the analysis result

#### Scenario: Malformed URLs are rejected

**Given** an extracted URL is "linkedin.com/in/user with spaces"
**When** URL validation runs
**Then** the URL SHALL be marked as invalid
**And** the `linkedinUrl` field SHALL be undefined

#### Scenario: Accessibility check times out

**Given** an extracted URL points to an inaccessible domain
**When** a HEAD request to validate the URL times out after 3 seconds
**Then** the URL SHALL still be stored (accessibility check is non-blocking)
**And** a warning SHALL be logged

---

### Requirement: URL extraction handles edge cases

The extraction process MUST handle common PDF text extraction artifacts and formatting variations.

#### Scenario: URL split across lines

**Given** a resume PDF has "linkedin.com/in/\njohndoe" due to line wrapping
**When** the PDF text is extracted
**Then** the extraction logic SHALL join consecutive URL fragments
**And** the final URL SHALL be "https://linkedin.com/in/johndoe"

#### Scenario: URL embedded in sentence

**Given** a resume contains "Connect with me at linkedin.com/in/janedoe for more info"
**When** the PDF is processed
**Then** the extracted URL SHALL be "https://linkedin.com/in/janedoe"
**And** surrounding text SHALL be ignored

#### Scenario: URL in footer or header

**Given** a resume has LinkedIn URL in the page footer
**When** the PDF is processed
**Then** the URL SHALL be extracted regardless of position in document
**And** footer text SHALL be included in the extraction scan
