const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL ?? API_BASE_URL.replace(/\/api$/, '');

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('expense-auth-token') : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem('expense-auth-token', token);
  } else {
    localStorage.removeItem('expense-auth-token');
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function parseError(response: Response) {
  try {
    const payload = await response.json();
    return payload.message ?? `API error ${response.status}`;
  } catch (error) {
    return `API error ${response.status}`;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function buildFileUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${FILE_BASE_URL}${normalizedPath}`;
}
