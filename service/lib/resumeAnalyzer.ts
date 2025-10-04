import OpenAI from 'openai';

export interface Criterion {
  id: string;
  name: string;
  description: string;
  keywords?: string[];
}

export interface ResumeAnalysis {
  criteria: Record<string, boolean>;
  summary: string;
}

export interface CandidateResult {
  name: string;
  criteria: Record<string, boolean>;
  summary: string;
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

export async function analyzeResume(text: string, criteria: Criterion[]): Promise<ResumeAnalysis> {
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c.name} - ${c.description}`).join('\n');
  const criteriaFields = criteria.map(c => `    "${c.id}": boolean`).join(',\n');

  const prompt = `Analyze this resume and respond in JSON format. Check for the following criteria:
${criteriaList}

Important rules:
- Be specific and look for explicit mentions or clear evidence
- School projects count if substantial (3+ months)
- Be conservative - only mark true if clear evidence exists
- Don't make assumptions based on general skills

Return format:
{
    "criteria": {
${criteriaFields}
    },
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

export function validateAnalysis(
  text: string,
  analysis: ResumeAnalysis,
  criteria: Criterion[]
): ResumeAnalysis {
  const textLower = text.toLowerCase();

  // Validate each criterion using its keywords if provided
  criteria.forEach(criterion => {
    if (analysis.criteria[criterion.id] && criterion.keywords && criterion.keywords.length > 0) {
      const hasKeyword = criterion.keywords.some(keyword => textLower.includes(keyword.toLowerCase()));
      if (!hasKeyword) {
        analysis.criteria[criterion.id] = false;
      }
    }
  });

  return analysis;
}

export function calculateQualificationsCount(criteria: Record<string, boolean>): number {
  return Object.values(criteria).filter(Boolean).length;
}
