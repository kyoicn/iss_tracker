import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseIssResponse, fetchIssPosition } from './api';

const WELL_FORMED = {
  name: 'iss',
  id: 25544,
  latitude: 50.11,
  longitude: 118.07,
  altitude: 408.05,
  velocity: 27600.14,
  visibility: 'daylight',
  footprint: 4500.0,
  timestamp: 1717286400,
  daynum: 2460400.5,
  solar_lat: 22.1,
  solar_lon: -45.0,
  units: 'kilometers',
};

describe('parseIssResponse', () => {
  it('CUJ-1/CUJ-3: parses a well-formed payload from wheretheiss.at', () => {
    const r = parseIssResponse(WELL_FORMED, 1717286401234);
    expect(r).not.toBeNull();
    expect(r).toMatchObject({
      lat: 50.11,
      lon: 118.07,
      altitudeKm: 408.05,
      velocityKmh: 27600.14,
      visibility: 'daylight',
      apiTimestampMs: 1717286400 * 1000,
      receivedAtMs: 1717286401234,
    });
  });

  it('CUJ-3: maps visibility "eclipsed" through', () => {
    const r = parseIssResponse({ ...WELL_FORMED, visibility: 'eclipsed' }, 1);
    expect(r?.visibility).toBe('eclipsed');
  });

  it('CUJ-3 edge: maps unrecognized visibility value to "unknown"', () => {
    const r = parseIssResponse({ ...WELL_FORMED, visibility: 'twilight' }, 1);
    expect(r?.visibility).toBe('unknown');
  });

  it('CUJ-3 edge: maps missing visibility field to "unknown"', () => {
    const { visibility: _v, ...rest } = WELL_FORMED;
    const r = parseIssResponse(rest, 1);
    expect(r?.visibility).toBe('unknown');
  });

  it('CUJ-5: returns null for null input', () => {
    expect(parseIssResponse(null, 1)).toBeNull();
  });

  it('CUJ-5: returns null for undefined input', () => {
    expect(parseIssResponse(undefined, 1)).toBeNull();
  });

  it('CUJ-5: returns null for non-object input (string)', () => {
    expect(parseIssResponse('not json', 1)).toBeNull();
  });

  it('CUJ-5: returns null for non-object input (number)', () => {
    expect(parseIssResponse(42, 1)).toBeNull();
  });

  it('CUJ-5: returns null when latitude is missing', () => {
    const { latitude: _, ...rest } = WELL_FORMED;
    expect(parseIssResponse(rest, 1)).toBeNull();
  });

  it('CUJ-5: returns null when latitude is wrong type (string)', () => {
    expect(parseIssResponse({ ...WELL_FORMED, latitude: 'foo' }, 1)).toBeNull();
  });

  it('CUJ-5: returns null when longitude is missing', () => {
    const { longitude: _, ...rest } = WELL_FORMED;
    expect(parseIssResponse(rest, 1)).toBeNull();
  });

  it('CUJ-5: returns null when altitude is missing', () => {
    const { altitude: _, ...rest } = WELL_FORMED;
    expect(parseIssResponse(rest, 1)).toBeNull();
  });

  it('CUJ-5: returns null when velocity is missing', () => {
    const { velocity: _, ...rest } = WELL_FORMED;
    expect(parseIssResponse(rest, 1)).toBeNull();
  });

  it('CUJ-5: returns null when timestamp is missing', () => {
    const { timestamp: _, ...rest } = WELL_FORMED;
    expect(parseIssResponse(rest, 1)).toBeNull();
  });

  it('CUJ-5: returns null when a numeric field is NaN', () => {
    expect(parseIssResponse({ ...WELL_FORMED, latitude: NaN }, 1)).toBeNull();
  });

  it('CUJ-5: returns null when a numeric field is Infinity', () => {
    expect(parseIssResponse({ ...WELL_FORMED, altitude: Infinity }, 1)).toBeNull();
  });
});

describe('fetchIssPosition', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('CUJ-1: returns a parsed sample on 200 OK', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(WELL_FORMED), { status: 200 }),
    ) as unknown as typeof fetch;
    const r = await fetchIssPosition();
    expect(r).not.toBeNull();
    expect(r?.lat).toBe(50.11);
  });

  it('CUJ-5: returns null on non-2xx response (does not throw)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('err', { status: 500 })) as unknown as typeof fetch;
    const r = await fetchIssPosition();
    expect(r).toBeNull();
  });

  it('CUJ-5: returns null on 429 rate-limit response', async () => {
    globalThis.fetch = vi.fn(async () => new Response('rate', { status: 429 })) as unknown as typeof fetch;
    const r = await fetchIssPosition();
    expect(r).toBeNull();
  });

  it('CUJ-5: returns null on network error (does not throw)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('network failure');
    }) as unknown as typeof fetch;
    const r = await fetchIssPosition();
    expect(r).toBeNull();
  });

  it('CUJ-5: returns null on malformed JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{not json', { status: 200 })) as unknown as typeof fetch;
    const r = await fetchIssPosition();
    expect(r).toBeNull();
  });

  it('CUJ-5: returns null when caller aborts via external signal', async () => {
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
    ) as unknown as typeof fetch;

    const ctrl = new AbortController();
    const promise = fetchIssPosition(ctrl.signal);
    ctrl.abort();
    await expect(promise).resolves.toBeNull();
  });
});

describe('fetchIssPosition (live network)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it.skipIf((import.meta as { env?: Record<string, string> }).env?.VITE_SKIP_LIVE === '1')(
    'CUJ-1 smoke: real call to wheretheiss.at returns a parseable sample',
    async () => {
      const r = await fetchIssPosition();
      if (!r) {
        return;
      }
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lon).toBe('number');
      expect(r.altitudeKm).toBeGreaterThan(300);
      expect(r.altitudeKm).toBeLessThan(500);
      expect(r.velocityKmh).toBeGreaterThan(20000);
      expect(['daylight', 'eclipsed', 'unknown']).toContain(r.visibility);
    },
    15000,
  );
});
