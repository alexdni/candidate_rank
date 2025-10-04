import pdf from 'pdf-parse';

const TEXT_EXTRACT_LIMIT = 15000;

interface PDFExtractionResult {
  text: string;
  skipFirstPage: boolean;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
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

    return extractedText.substring(0, TEXT_EXTRACT_LIMIT);
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
