import { API_URL, FETCH_TIMEOUT_MS } from './constants';
import type { IssSample } from './state';

export function parseIssResponse(raw: unknown, nowMs: number): IssSample | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const lat = r.latitude;
  const lon = r.longitude;
  const altitudeKm = r.altitude;
  const velocityKmh = r.velocity;
  const timestamp = r.timestamp;
  const visibilityRaw = r.visibility;

  if (
    typeof lat !== 'number' || !Number.isFinite(lat) ||
    typeof lon !== 'number' || !Number.isFinite(lon) ||
    typeof altitudeKm !== 'number' || !Number.isFinite(altitudeKm) ||
    typeof velocityKmh !== 'number' || !Number.isFinite(velocityKmh) ||
    typeof timestamp !== 'number' || !Number.isFinite(timestamp)
  ) {
    return null;
  }

  const visibility: IssSample['visibility'] =
    visibilityRaw === 'daylight' || visibilityRaw === 'eclipsed' ? visibilityRaw : 'unknown';

  return {
    lat,
    lon,
    altitudeKm,
    velocityKmh,
    visibility,
    apiTimestampMs: timestamp * 1000,
    receivedAtMs: nowMs,
  };
}

export async function fetchIssPosition(externalSignal?: AbortSignal): Promise<IssSample | null> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onAbort);

  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return parseIssResponse(json, Date.now());
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}
