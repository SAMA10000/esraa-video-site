
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: string;
  valid?: boolean;
  username?: string;
  role?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  const data = await parseJson<ApiResult<T> | T>(response);
  if (!response.ok) {
    const error = (data as ApiResult).error || `HTTP ${response.status}`;
    throw new Error(error);
  }
  return data as T;
}

export async function apiPost<T = unknown>(path: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson<ApiResult<T>>(response);
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        debug: data.debug,
      };
    }
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'فشل الاتصال بواجهة MySQL API',
      debug: error instanceof Error ? error.message : String(error),
    };
  }
}

export { API_BASE_URL };
