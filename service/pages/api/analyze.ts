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
    const text = await extractTextFromPDF(buffer);

    if (!text.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from PDF' });
    }

    // Analyze resume
    let analysis = await analyzeResume(text, criteria as Criterion[]);
    analysis = validateAnalysis(text, analysis, criteria as Criterion[]);

    // Create candidate result
    const candidate: CandidateResult = {
      name: filename.replace('.pdf', ''),
      criteria: analysis.criteria,
      summary: analysis.summary,
      qualificationsCount: calculateQualificationsCount(analysis.criteria),
    };

    return res.status(200).json(candidate);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze resume' });
  }
}
