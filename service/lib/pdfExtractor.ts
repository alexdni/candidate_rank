import pdf from 'pdf-parse';

const TEXT_EXTRACT_LIMIT = 15000;

interface PDFExtractionResult {
  text: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)/gi;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)/gi;

function extractUrls(text: string): { linkedinUrl?: string; githubUrl?: string } {
  let linkedinUrl: string | undefined;
  let githubUrl: string | undefined;

  // Extract LinkedIn URL
  const linkedinMatch = LINKEDIN_REGEX.exec(text);
  if (linkedinMatch) {
    const username = linkedinMatch[1];
    linkedinUrl = `https://linkedin.com/in/${username}`;
  }

  // Reset regex index
  GITHUB_REGEX.lastIndex = 0;

  // Extract GitHub URL (extract username from full URL or repo URL)
  const githubMatch = GITHUB_REGEX.exec(text);
  if (githubMatch) {
    const username = githubMatch[1];
    githubUrl = `https://github.com/${username}`;
  }

  return { linkedinUrl, githubUrl };
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const data = await pdf(buffer);
    const fullText = data.text;

    // Enhanced cover letter detection
    const firstPageEnd = fullText.indexOf('\n\n\n') !== -1
      ? fullText.indexOf('\n\n\n')
      : Math.min(1000, fullText.length);
    const firstPageText = fullText.substring(0, firstPageEnd).toLowerCase();

    const coverKeywords = [
      'cover letter',
      'dear hiring',
      'application for',
      'position applying',
      'to whom it may concern'
    ];

    const hasCoverLetter = coverKeywords.some(keyword => firstPageText.includes(keyword));

    // If cover letter detected, try to skip first page
    let extractedText = fullText;
    if (hasCoverLetter && data.numpages > 1) {
      // Rough estimate: skip first ~1/numpages of content
      const estimatedFirstPageLength = Math.floor(fullText.length / data.numpages);
      extractedText = fullText.substring(estimatedFirstPageLength);
    }

    const text = extractedText.substring(0, TEXT_EXTRACT_LIMIT);
    const urls = extractUrls(fullText); // Extract URLs from full text before truncation

    return {
      text,
      ...urls,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
