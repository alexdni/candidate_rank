import { put } from '@vercel/blob';
import type { NextApiRequest, NextApiResponse } from 'next';

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

    // Check if we're in production or have blob token configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!blobToken) {
      // No blob token - use data URL fallback for development
      console.warn('BLOB_READ_WRITE_TOKEN not configured, using data URL fallback');
      return res.status(200).json({
        url: fileData, // Return the data URL directly
        filename: filename,
        dev_mode: true,
      });
    }

    // Try to upload to Vercel Blob
    try {
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'application/pdf',
      });

      return res.status(200).json({
        url: blob.url,
        filename: filename,
      });
    } catch (blobError: any) {
      // If blob upload fails (e.g., invalid token, network issues), fallback to data URL
      console.error('Blob upload failed, using data URL fallback:', blobError.message);

      return res.status(200).json({
        url: fileData, // Return the data URL directly as fallback
        filename: filename,
        dev_mode: true,
        fallback: true,
      });
    }
  } catch (error: any) {
    console.error('Upload error:', error);

    // Provide more detailed error for debugging
    const errorMessage = error?.message || 'Failed to upload file';
    const isDevelopment = process.env.NODE_ENV === 'development';

    return res.status(500).json({
      error: 'Failed to upload file',
      details: isDevelopment ? errorMessage : undefined,
    });
  }
}
