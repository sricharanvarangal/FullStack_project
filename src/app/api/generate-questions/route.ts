import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { mapGoogleAIError, requireGoogleApiKey } from '@/lib/server/ai-errors';

export const dynamic = 'force-dynamic';

const QuestionBankSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    topic: z.string(),
    question: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    type: z.enum(['technical', 'behavioral', 'system-design']),
    followUpHints: z.array(z.string()),
  })).length(5),
});

export async function POST(req: Request) {
  const missingKey = requireGoogleApiKey();
  if (missingKey) return missingKey;

  try {
    const { jdContext } = await req.json();
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: QuestionBankSchema,
      prompt: `You are a senior technical interviewer. Generate exactly 5 interview questions for this role:

Role: ${jdContext.roleTitle}
Experience: ${jdContext.experienceLevel}
Key Skills: ${jdContext.skills?.join(', ')}
Topics: ${jdContext.keyTopics?.join(', ')}
Interview Style: ${jdContext.interviewStyle}

Create 5 questions covering different topics:
- 3 technical questions (varying difficulty: easy, medium, hard)
- 1 system-design or architectural question
- 1 behavioral question

For each question, provide 3 follow-up hints (probing questions to use if the answer is vague).
Assign unique IDs like "q1", "q2", etc.`,
    });
    return Response.json(object);
  } catch (error: unknown) {
    console.error('[generate-questions] Error:', error);

    const mapped = mapGoogleAIError(error);
    if (mapped) return Response.json(mapped.body, { status: mapped.status });

    return Response.json({ error: 'server_error', message: 'Error generating questions.' }, { status: 500 });
  }
}
