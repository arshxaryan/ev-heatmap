/**
 * Tiny API client with in-memory + sessionStorage caching and a `useApi` hook.
 * Every page uses useApi → skeleton loaders + error states everywhere.
 */
const BASE = import.meta.env.VITE_API_URL || '/api';
const TTL = 60_000; // 1 minute response cache

const memory = new Map();

function cacheGet(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = sessionStorage.getItem('evgap.' + key);
    if (raw) {
      const { t, d } = JSON.parse(raw);
      if (Date.now() - t < TTL) return d;
    }
  } catch { /* ignore */ }
  return null;
}

function cacheSet(key, data) {
  memory.set(key, data);
  try {
    sessionStorage.setItem('evgap.' + key, JSON.stringify({ t: Date.now(), d: data }));
  } catch { /* quota exceeded — memory cache still works */ }
}

export function buildUrl(path, params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') usp.set(k, v);
  const qs = usp.toString();
  return `${BASE}${path}${qs ? '?' + qs : ''}`;
}

export async function apiGet(path, params = {}) {
  const url = buildUrl(path, params);
  const key = url.replace(BASE, '');
  const hit = cacheGet(key);
  if (hit) return hit;

  // Retries for free-tier cold starts: Render sleeps after ~15 min idle and
  // the first request can take 30–60 s or drop while the instance boots.
  const RETRIES = 3;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500 * attempt));
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      if (attempt < RETRIES) continue;
      throw new Error(
        `The server is waking up (free hosting cold start). ${url} didn't answer after ${RETRIES + 1} tries — tap Retry in a few seconds.`,
      );
    }
    if (res.status === 502 || res.status === 503 || res.status === 429) {
      if (attempt < RETRIES) continue; // instance booting / rate-limited — try again
    }
    if (!res.ok) {
      let msg = `API ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    const data = await res.json();
    cacheSet(key, data);
    return data;
  }
  throw new Error('API unreachable');
}

/** POST multipart CSV upload (cache-bypassing). */
export async function apiUploadRegistrationCsv(file) {
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await fetch(`${BASE}/upload/registrations`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  memory.clear();
  try { for (let i = sessionStorage.length - 1; i >= 0; i--) { const k = sessionStorage.key(i); if (k.startsWith('evgap./')) sessionStorage.removeItem(k); } } catch { /* noop */ }
  return data;
}

import { useEffect, useState } from 'react';

/**
 * useApi(path, params, deps?) → { data, loading, error, refetch }
 * Loading first render = skeleton friendly; errors carry readable messages.
 */
export function useApi(path, params = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiGet(path, JSON.parse(paramKey))
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => { alive = false; };
  }, [path, paramKey, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}
