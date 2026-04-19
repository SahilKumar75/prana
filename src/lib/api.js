// Central API client — all backend calls go through here
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export const api = {
  getSessions: () => request('/api/sessions'),

  getStats: () => request('/api/sessions/stats'),

  createSession: (rawTranscript, language) =>
    request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ raw_transcript: rawTranscript, language }),
    }),
};
