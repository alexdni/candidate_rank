# Resume Screening Service

AI-powered resume screening system built with Next.js, React Native Web, and OpenAI.

## Features

- PDF resume upload with Vercel Blob storage
- AI-powered resume analysis using OpenAI
- Candidate ranking based on:
  - React Native experience
  - EEG/EKG/DSP signal processing expertise
  - Biomedical engineering background
- Real-time results display with Tailwind CSS
- React Native Web components for cross-platform compatibility

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your API keys:
```bash
cp .env.example .env
```

Then edit `.env` and add:
- `OPENAI_API_KEY`: Your OpenAI API key
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage token (auto-generated when deploying to Vercel)

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `OPENAI_API_KEY` environment variable
   - Vercel Blob token is automatically configured

## API Endpoints

### POST /api/upload
Upload a PDF resume to Vercel Blob storage.

**Request body:**
```json
{
  "filename": "john_doe.pdf",
  "fileData": "base64_encoded_pdf_data"
}
```

**Response:**
```json
{
  "url": "https://blob.vercel-storage.com/...",
  "filename": "john_doe.pdf"
}
```

### POST /api/analyze
Analyze a resume and extract qualifications.

**Request body:**
```json
{
  "filename": "john_doe.pdf",
  "fileData": "base64_encoded_pdf_data"
}
```

**Response:**
```json
{
  "name": "john_doe",
  "react_native": true,
  "eeg_ekg_dsp": false,
  "biomedical": true,
  "summary": "Experienced React Native developer with biomedical background",
  "qualificationsCount": 2
}
```

## Tech Stack

- **Frontend**: React Native Web, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4
- **Storage**: Vercel Blob
- **Deployment**: Vercel
- **PDF Processing**: pdf-parse

## Project Structure

```
service/
├── app/                    # Next.js app directory
│   ├── components/        # React Native Web components
│   │   ├── CandidateRanking.tsx
│   │   └── UploadSection.tsx
│   ├── globals.css        # Tailwind CSS styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Core business logic
│   ├── pdfExtractor.ts   # PDF text extraction
│   └── resumeAnalyzer.ts # AI resume analysis
├── pages/
│   └── api/              # API routes
│       ├── analyze.ts    # Resume analysis endpoint
│       └── upload.ts     # File upload endpoint
├── public/               # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── package.json          # Dependencies
├── tailwind.config.js    # Tailwind CSS config
└── tsconfig.json         # TypeScript config
```
