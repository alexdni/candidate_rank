import * as cheerio from 'cheerio';

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

// In-memory cache for verification results (24 hour TTL)
const verificationCache = new Map<string, { result: VerificationDetails; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting state
let githubRequestCount = 0;
let lastGithubResetTime = Date.now();
let lastLinkedInRequestTime = 0;
const LINKEDIN_DELAY = 3000; // 3 seconds between requests

// Fetch with timeout
async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// Fetch with retry logic
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url);
    } catch (error: any) {
      if (i === retries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

// LinkedIn verification
async function verifyLinkedIn(linkedinUrl: string, keywords: string[]): Promise<{ matchScore: number; positions: { title: string; company: string }[]; skills: string[]; errors?: string[] }> {
  const errors: string[] = [];

  try {
    // Rate limiting for LinkedIn
    const now = Date.now();
    const timeSinceLastRequest = now - lastLinkedInRequestTime;
    if (timeSinceLastRequest < LINKEDIN_DELAY) {
      await new Promise(resolve => setTimeout(resolve, LINKEDIN_DELAY - timeSinceLastRequest));
    }
    lastLinkedInRequestTime = Date.now();

    const response = await fetchWithRetry(linkedinUrl);

    if (!response.ok) {
      throw new Error(`LinkedIn returned status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract positions - these selectors may need adjustment as LinkedIn changes their HTML
    const positions: { title: string; company: string }[] = [];

    // Try different selector patterns for public profiles
    $('.experience-item, .pv-entity__summary-info, [data-section="experience"]').each((_, element) => {
      const title = $(element).find('.pv-entity__summary-info-v2-heading, h3, .t-bold').first().text().trim();
      const company = $(element).find('.pv-entity__secondary-title, .t-14, .t-normal').first().text().trim();

      if (title && company) {
        positions.push({ title, company });
      }
    });

    // Extract skills
    const skills: string[] = [];
    $('.skill-name, .pv-skill-category-entity__name, [data-section="skills"] li').each((_, element) => {
      const skill = $(element).text().trim();
      if (skill) {
        skills.push(skill);
      }
    });

    if (positions.length === 0 && skills.length === 0) {
      errors.push('LinkedIn profile is private or limited');
    }

    // Match against keywords (case-insensitive)
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    let matches = 0;

    lowerKeywords.forEach(keyword => {
      // Check positions
      const positionMatch = positions.some(p =>
        p.title.toLowerCase().includes(keyword) || p.company.toLowerCase().includes(keyword)
      );

      // Check skills
      const skillMatch = skills.some(s => s.toLowerCase().includes(keyword));

      if (positionMatch || skillMatch) {
        matches++;
      }
    });

    const matchScore = keywords.length > 0 ? Math.round((matches / keywords.length) * 100) : 0;

    console.log(`[LinkedIn] Verified ${linkedinUrl}: score=${matchScore}, positions=${positions.length}, skills=${skills.length}`);

    return {
      matchScore,
      positions,
      skills,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error(`[LinkedIn] Error verifying ${linkedinUrl}:`, error.message);
    errors.push(`Network error - unable to reach LinkedIn: ${error.message}`);
    return {
      matchScore: 0,
      positions: [],
      skills: [],
      errors,
    };
  }
}

// GitHub verification
async function verifyGitHub(githubUrl: string, keywords: string[]): Promise<{ matchScore: number; repositories: { name: string; language: string; stars: number; readme: string }[]; totalCommits: number; errors?: string[] }> {
  const errors: string[] = [];

  try {
    // Extract username from URL
    const usernameMatch = githubUrl.match(/github\.com\/([\w-]+)/i);
    if (!usernameMatch) {
      throw new Error('Invalid GitHub URL');
    }
    const username = usernameMatch[1];

    // Check rate limit
    if (Date.now() - lastGithubResetTime > 3600000) {
      githubRequestCount = 0;
      lastGithubResetTime = Date.now();
    }

    if (githubRequestCount >= 55) {
      errors.push('GitHub rate limit approached - verification queued');
      return {
        matchScore: 0,
        repositories: [],
        totalCommits: 0,
        errors,
      };
    }

    // Fetch repositories
    const reposUrl = `https://api.github.com/users/${username}/repos?sort=stars&per_page=100`;
    const reposResponse = await fetchWithRetry(reposUrl);
    githubRequestCount++;

    if (!reposResponse.ok) {
      if (reposResponse.status === 404) {
        throw new Error('GitHub profile not found');
      }
      throw new Error(`GitHub API returned status ${reposResponse.status}`);
    }

    // Check rate limit headers
    const rateLimit = reposResponse.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = reposResponse.headers.get('X-RateLimit-Reset');
    if (rateLimit) {
      console.log(`[GitHub] Rate limit: ${rateLimit} requests remaining, resets at ${rateLimitReset}`);
    }

    const repos = await reposResponse.json();

    if (!Array.isArray(repos)) {
      throw new Error('Unexpected GitHub API response');
    }

    // Process repositories (limit to first 10 for README fetching)
    const repositories: { name: string; language: string; stars: number; readme: string }[] = [];
    let totalCommits = 0;
    const topRepos = repos.slice(0, 10);

    for (const repo of topRepos) {
      let readme = '';

      // Try to fetch README (don't fail if README doesn't exist)
      try {
        if (githubRequestCount < 55) {
          const readmeUrl = `https://raw.githubusercontent.com/${username}/${repo.name}/main/README.md`;
          const readmeResponse = await fetchWithTimeout(readmeUrl, 5000);
          githubRequestCount++;

          if (readmeResponse.ok) {
            readme = await readmeResponse.text();
          } else {
            // Try alternate branch names
            const masterUrl = `https://raw.githubusercontent.com/${username}/${repo.name}/master/README.md`;
            const masterResponse = await fetchWithTimeout(masterUrl, 5000);
            githubRequestCount++;

            if (masterResponse.ok) {
              readme = await masterResponse.text();
            }
          }
        }
      } catch {
        // README fetch failed, continue without it
      }

      repositories.push({
        name: repo.name,
        language: repo.language || '',
        stars: repo.stargazers_count || 0,
        readme: readme.substring(0, 1000), // Limit README length
      });

      // Count commits (approximate based on activity)
      if (repo.pushed_at) {
        const pushDate = new Date(repo.pushed_at);
        const daysSinceUpdate = (Date.now() - pushDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) {
          totalCommits += 10; // Bonus for recent activity
        }
      }
    }

    // Match against keywords
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    let matches = 0;

    lowerKeywords.forEach(keyword => {
      // Check repo names
      const nameMatch = repositories.some(r => r.name.toLowerCase().includes(keyword));

      // Check languages
      const langMatch = repositories.some(r => r.language.toLowerCase().includes(keyword));

      // Check README content
      const readmeMatch = repositories.some(r => r.readme.toLowerCase().includes(keyword));

      if (nameMatch || langMatch || readmeMatch) {
        matches++;
      }
    });

    // Apply commit activity bonus (up to 20% boost)
    const activityBonus = Math.min(totalCommits / 100, 0.2);
    const baseScore = keywords.length > 0 ? (matches / keywords.length) : 0;
    const matchScore = Math.round((baseScore + (baseScore * activityBonus)) * 100);

    console.log(`[GitHub] Verified ${githubUrl}: score=${matchScore}, repos=${repositories.length}, commits=${totalCommits}`);

    return {
      matchScore,
      repositories,
      totalCommits,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error(`[GitHub] Error verifying ${githubUrl}:`, error.message);
    errors.push(error.message);
    return {
      matchScore: 0,
      repositories: [],
      totalCommits: 0,
      errors,
    };
  }
}

// Main verification function
export async function verifyProfile(
  linkedinUrl: string | undefined,
  githubUrl: string | undefined,
  keywords: string[]
): Promise<VerificationDetails> {
  const errors: string[] = [];

  // Check if at least one URL is provided
  if (!linkedinUrl && !githubUrl) {
    throw new Error('No LinkedIn or GitHub URLs found');
  }

  // Check cache
  const cacheKey = `${linkedinUrl || 'none'}_${githubUrl || 'none'}_${keywords.join(',')}`;
  const cached = verificationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Verification] Returning cached result for ${cacheKey}`);
    return cached.result;
  }

  // Verify LinkedIn and GitHub concurrently
  const [linkedinResult, githubResult] = await Promise.all([
    linkedinUrl ? verifyLinkedIn(linkedinUrl, keywords) : Promise.resolve(null),
    githubUrl ? verifyGitHub(githubUrl, keywords) : Promise.resolve(null),
  ]);

  // Collect errors
  if (linkedinResult?.errors) {
    errors.push(...linkedinResult.errors);
  }
  if (githubResult?.errors) {
    errors.push(...githubResult.errors);
  }

  // Calculate overall score
  let overallScore = 0;
  if (linkedinResult && githubResult) {
    // Both available: 60% LinkedIn, 40% GitHub
    overallScore = Math.round(linkedinResult.matchScore * 0.6 + githubResult.matchScore * 0.4);
  } else if (linkedinResult) {
    // Only LinkedIn
    overallScore = linkedinResult.matchScore;
  } else if (githubResult) {
    // Only GitHub
    overallScore = githubResult.matchScore;
  }

  const result: VerificationDetails = {
    linkedinData: linkedinResult
      ? {
          positions: linkedinResult.positions,
          skills: linkedinResult.skills,
          matchScore: linkedinResult.matchScore,
        }
      : undefined,
    githubData: githubResult
      ? {
          repositories: githubResult.repositories,
          totalCommits: githubResult.totalCommits,
          matchScore: githubResult.matchScore,
        }
      : undefined,
    overallScore,
    verifiedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };

  // Cache the result
  verificationCache.set(cacheKey, { result, timestamp: Date.now() });

  console.log(`[Verification] Score ${overallScore}: LinkedIn=${linkedinResult?.matchScore || 'N/A'}, GitHub=${githubResult?.matchScore || 'N/A'}`);

  return result;
}
