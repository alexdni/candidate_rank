import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { analyzeResume, validateAnalysis, calculateQualificationsCount, CandidateResult } from '@/lib/resumeAnalyzer';

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
    const { filename, fileData } = req.body;

    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Missing filename or fileData' });
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
    let analysis = await analyzeResume(text);
    analysis = validateAnalysis(text, analysis);

    // Create candidate result
    const candidate: CandidateResult = {
      name: filename.replace('.pdf', ''),
      react_native: analysis.react_native,
      eeg_ekg_dsp: analysis.eeg_ekg_dsp,
      biomedical: analysis.biomedical,
      summary: analysis.summary,
      qualificationsCount: calculateQualificationsCount(analysis),
    };

    return res.status(200).json(candidate);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze resume' });
  }
}
