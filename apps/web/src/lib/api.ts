const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Typed fetch against the NestJS API. Never cached: scores change on every recompute. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  // Default to JSON only for string bodies (JSON.stringify); fetch sets the right type for the rest.
  if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });

  // 204 / empty body (e.g. action endpoints) → undefined
  const body = await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessage(body) ?? `${init?.method ?? 'GET'} ${path} failed with ${response.status}`,
    );
  }

  return (body ? JSON.parse(body) : undefined) as T;
}

/** The `message` of a NestJS error body (`{ statusCode, message, error }`), if any. */
function errorMessage(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
      const { message } = parsed;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join('; ');
    }
  } catch {
    // Not JSON: fall back to the generic message.
  }
  return null;
}
