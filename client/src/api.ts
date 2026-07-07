const BASE = '/api';

// The AuthProvider registers a handler so that any 401 during the session
// (e.g. an expired cookie) drops us back to the login gate.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p: string) => req(p),
  post: (p: string, body?: unknown) => req(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (p: string, body?: unknown) => req(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: (p: string, body?: unknown) => req(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};
