import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyProfile, VerificationDetails } from '@/lib/profileVerifier';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdfExtractor';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    let { linkedinUrl, githubUrl, keywords, resumeId, blobUrl } = req.body;

    // If URLs are missing but we have a blobUrl, try to extract them from the PDF
    if ((!linkedinUrl && !githubUrl) && blobUrl) {
      try {
        console.log(`[Verify] No URLs provided, fetching PDF from ${blobUrl} to extract URLs`);

        // Fetch the PDF from blob storage
        const pdfResponse = await fetch(blobUrl);
        if (!pdfResponse.ok) {
          throw new Error('Failed to fetch PDF from blob storage');
        }

        const arrayBuffer = await pdfResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text and URLs from PDF
        const extraction = await extractTextFromPDF(buffer);
        linkedinUrl = extraction.linkedinUrl;
        githubUrl = extraction.githubUrl;

        console.log(`[Verify] Extracted URLs from PDF: LinkedIn=${linkedinUrl}, GitHub=${githubUrl}`);
      } catch (extractError: any) {
        console.error('[Verify] Error extracting URLs from PDF:', extractError);
        // Continue - will fail validation below if still no URLs
      }
    }

    // Validation
    if (!linkedinUrl && !githubUrl) {
      return res.status(400).json({
        error: 'No LinkedIn or GitHub URLs found in resume',
        verificationStatus: 'failed',
      });
    }

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    // Perform verification
    let verificationDetails: VerificationDetails;
    try {
      verificationDetails = await verifyProfile(linkedinUrl, githubUrl, keywords);
    } catch (verifyError: any) {
      console.error('Verification error:', verifyError);
      return res.status(500).json({
        error: verifyError.message || 'Verification failed',
        verificationStatus: 'failed',
        details: isDevelopment ? verifyError.message : undefined,
      });
    }

    // If resumeId is provided, update the database (authenticated users)
    if (resumeId) {
      try {
        const supabase = createClient();

        // Verify user is authenticated
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!authError && user) {
          // Update resume with verification result
          const { error: updateError } = await supabase
            .from('resumes')
            .update({
              verification_result: verificationDetails,
              verified_at: new Date().toISOString(),
            })
            .eq('id', resumeId);

          if (updateError) {
            console.error('Error updating resume with verification result:', updateError);
            // Don't fail the request - user still gets verification result
          }
        }
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        // Don't fail the request - user still gets verification result
      }
    }

    // Return successful verification result
    return res.status(200).json({
      verificationStatus: 'verified',
      verificationScore: verificationDetails.overallScore,
      verificationDetails,
    });
  } catch (error: any) {
    console.error('Unexpected verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify profile',
      verificationStatus: 'failed',
      details: isDevelopment ? error.message : undefined,
    });
  }
}
