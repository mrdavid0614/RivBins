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

  if (!response.ok) {
    throw new ApiError(response.status, `${init?.method ?? 'GET'} ${path} failed with ${response.status}`);
  }

  // 204 / empty body (e.g. action endpoints) → undefined
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}
