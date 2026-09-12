const API_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:5000'
).replace(/\/$/, '');

type ApiOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

const pendingGets = new Map<string, Promise<unknown>>();

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Máy chủ phản hồi quá chậm. Vui lòng thử lại.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể kết nối tới máy chủ.';
}

async function execute<T>(path: string, options: ApiOptions): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const retries = options.retries ?? (method === 'GET' ? 2 : 0);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.error ?? `Backend trả về HTTP ${response.status}`;
        const retryable = method === 'GET' && [502, 503, 504].includes(response.status);
        if (!retryable || attempt === retries) throw new Error(message);
        lastError = new Error(message);
      } else {
        return body as T;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw new Error(errorMessage(error));
    } finally {
      clearTimeout(timeout);
    }

    await delay(350 * 2 ** attempt);
  }

  throw new Error(errorMessage(lastError));
}

/**
 * Request dùng chung cho backend.
 * - GET giống nhau đang chạy sẽ dùng chung một Promise, tránh bắn request trùng.
 * - GET được retry ngắn khi mạng/Supabase ngắt tạm thời.
 * - POST/PATCH/DELETE không retry để tránh ghi dữ liệu hai lần.
 */
export function apiRequest<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return execute<T>(path, options);

  const key = `${method}:${path}`;
  const pending = pendingGets.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = execute<T>(path, options).finally(() => pendingGets.delete(key));
  pendingGets.set(key, request);
  return request;
}
