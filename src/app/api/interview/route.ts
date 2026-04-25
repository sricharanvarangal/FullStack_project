import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { mapGoogleAIError, requireGoogleApiKey } from '@/lib/server/ai-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const missingKey = requireGoogleApiKey();
  if (missingKey) return missingKey;

  try {
    const { messages, jdContext, questionBank, questionIndex } = await req.json();

    const modelMessages = await convertToModelMessages(messages ?? []);

    const currentQ = questionBank?.questions?.[questionIndex];
    const nextQ = questionBank?.questions?.[questionIndex + 1];
    const isLastQuestion = questionIndex >= (questionBank?.questions?.length ?? 0) - 1;

    const systemPrompt = `You are a senior hiring manager conducting a live interview for "${jdContext?.roleTitle || 'a role'}".

ROLE CONTEXT:
- Experience: ${jdContext?.experienceLevel || 'Not specified'}
- Key Skills: ${jdContext?.skills?.join(', ') || 'Not specified'}
- Interview Style: ${jdContext?.interviewStyle || 'balanced'}

CURRENT QUESTION:
Topic: ${currentQ?.topic || 'General'}
Question: ${currentQ?.question || 'Introduce yourself'}
Follow-up probes: ${currentQ?.followUpHints?.join(' | ') || 'none'}

${nextQ ? `NEXT QUESTION (use if current answer was satisfactory): "${nextQ.question}"` : ''}

INSTRUCTIONS:
1. Evaluate the candidate's last answer internally (do NOT say scores aloud).
2. If the answer is VAGUE or SHALLOW: ask ONE targeted follow-up from the probes.
3. If the answer is SATISFACTORY: briefly acknowledge in one sentence, then move to the next question.
4. ${isLastQuestion ? 'This is the LAST question. After evaluating, wrap up warmly then output exactly: [COMPLETE]' : 'Do NOT output [COMPLETE] — more questions remain.'}
5. Keep response under 80 words. Be conversational, not robotic.
6. Never mention scores, ratings, or reveal you are AI.`;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('[interview] Error:', error);

    const mapped = mapGoogleAIError(error);
    if (mapped) return Response.json(mapped.body, { status: mapped.status });

    return Response.json({ error: 'server_error', message: 'Error in interview.' }, { status: 500 });
  }
}
