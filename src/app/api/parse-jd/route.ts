import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { mapGoogleAIError, requireGoogleApiKey } from '@/lib/server/ai-errors';

export const dynamic = 'force-dynamic';

const JDSchema = z.object({
  roleTitle: z.string(),
  experienceLevel: z.string(),
  skills: z.array(z.string()),
  companyContext: z.string(),
  interviewStyle: z.string(),
  keyTopics: z.array(z.string()),
});

// Retry with exponential backoff for rate limit errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        (error instanceof Error && error.message?.includes('429')) ||
        (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) ||
        (error instanceof Error && error.message?.includes('RESOURCE_EXHAUSTED'));

      if (isRateLimit && attempt < maxRetries) {
        const waitMs = (attempt + 1) * 20000; // 20s, 40s, 60s
        console.log(`[parse-jd] Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: Request) {
  const missingKey = requireGoogleApiKey();
  if (missingKey) return missingKey;

  try {
    const { jobDescription } = await req.json();
    if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return Response.json({ error: 'bad_request', message: 'jobDescription is required.' }, { status: 400 });
    }

    const { object } = await withRetry(() =>
      generateObject({
        model: google('gemini-2.5-flash'),
        schema: JDSchema,
        prompt: `Analyze this job description and extract structured information:

${jobDescription}

Extract:
- roleTitle: The exact job title
- experienceLevel: e.g. "3-5 years", "Senior level"
- skills: Array of 4-8 key technical skills required
- companyContext: Brief description of the company/team (or "Not specified" if not mentioned)
- interviewStyle: e.g. "technical deep-dive", "balanced technical and behavioral"
- keyTopics: Array of 4-6 specific topics that will be covered in the interview`,
      })
    );

    return Response.json(object);
  } catch (error: unknown) {
    console.error('[parse-jd] Error:', error);

    const mapped = mapGoogleAIError(error);
    if (mapped) return Response.json(mapped.body, { status: mapped.status });

    return Response.json({ error: 'server_error', message: 'Error parsing job description.' }, { status: 500 });
  }
}
