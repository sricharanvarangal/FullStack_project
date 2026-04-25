import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { mapGoogleAIError, requireGoogleApiKey } from '@/lib/server/ai-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  technicalDepth: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  relevance: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  strengths: z.array(z.string()).max(4),
  weaknesses: z.array(z.string()).max(3),
  detailedFeedback: z.string(),
  questionFeedback: z.array(z.object({
    questionId: z.string(),
    question: z.string(),
    score: z.number().min(0).max(10),
    whatWasSaid: z.string(),
    idealAnswer: z.string(),
    improvement: z.string(),
  })),
});

export async function POST(req: Request) {
  const missingKey = requireGoogleApiKey();
  if (missingKey) return missingKey;

  try {
    const { messages, jdContext, questionBank } = await req.json();

    const transcript = messages
      .map((m: { role: string; parts?: { type: string; text: string }[]; content?: string }) => {
        const text = Array.isArray(m.parts)
          ? m.parts.filter((p) => p.type === 'text').map((p) => p.text).join('')
          : (m.content ?? '');
        return `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${text}`;
      })
      .join('\n\n');

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: ReportSchema,
      prompt: `You are a senior technical interviewer. Evaluate this interview transcript and produce a detailed performance report.

ROLE: ${jdContext?.roleTitle}
EXPERIENCE REQUIRED: ${jdContext?.experienceLevel}
SKILLS: ${jdContext?.skills?.join(', ')}

INTERVIEW TRANSCRIPT:
${transcript}

QUESTIONS ASKED:
${questionBank?.questions?.map((q: { id: string; question: string }, i: number) => `${i + 1}. [${q.id}] ${q.question}`).join('\n')}

Provide:
- overallScore: 0-100 overall performance score
- technicalDepth: 0-10 (how deep and accurate were technical answers)
- communication: 0-10 (clarity, structure, conciseness)
- relevance: 0-10 (how relevant were answers to what was asked)
- confidence: 0-10 (how confident the candidate sounded)
- strengths: 0-4 specific strengths demonstrated (can be empty if none)
- weaknesses: 0-3 specific areas to improve (can be empty if none)
- detailedFeedback: 2-3 paragraphs of actionable coaching feedback
- questionFeedback: for each question answered, provide: questionId, the question text, score (0-10), whatWasSaid (what the candidate said, briefly), idealAnswer (what a perfect answer would include), improvement (one specific tip)`,
    });

    return Response.json(object);
  } catch (error: unknown) {
    console.error('[evaluate] Error:', error);

    const mapped = mapGoogleAIError(error);
    if (mapped) return Response.json(mapped.body, { status: mapped.status });

    return Response.json({ error: 'server_error', message: 'Error generating evaluation.' }, { status: 500 });
  }
}
