# Candidate Ranking System

AI-powered resume screening system for identifying qualified candidates based on React Native, EEG/EKG/DSP, and Biomedical engineering expertise.

## Project Overview

This project consists of two main components:

1. **Python CLI Tool** (`screening.py`) - Original batch processing tool for local resume analysis
2. **Web Application** (`/service`) - Modern web-based screening system deployable to Vercel

## Architecture & Design

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Frontend (React Native Web + Tailwind CSS)            │ │
│  │  - File Upload Interface                               │ │
│  │  - Real-time Candidate Ranking Display                 │ │
│  │  - Summary Statistics Dashboard                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Layer (Next.js API Routes)                        │ │
│  │  - POST /api/upload   → Vercel Blob Storage            │ │
│  │  - POST /api/analyze  → Resume Analysis Pipeline       │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Business Logic Layer                                  │ │
│  │  - PDF Text Extraction (pdf-parse)                     │ │
│  │  - Cover Letter Detection & Removal                    │ │
│  │  - AI Analysis (OpenAI GPT-4)                          │ │
│  │  - Secondary Validation (keyword matching)             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Resume Analysis Pipeline

1. **PDF Ingestion**
   - Accept PDF uploads (max 10MB)
   - Store originals in Vercel Blob Storage
   - Extract text using pdf-parse library

2. **Text Preprocessing**
   - Detect cover letters using keyword analysis
   - Skip cover letter pages if detected
   - Limit extraction to first 15,000 characters

3. **AI Analysis (Primary)**
   - Send preprocessed text to OpenAI GPT-4
   - Use conservative prompt engineering
   - Extract structured JSON response with:
     - `react_native`: boolean
     - `eeg_ekg_dsp`: boolean
     - `biomedical`: boolean
     - `summary`: one-sentence qualification summary

4. **Validation (Secondary)**
   - Cross-check AI results against raw text
   - Verify React Native mentions (not just "React")
   - Confirm medical + signal processing co-occurrence for EEG/EKG/DSP
   - Validate biomedical engineering keywords
   - Override false positives

5. **Ranking & Display**
   - Calculate qualifications count (0-3)
   - Sort candidates by count (descending)
   - Highlight top candidates (2+ qualifications)
   - Display summary statistics

### Technology Stack

#### Web Application (`/service`)
- **Frontend**: React Native Web, Tailwind CSS
- **Backend**: Next.js 14 (App Router + API Routes)
- **AI**: OpenAI GPT-4 API
- **Storage**: Vercel Blob
- **Deployment**: Vercel Serverless Functions
- **Language**: TypeScript

#### CLI Tool (`screening.py`)
- **Language**: Python 3.x
- **PDF Processing**: PyMuPDF (fitz)
- **AI**: OpenAI API (compatible with local LM Studio)
- **Output**: CSV reports

## Getting Started

### Web Application

1. Navigate to service directory:
```bash
cd service
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add:
- `OPENAI_API_KEY`: Your OpenAI API key

4. Run development server:
```bash
npm run dev
```

5. Deploy to Vercel:
```bash
vercel
```

See [service/README.md](service/README.md) for detailed documentation.

### Python CLI Tool

1. Install dependencies:
```bash
pip install pymupdf openai
```

2. Configure API endpoint in `screening.py`:
```python
API_BASE = "http://localhost:1234/v1"  # For local LM Studio
# OR
API_BASE = "https://api.openai.com/v1"  # For OpenAI
```

3. Place PDF resumes in `/source` folder

4. Run screening:
```bash
python screening.py
```

5. Review generated CSV report

## Design Decisions

### Why Two Implementations?

- **Python CLI**: Fast batch processing for local environments, works with local LLMs (LM Studio)
- **Web App**: User-friendly interface, scalable cloud deployment, real-time results

### Why OpenAI + Validation?

- **AI Analysis**: Understands context, interprets experience descriptions
- **Keyword Validation**: Catches hallucinations, enforces strict requirements
- **Hybrid Approach**: Combines AI flexibility with rule-based reliability

### Why React Native Web?

- Cross-platform component reusability
- Native-like performance
- Future mobile app expansion possibility
- Consistent styling with Tailwind CSS

### Why Vercel?

- Serverless functions scale automatically
- Integrated Blob storage for PDFs
- Zero-config deployment
- Edge network for global performance

## Qualification Criteria

### React Native ✓
- Explicit "React Native" or "react-native" mentions required
- React.js alone does not qualify
- Mobile app development experience

### EEG/EKG/DSP ✓
- Medical signal terms: EEG, EKG, electrocardiogram, electroencephalogram
- AND processing terms: signal processing, DSP, filter design, feature extraction
- Both categories required

### Biomedical Engineering ✓
- Biomedical engineering degree
- Medical device development
- FDA regulations experience
- Clinical trial involvement
- Physiological monitoring systems

## Output & Results

### Web Application
- Real-time candidate ranking display
- Visual qualification badges
- Summary statistics dashboard
- Sortable by qualifications count

### CLI Tool
- CSV report with columns:
  - Name
  - Qualifications Count
  - React Native (*)
  - EEG/EKG/DSP (*)
  - Biomedical (*)
  - Summary

## Security & Privacy

- PDFs stored in Vercel Blob with access control
- No candidate data stored in databases
- Environment variables for API keys
- Client-side file validation

## Future Enhancements

- [ ] Bulk resume upload (zip files)
- [ ] Export results to CSV/PDF
- [ ] Customizable qualification criteria
- [ ] Interview scheduling integration
- [ ] Candidate profile pages
- [ ] Email notifications
- [ ] Multi-tenant support

## License

MIT

## Author

Built with Claude Code
