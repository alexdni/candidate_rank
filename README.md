# Candidate Ranking System

AI-powered resume screening system with customizable criteria for identifying qualified candidates based on your specific job requirements.

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
│  │  - Dynamic Criteria Configuration (1-5 criteria)       │ │
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
│  │  - AI Analysis (OpenAI GPT-4 with dynamic prompts)     │ │
│  │  - Secondary Validation (keyword matching)             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Resume Analysis Pipeline

1. **Criteria Definition**
   - User defines 1-5 custom screening criteria
   - Each criterion includes:
     - Name (e.g., "React Native")
     - Description (e.g., "Must have explicit React Native experience")
     - Optional validation keywords (e.g., ["react native", "react-native"])

2. **PDF Ingestion**
   - Accept PDF uploads (max 10MB)
   - Store originals in Vercel Blob Storage
   - Extract text using pdf-parse library

3. **Text Preprocessing**
   - Detect cover letters using keyword analysis
   - Skip cover letter pages if detected
   - Limit extraction to first 15,000 characters

4. **AI Analysis (Primary)**
   - Send preprocessed text to OpenAI GPT-4
   - Dynamically generate prompt from user-defined criteria
   - Use conservative prompt engineering
   - Extract structured JSON response with:
     - `criteria`: object with boolean values for each criterion
     - `summary`: one-sentence qualification summary

5. **Validation (Secondary)**
   - Cross-check AI results against raw text
   - For each criterion with keywords defined:
     - Verify at least one keyword appears in resume
     - Override false positives from AI

6. **Ranking & Display**
   - Calculate qualifications count (0 to N criteria)
   - Sort candidates by count (descending)
   - Highlight top candidates (50%+ qualifications)
   - Display dynamic summary statistics for each criterion

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

### Why Dynamic Criteria System?

- **Flexibility**: Adapt screening to any job role or requirement
- **Customization**: Define 1-5 criteria specific to your needs
- **Validation**: Optional keywords prevent AI hallucinations
- **Scalability**: No code changes needed for different screening scenarios

### Why OpenAI + Validation?

- **AI Analysis**: Understands context, interprets experience descriptions dynamically
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

## Screening Criteria

### Dynamic Criteria System

The web application supports **1-5 custom criteria** that you define per screening session. Default criteria include:

#### React Native ✓
- **Description**: Must have explicit React Native experience (not just React/JavaScript)
- **Keywords**: react native, react-native
- **Validation**: Explicit mentions required; React.js alone does not qualify

#### EEG/EKG/DSP ✓
- **Description**: Signal processing experience with medical applications (EEG, EKG, biomedical signals)
- **Keywords**: eeg, ekg, electrocardiogram, electroencephalogram, signal processing, dsp
- **Validation**: Medical signal terms AND processing terms both required

#### Biomedical Engineering ✓
- **Description**: Biomedical engineering degree, medical device development, or clinical experience
- **Keywords**: biomedical engineering, medical device, fda regulations, clinical trial
- **Validation**: At least one biomedical-specific keyword required

### Creating Custom Criteria

When using the web app, you can:
1. Define your own criteria names and descriptions
2. Add optional validation keywords (comma-separated)
3. Mix and match up to 5 criteria for any role
4. Examples: "Python expertise", "Cloud architecture (AWS/Azure)", "Machine learning", "Leadership experience"

## Output & Results

### Web Application
- Real-time candidate ranking display
- Dynamic visual qualification badges based on defined criteria
- Summary statistics dashboard showing counts for each criterion
- Automatic sorting by qualifications count (descending)
- Color-coded highlighting for top candidates

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
- [x] ~~Customizable qualification criteria~~ ✅ **Completed**
- [ ] Save/load criteria templates
- [ ] Interview scheduling integration
- [ ] Candidate profile pages
- [ ] Email notifications
- [ ] Multi-tenant support
- [ ] Batch processing API endpoint

## License

MIT

## Author

Built with Claude Code
