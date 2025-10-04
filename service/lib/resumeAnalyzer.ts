import OpenAI from 'openai';

export interface ResumeAnalysis {
  react_native: boolean;
  eeg_ekg_dsp: boolean;
  biomedical: boolean;
  summary: string;
}

export interface CandidateResult extends ResumeAnalysis {
  name: string;
  qualificationsCount: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseJSONResponse(responseText: string): ResumeAnalysis {
  try {
    return JSON.parse(responseText);
  } catch (error) {
    // Handle markdown code blocks
    const jsonMatch = responseText.match(/```json\n(.*?)\n```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Find first JSON-like structure
    const jsonStr = responseText.match(/\{.*\}/s);
    if (jsonStr) {
      return JSON.parse(jsonStr[0]);
    }

    throw new Error('No valid JSON found in response');
  }
}

export async function analyzeResume(text: string): Promise<ResumeAnalysis> {
  const prompt = `Analyze this resume and respond in JSON format. Check for:
1. React Native experience - must include explicit "React Native" mentions (not just React/JavaScript)
2. EEG/EKG/DSP processing - look for signal processing terms paired with medical applications
3. Biomedical engineering - degree, medical devices, or clinical collaborations

Important rules:
- React experience alone doesn't count as React Native
- General programming terms don't count as DSP experience
- School projects count if substantial (3+ months)
- Be conservative - only mark true if clear evidence exists

Return format:
{
    "react_native": boolean,
    "eeg_ekg_dsp": boolean,
    "biomedical": boolean,
    "summary": "1-sentence qualification summary"
}

Resume text:
${text}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert technical recruiter. Be precise and conservative in your analysis.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content || '{}';
  return parseJSONResponse(responseText);
}

export function validateAnalysis(text: string, analysis: ResumeAnalysis): ResumeAnalysis {
  const textLower = text.toLowerCase();

  // React Native validation
  if (analysis.react_native) {
    if (!textLower.includes('react native') && !textLower.includes('react-native')) {
      analysis.react_native = false;
    }
  }

  // EEG/EKG/DSP validation
  if (analysis.eeg_ekg_dsp) {
    const medicalTerms = ['eeg', 'ekg', 'electrocardiogram', 'electroencephalogram', 'biomedical signals'];
    const processingTerms = ['signal processing', 'dsp', 'filter design', 'feature extraction'];

    const hasMedical = medicalTerms.some(term => textLower.includes(term));
    const hasProcessing = processingTerms.some(term => textLower.includes(term));

    if (!(hasMedical && hasProcessing)) {
      analysis.eeg_ekg_dsp = false;
    }
  }

  // Biomedical validation
  if (analysis.biomedical) {
    const bioTerms = [
      'biomedical engineering',
      'medical device',
      'fda regulations',
      'clinical trial',
      'physiological monitoring'
    ];
    if (!bioTerms.some(term => textLower.includes(term))) {
      analysis.biomedical = false;
    }
  }

  return analysis;
}

export function calculateQualificationsCount(analysis: ResumeAnalysis): number {
  return [
    analysis.react_native,
    analysis.eeg_ekg_dsp,
    analysis.biomedical
  ].filter(Boolean).length;
}
