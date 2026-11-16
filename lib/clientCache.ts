'use client';

interface CachedResponseEntry {
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyText: string;
  expiresAt: number;
}

export interface ApiFetchOptions extends RequestInit {
  /** Cache lifetime in milliseconds for GET requests (default: 15000ms). */
  ttlMs?: number;
  /** Bypass cached response and perform a fresh network request. */
  forceRefresh?: boolean;
}

const DEFAULT_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 200;
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const responseCache = new Map<string, CachedResponseEntry>();
const inFlightRequests = new Map<string, Promise<CachedResponseEntry>>();
let mutationEpoch = 0;

function buildResponse(entry: CachedResponseEntry): Response {
  const headers = new Headers(entry.headers);
  const body = NULL_BODY_STATUSES.has(entry.status) ? null : entry.bodyText;
  return new Response(body, {
    status: entry.status,
    statusText: entry.statusText,
    headers,
  });
}

/**
 * Invalidate cached GET entries. When urlPrefix is omitted, clears the entire client API cache.
 */
export function invalidateApiCache(urlPrefix?: string): void {
  mutationEpoch += 1;
  if (!urlPrefix) {
    responseCache.clear();
    inFlightRequests.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      responseCache.delete(key);
    }
  }
  for (const key of inFlightRequests.keys()) {
    if (key.startsWith(urlPrefix)) {
      inFlightRequests.delete(key);
    }
  }
}

/**
 * Drop-in wrapper around fetch() that deduplicates concurrent GET requests and caches
 * successful responses for a short TTL. Non-GET mutations automatically invalidate the cache.
 */
export async function apiFetch(
  input: string,
  init?: ApiFetchOptions
): Promise<Response> {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false, ...fetchInit } = init || {};
  const method = (fetchInit.method || 'GET').toUpperCase();
  const isCacheableGet =
    typeof window !== 'undefined' &&
    method === 'GET' &&
    fetchInit.cache !== 'no-store' &&
    !forceRefresh &&
    ttlMs > 0;

  const fetchOptions: RequestInit = {
    ...fetchInit,
    cache: 'no-store',
  };

  if (method !== 'GET') {
    invalidateApiCache();
    try {
      return await fetch(input, fetchOptions);
    } finally {
      invalidateApiCache();
    }
  }

  if (!isCacheableGet) {
    return fetch(input, fetchOptions);
  }

  const now = Date.now();
  const cached = responseCache.get(input);
  if (cached && cached.expiresAt > now) {
    return buildResponse(cached);
  }
  if (cached) {
    responseCache.delete(input);
  }

  const existingFlight = inFlightRequests.get(input);
  if (existingFlight) {
    const entry = await existingFlight;
    return buildResponse(entry);
  }

  const startEpoch = mutationEpoch;
  const flightPromise = (async (): Promise<CachedResponseEntry> => {
    const res = await fetch(input, fetchOptions);
    const bodyText = NULL_BODY_STATUSES.has(res.status) ? '' : await res.text();
    const entry: CachedResponseEntry = {
      status: res.status,
      statusText: res.statusText,
      headers: Array.from(res.headers.entries()),
      bodyText,
      expiresAt: Date.now() + ttlMs,
    };

    if (res.ok && mutationEpoch === startEpoch) {
      if (responseCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey) responseCache.delete(oldestKey);
      }
      responseCache.set(input, entry);
    }
    return entry;
  })();

  inFlightRequests.set(input, flightPromise);
  try {
    const entry = await flightPromise;
    return buildResponse(entry);
  } finally {
    inFlightRequests.delete(input);
  }
}
