/**
 * Resolve an API path to a full URL that honours HA's ingress prefix.
 *
 * The server injects `<base href="/api/hassio_ingress/<token>/">` into
 * index.html when behind ingress, or `<base href="./">` otherwise.
 * `document.baseURI` then points at the SPA root regardless of which
 * React Router route the user is currently on, so resolving a relative
 * `api/foo` path against it gives the right URL.
 *
 * Callers pass `/api/foo` for historical reasons; we strip the leading
 * slash so it's treated as relative (a leading `/` would reset to origin
 * and bypass the ingress prefix).
 */
export function apiUrl(path: string): string {
  const rel = path.startsWith("/") ? path.slice(1) : path;
  return new URL(rel, document.baseURI).toString();
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).error ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, file: File, fields?: Record<string, string>): Promise<T> => {
    const form = new FormData();
    form.append("file", file);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value);
      }
    }
    const res = await fetch(apiUrl(path), { method: "POST", body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<T>;
  },
};
