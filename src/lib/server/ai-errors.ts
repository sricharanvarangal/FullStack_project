export type ApiErrorBody = {
  error: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function extractStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return (
    getNumber(error.statusCode) ??
    getNumber(error.status) ??
    (isRecord(error.response) ? getNumber(error.response.status) : undefined)
  );
}

function extractProviderMessage(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.message === 'string') return error.message;
  if (!isRecord(error)) return undefined;

  const directMessage = getString(error.message);
  if (directMessage) return directMessage;

  if (isRecord(error.data) && isRecord(error.data.error)) {
    const dataMessage = getString(error.data.error.message);
    if (dataMessage) return dataMessage;
  }

  return undefined;
}

export function requireGoogleApiKey(): Response | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (typeof apiKey === 'string' && apiKey.trim()) return null;

  return Response.json(
    {
      error: 'missing_api_key',
      message:
        'Missing GOOGLE_GENERATIVE_AI_API_KEY. Add a valid key to ai-interview-platform/.env.local and restart the dev server.',
    } satisfies ApiErrorBody,
    { status: 401 }
  );
}

export function mapGoogleAIError(error: unknown): { status: number; body: ApiErrorBody } | null {
  const statusCode = extractStatusCode(error);
  const providerMessage = extractProviderMessage(error) ?? '';
  const normalized = providerMessage.toLowerCase();

  const detailsReasons: string[] = [];
  if (isRecord(error) && isRecord(error.data) && isRecord(error.data.error) && Array.isArray(error.data.error.details)) {
    for (const entry of error.data.error.details) {
      if (!isRecord(entry)) continue;
      const reason = getString(entry.reason);
      if (reason) detailsReasons.push(reason);
    }
  }

  const isRateLimit =
    statusCode === 429 || normalized.includes('429') || normalized.includes('resource_exhausted');
  if (isRateLimit) {
    return {
      status: 429,
      body: {
        error: 'rate_limit',
        message: 'API rate limit reached. Please wait 60 seconds and try again.',
      },
    };
  }

  const isApiKeyIssue =
    normalized.includes('api key') &&
    (normalized.includes('expired') ||
      normalized.includes('invalid') ||
      normalized.includes('not valid') ||
      normalized.includes('renew') ||
      detailsReasons.includes('API_KEY_INVALID'));
  if (isApiKeyIssue) {
    return {
      status: 401,
      body: {
        error: 'api_key_invalid',
        message:
          'Google AI API key is invalid or expired. Update GOOGLE_GENERATIVE_AI_API_KEY in ai-interview-platform/.env.local and restart the dev server.',
      },
    };
  }

  return null;
}
