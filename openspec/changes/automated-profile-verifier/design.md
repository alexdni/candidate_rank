# Design: Automated Profile Verifier

## Architecture Overview

The automated profile verifier extends the existing resume analysis pipeline with a post-analysis verification step that validates candidate claims against public online profiles.

### Component Architecture

```
┌─────────────┐
│   Upload    │
│   Resume    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  PDF Extractor  │ ← Enhanced to extract URLs
│  (lib/pdfE...) │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  AI Analyzer    │
│  (lib/resumeA..)│
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Candidate Card  │ ← New "Verify" button
└──────┬──────────┘
       │ (on-demand)
       ▼
┌─────────────────┐
│ Verify API      │ ← New endpoint
│ (/api/verify)   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Profile Verifier│ ← New verification engine
│ (lib/profileV..)│
└──────┬──────────┘
       │
       ├─────────────┐
       ▼             ▼
┌──────────┐  ┌──────────┐
│ LinkedIn │  │  GitHub  │
│ Scraper  │  │   API    │
└──────────┘  └──────────┘
```

## Data Model Extensions

### Candidate Interface Enhancement

```typescript
export interface Candidate {
  name: string;
  criteria: Record<string, boolean>;
  summary: string;
  qualificationsCount: number;
  blobUrl?: string;
  // NEW FIELDS
  linkedinUrl?: string;
  githubUrl?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'failed';
  verificationScore?: number; // 0-100
  verificationDetails?: VerificationDetails;
}

export interface VerificationDetails {
  linkedinData?: {
    positions: { title: string; company: string; duration?: string }[];
    skills: string[];
    matchScore: number; // 0-100
  };
  githubData?: {
    repositories: { name: string; language: string; stars: number; readme: string }[];
    totalCommits: number;
    matchScore: number; // 0-100
  };
  overallScore: number; // 0-100
  verifiedAt: string; // ISO timestamp
  errors?: string[];
}
```

### Database Schema Extension

```sql
-- Add verification columns to resumes table
ALTER TABLE resumes
ADD COLUMN linkedin_url TEXT,
ADD COLUMN github_url TEXT,
ADD COLUMN verification_result JSONB,
ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS resumes_verified_at_idx ON resumes(verified_at DESC);
```

## URL Extraction Strategy

### Pattern Matching

Extract URLs during PDF text extraction using regex patterns:

```typescript
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/gi;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/gi;
```

**Edge Cases:**
- URLs split across lines (PDF extraction artifact)
- Shortened URLs (bit.ly, etc.) - not supported in v1
- Email addresses mistaken for URLs - filter with domain validation

### Extraction Pipeline

1. Extract full resume text via `pdf-parse`
2. Run regex patterns to find LinkedIn/GitHub URLs
3. Normalize URLs (add https://, remove trailing slashes)
4. Validate accessibility (basic HEAD request)
5. Store in candidate metadata

## Verification Engine Design

### LinkedIn Scraping

**Approach:** Use `cheerio` to parse public LinkedIn profile HTML

**Data Extraction:**
1. Fetch public profile page via `fetch(linkedinUrl)`
2. Parse HTML with `cheerio`
3. Extract positions: `.experience-section .pv-entity__summary-info`
4. Extract skills: `.pv-skill-category-entity__name`
5. Match against criteria keywords (case-insensitive)

**Scoring Algorithm:**
```typescript
linkedinScore = (
  (matchedPositionTitles / totalCriteriaKeywords) * 0.4 +
  (matchedCompanies / totalCriteriaKeywords) * 0.3 +
  (matchedSkills / totalCriteriaKeywords) * 0.3
) * 100
```

**Limitations:**
- LinkedIn may block requests (user-agent, rate limiting)
- Profile structure may change (brittle DOM selectors)
- Private profiles return limited data
- CAPTCHA challenges on suspicious traffic

### GitHub API Integration

**Approach:** Use GitHub REST API v3 (unauthenticated)

**Data Extraction:**
1. Extract username from GitHub URL
2. Fetch user repos: `GET https://api.github.com/users/{username}/repos`
3. For each repo:
   - Extract name, language, stars, description
   - Fetch README: `GET https://raw.githubusercontent.com/{user}/{repo}/main/README.md`
4. Match repo names, languages, README content against criteria keywords

**Scoring Algorithm:**
```typescript
githubScore = (
  (reposMatchingKeywords / totalRepos) * 0.5 +
  (languagesMatchingKeywords / totalCriteriaKeywords) * 0.3 +
  (commitActivityBonus) * 0.2  // bonus for active repos (>10 commits)
) * 100
```

**Rate Limiting:**
- 60 requests/hour unauthenticated
- Check `X-RateLimit-Remaining` header
- Queue requests if limit approaching
- Cache results for 24 hours

### Combined Verification Score

```typescript
overallScore = (linkedinScore * 0.6 + githubScore * 0.4)
```

**Rationale:** LinkedIn provides broader professional background (60%), while GitHub validates technical claims (40%).

## Rate Limiting Implementation

### Strategy

Use in-memory queue with exponential backoff:

```typescript
class VerificationQueue {
  private queue: VerificationRequest[] = [];
  private processing = false;
  private githubRequestCount = 0;
  private lastResetTime = Date.now();

  async enqueue(request: VerificationRequest) {
    this.queue.push(request);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();

      // Reset counter every hour
      if (Date.now() - this.lastResetTime > 3600000) {
        this.githubRequestCount = 0;
        this.lastResetTime = Date.now();
      }

      // Throttle if approaching limit
      if (this.githubRequestCount >= 55) {
        await this.sleep(60000); // wait 1 minute
      }

      await this.verifyCandidate(request);
      this.githubRequestCount += request.githubRepoCount || 1;
    }
    this.processing = false;
  }
}
```

## UI Integration

### Verify Button

Add to each candidate card:

```tsx
<TouchableOpacity
  onPress={() => handleVerify(candidate)}
  style={{ backgroundColor: '#3b82f6', padding: 8, borderRadius: 6 }}
  disabled={candidate.verificationStatus === 'pending'}
>
  <Text style={{ color: 'white', fontWeight: '600' }}>
    {candidate.verificationStatus === 'pending' ? 'Verifying...' : 'Verify'}
  </Text>
</TouchableOpacity>
```

### Verification Badge

Display badge with color-coded score:

```tsx
{candidate.verificationStatus === 'verified' && (
  <View style={{
    backgroundColor: getScoreColor(candidate.verificationScore),
    padding: 4,
    borderRadius: 4
  }}>
    <Text style={{ color: 'white', fontSize: 12 }}>
      ✓ Verified {candidate.verificationScore}/100
    </Text>
  </View>
)}

function getScoreColor(score: number) {
  if (score >= 75) return '#10b981'; // green
  if (score >= 50) return '#f59e0b'; // yellow
  return '#6b7280'; // gray
}
```

## Error Handling

### Failure Scenarios

1. **No URLs found**: Display "No LinkedIn/GitHub URLs found"
2. **Private profiles**: Display "Profile is private or inaccessible"
3. **Rate limiting**: Queue request, show "Verification pending (rate limited)"
4. **Network errors**: Display "Verification failed - network error"
5. **Parsing errors**: Display "Unable to verify - profile format unrecognized"

### Retry Logic

- Retry network errors up to 3 times with exponential backoff
- Do not retry parsing errors or private profiles
- Cache failures to avoid repeated attempts

## Security Considerations

### LinkedIn ToS Compliance

LinkedIn's Terms of Service prohibit automated scraping. Mitigations:
- Only scrape public profiles
- Respect robots.txt
- Add reasonable delays between requests (2-3 seconds)
- Use authentic browser user-agent
- Limit to on-demand verification (not batch scraping)

**Risk Assessment:** Low-to-moderate risk. Public profile scraping is common practice, but LinkedIn may block IPs with suspicious patterns.

### GitHub API Compliance

GitHub API ToS allow unauthenticated access for public data:
- Stay within rate limits (60/hour)
- Use `User-Agent` header identifying the application
- Cache results to minimize requests

**Risk Assessment:** Low risk. Using public API as intended.

### Data Privacy

- Do not store full profile HTML/JSON (only extracted metadata)
- Respect candidate privacy by only verifying public data
- Allow candidates to opt-out (future enhancement)

## Performance Considerations

### Optimization Strategies

1. **Parallel Requests**: Verify LinkedIn and GitHub concurrently
2. **Caching**: Cache verification results for 24 hours
3. **Selective Scraping**: Only fetch first 10 GitHub repos (sorted by stars)
4. **Timeout Limits**: Abort verification after 15 seconds
5. **Background Processing**: Use async queue to avoid blocking UI

### Expected Performance

- LinkedIn scraping: 2-4 seconds
- GitHub API (10 repos): 3-6 seconds
- Total verification time: 5-10 seconds

## Testing Strategy

### Unit Tests

- URL extraction from sample resumes (various formats)
- LinkedIn HTML parsing with fixture data
- GitHub API response mocking
- Scoring algorithm edge cases (0 matches, 100% matches)

### Integration Tests

- Full verification flow with mock external services
- Rate limiting queue behavior
- Error handling scenarios

### Manual Testing

- Test with real LinkedIn/GitHub profiles
- Verify score accuracy against manual review
- Test rate limiting with multiple rapid verifications

## Rollout Plan

1. **Phase 1**: URL extraction and storage (no UI changes)
2. **Phase 2**: Backend verification API with manual testing
3. **Phase 3**: UI integration (Verify button + badge)
4. **Phase 4**: Rate limiting and caching
5. **Phase 5**: Error handling refinements based on production data
