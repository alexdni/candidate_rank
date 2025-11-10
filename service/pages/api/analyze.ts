import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { analyzeResume, validateAnalysis, calculateQualificationsCount, CandidateResult, Criterion } from '@/lib/resumeAnalyzer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    const { filename, fileData, criteria } = req.body;

    if (!filename || !fileData || !criteria || !Array.isArray(criteria)) {
      return res.status(400).json({ error: 'Missing filename, fileData, or criteria' });
    }

    if (criteria.length === 0 || criteria.length > 5) {
      return res.status(400).json({ error: 'Criteria must have between 1 and 5 items' });
    }

    // Convert base64 to buffer
    const base64Data = fileData.split(',')[1] || fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Extract text from PDF
    let text: string;
    try {
      text = await extractTextFromPDF(buffer);
    } catch (pdfError: any) {
      console.error('PDF extraction error:', pdfError);
      return res.status(500).json({
        error: 'Failed to extract text from PDF',
        details: isDevelopment ? pdfError.message : undefined,
      });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from PDF' });
    }

    // Analyze resume
    let analysis;
    try {
      analysis = await analyzeResume(text, criteria as Criterion[]);
      analysis = validateAnalysis(text, analysis, criteria as Criterion[]);
    } catch (aiError: any) {
      console.error('AI analysis error:', aiError);
      return res.status(500).json({
        error: 'Failed to analyze resume with AI',
        details: isDevelopment ? aiError.message : undefined,
        hint: isDevelopment && aiError.message?.includes('API key')
          ? 'ANTHROPIC_API_KEY environment variable may not be set or is invalid.'
          : undefined
      });
    }

    // Create candidate result
    const candidate: CandidateResult = {
      name: filename.replace('.pdf', ''),
      criteria: analysis.criteria,
      summary: analysis.summary,
      qualificationsCount: calculateQualificationsCount(analysis.criteria),
    };

    return res.status(200).json(candidate);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze resume',
      details: isDevelopment ? error.message : undefined,
    });
  }
}
