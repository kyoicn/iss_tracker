import { describe, it, expect } from 'vitest';
import {
  reducer,
  initialState,
  formatLat,
  formatLon,
  formatKm,
  formatKmh,
  formatRelative,
  splitOnAntimeridian,
  shortPathInterp,
} from './state';
import type { IssSample, State, TrailPoint } from './state';
import { TRAIL_MAX_POINTS, RECONNECT_AFTER_FAILURES, STALE_THRESHOLD_MS } from './constants';

function makeSample(overrides: Partial<IssSample> = {}): IssSample {
  return {
    lat: 0,
    lon: 0,
    altitudeKm: 408,
    velocityKmh: 27600,
    visibility: 'daylight',
    apiTimestampMs: 1000,
    receivedAtMs: 1000,
    ...overrides,
  };
}

describe('reducer — POLL_START', () => {
  it('CUJ-1: transitions idle → connecting on first poll', () => {
    const s = reducer(initialState, { type: 'POLL_START' });
    expect(s.status).toBe('connecting');
  });

  it('CUJ-5: does NOT change status from live', () => {
    const live: State = { ...initialState, status: 'live' };
    const s = reducer(live, { type: 'POLL_START' });
    expect(s.status).toBe('live');
  });

  it('CUJ-5: does NOT change status from reconnecting', () => {
    const reconn: State = { ...initialState, status: 'reconnecting' };
    const s = reducer(reconn, { type: 'POLL_START' });
    expect(s.status).toBe('reconnecting');
  });
});

describe('reducer — SAMPLE_OK', () => {
  it('CUJ-1: sets current sample on first SAMPLE_OK and transitions to live', () => {
    const sample = makeSample({ lat: 50.1, lon: 118.07 });
    const s = reducer(initialState, { type: 'SAMPLE_OK', sample });
    expect(s.current).toEqual(sample);
    expect(s.previous).toBeNull();
    expect(s.status).toBe('live');
    expect(s.consecutiveFailures).toBe(0);
  });

  it('CUJ-1: moves current → previous on subsequent SAMPLE_OK', () => {
    const a = makeSample({ lat: 1, lon: 1, receivedAtMs: 1000 });
    const b = makeSample({ lat: 2, lon: 2, receivedAtMs: 6000 });
    const s1 = reducer(initialState, { type: 'SAMPLE_OK', sample: a });
    const s2 = reducer(s1, { type: 'SAMPLE_OK', sample: b });
    expect(s2.previous).toEqual(a);
    expect(s2.current).toEqual(b);
  });

  it('CUJ-1: appends to trail on each SAMPLE_OK', () => {
    let s = initialState;
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'SAMPLE_OK', sample: makeSample({ lat: i, lon: i, receivedAtMs: i * 1000 }) });
    }
    expect(s.trail).toHaveLength(5);
    expect(s.trail[0]).toEqual({ lat: 0, lon: 0, receivedAtMs: 0 });
    expect(s.trail[4]).toEqual({ lat: 4, lon: 4, receivedAtMs: 4000 });
  });

  it('CUJ-1/CUJ-6: caps trail at TRAIL_MAX_POINTS (500), dropping oldest', () => {
    let s = initialState;
    const N = TRAIL_MAX_POINTS + 5;
    for (let i = 0; i < N; i++) {
      s = reducer(s, { type: 'SAMPLE_OK', sample: makeSample({ lat: i, lon: i, receivedAtMs: i * 1000 }) });
    }
    expect(s.trail).toHaveLength(TRAIL_MAX_POINTS);
    // oldest 5 dropped: surviving range is [5 .. N-1]
    expect(s.trail[0]).toEqual({ lat: 5, lon: 5, receivedAtMs: 5000 });
    expect(s.trail[TRAIL_MAX_POINTS - 1]).toEqual({ lat: N - 1, lon: N - 1, receivedAtMs: (N - 1) * 1000 });
  });

  it('CUJ-5: resets consecutiveFailures to 0 on success', () => {
    const failedState: State = { ...initialState, consecutiveFailures: 3, status: 'reconnecting' };
    const s = reducer(failedState, { type: 'SAMPLE_OK', sample: makeSample() });
    expect(s.consecutiveFailures).toBe(0);
    expect(s.status).toBe('live');
  });
});

describe('reducer — SAMPLE_FAIL', () => {
  it('CUJ-5: increments consecutiveFailures', () => {
    const s1 = reducer(initialState, { type: 'SAMPLE_FAIL' });
    expect(s1.consecutiveFailures).toBe(1);
    const s2 = reducer(s1, { type: 'SAMPLE_FAIL' });
    expect(s2.consecutiveFailures).toBe(2);
  });

  it('CUJ-5: first failure does NOT trigger reconnecting status', () => {
    const s = reducer(initialState, { type: 'SAMPLE_FAIL' });
    expect(s.status).not.toBe('reconnecting');
  });

  it('CUJ-5: transitions to reconnecting only after RECONNECT_AFTER_FAILURES (2)', () => {
    expect(RECONNECT_AFTER_FAILURES).toBe(2);
    let s = reducer(initialState, { type: 'SAMPLE_FAIL' });
    expect(s.status).not.toBe('reconnecting');
    s = reducer(s, { type: 'SAMPLE_FAIL' });
    expect(s.status).toBe('reconnecting');
  });

  it('CUJ-5: does not change current/previous/trail on failure', () => {
    const sample = makeSample();
    let s = reducer(initialState, { type: 'SAMPLE_OK', sample });
    const beforeFailTrail = s.trail;
    const beforeFailCurrent = s.current;
    s = reducer(s, { type: 'SAMPLE_FAIL' });
    s = reducer(s, { type: 'SAMPLE_FAIL' });
    expect(s.trail).toBe(beforeFailTrail);
    expect(s.current).toEqual(beforeFailCurrent);
  });
});

describe('reducer — SET_FOLLOW', () => {
  it('CUJ-2: sets follow to false', () => {
    const s = reducer({ ...initialState, follow: true }, { type: 'SET_FOLLOW', follow: false, userInitiated: true });
    expect(s.follow).toBe(false);
  });

  it('CUJ-2: sets follow to true (recenter)', () => {
    const s = reducer({ ...initialState, follow: false }, { type: 'SET_FOLLOW', follow: true, userInitiated: true });
    expect(s.follow).toBe(true);
  });
});

describe('reducer — MAP_INTERACTED', () => {
  it('CUJ-2: auto-disables Follow', () => {
    const s = reducer({ ...initialState, follow: true }, { type: 'MAP_INTERACTED' });
    expect(s.follow).toBe(false);
  });

  it('CUJ-2: sets hasShownFollowToast to true', () => {
    const s = reducer(initialState, { type: 'MAP_INTERACTED' });
    expect(s.hasShownFollowToast).toBe(true);
  });
});

describe('reducer — MARKER_VISIBILITY_CHANGE', () => {
  it('CUJ-2: sets isMarkerOnScreen', () => {
    const s = reducer(initialState, { type: 'MARKER_VISIBILITY_CHANGE', onScreen: false });
    expect(s.isMarkerOnScreen).toBe(false);
  });

  it('CUJ-2: returns same state reference when unchanged (referential equality)', () => {
    const s = reducer(initialState, { type: 'MARKER_VISIBILITY_CHANGE', onScreen: true });
    expect(s).toBe(initialState);
  });
});

describe('reducer — sheet actions (CUJ-4)', () => {
  it('TOGGLE_SHEET flips isSheetExpanded', () => {
    const s1 = reducer(initialState, { type: 'TOGGLE_SHEET' });
    expect(s1.isSheetExpanded).toBe(true);
    const s2 = reducer(s1, { type: 'TOGGLE_SHEET' });
    expect(s2.isSheetExpanded).toBe(false);
  });

  it('COLLAPSE_SHEET sets isSheetExpanded to false', () => {
    const expanded: State = { ...initialState, isSheetExpanded: true };
    const s = reducer(expanded, { type: 'COLLAPSE_SHEET' });
    expect(s.isSheetExpanded).toBe(false);
  });

  it('COLLAPSE_SHEET returns same state when already collapsed', () => {
    const s = reducer(initialState, { type: 'COLLAPSE_SHEET' });
    expect(s).toBe(initialState);
  });
});

describe('reducer — TICK', () => {
  it('CUJ-3: updates nowMs', () => {
    const s = reducer(initialState, { type: 'TICK', nowMs: 9999 });
    expect(s.nowMs).toBe(9999);
  });
});

describe('reducer — VISIBILITY_CHANGE', () => {
  it('CUJ-6: is a no-op on state (polling reacts to isVisible directly)', () => {
    const s = reducer(initialState, { type: 'VISIBILITY_CHANGE', visible: false });
    expect(s).toBe(initialState);
  });
});

describe('formatLat / formatLon (CUJ-3)', () => {
  it('formats positive lat as N with one decimal', () => {
    expect(formatLat(50.107)).toBe('50.1° N');
  });
  it('formats negative lat as S', () => {
    expect(formatLat(-33.86)).toBe('33.9° S');
  });
  it('formats positive lon as E', () => {
    expect(formatLon(118.07)).toBe('118.1° E');
  });
  it('formats negative lon as W', () => {
    expect(formatLon(-77.04)).toBe('77.0° W');
  });
  it('CUJ-3 edge: lat exactly 0 shows "0.0° N"', () => {
    expect(formatLat(0)).toBe('0.0° N');
  });
  it('CUJ-3 edge: lon exactly 0 shows "0.0° E"', () => {
    expect(formatLon(0)).toBe('0.0° E');
  });
});

describe('formatKm / formatKmh (CUJ-3)', () => {
  it('rounds km to whole and appends km', () => {
    expect(formatKm(408.49)).toBe('408 km');
    expect(formatKm(408.51)).toBe('409 km');
  });
  it('formats velocity with thousands separator and km/h', () => {
    expect(formatKmh(27600.14)).toBe('27,600 km/h');
  });
});

describe('formatRelative (CUJ-3/CUJ-5)', () => {
  it('CUJ-3: < 1500ms reads "just now" without stale', () => {
    expect(formatRelative(500)).toEqual({ text: 'just now', isStale: false });
  });

  it('CUJ-3: seconds form e.g. "5s ago"', () => {
    expect(formatRelative(5000)).toEqual({ text: '5s ago', isStale: false });
  });

  it('CUJ-5: > STALE_THRESHOLD_MS (30s) appends "— stale" and isStale=true', () => {
    const r = formatRelative(STALE_THRESHOLD_MS + 2000);
    expect(r.isStale).toBe(true);
    expect(r.text).toContain('— stale');
  });

  it('CUJ-5: exactly STALE_THRESHOLD_MS is NOT yet stale (boundary)', () => {
    const r = formatRelative(STALE_THRESHOLD_MS);
    expect(r.isStale).toBe(false);
  });

  it('CUJ-6: minutes form e.g. "5m 0s ago"', () => {
    const r = formatRelative(5 * 60 * 1000);
    expect(r.text).toMatch(/5m/);
    expect(r.isStale).toBe(true);
  });

  it('CUJ-6: hours form e.g. "1h 0m ago"', () => {
    const r = formatRelative(60 * 60 * 1000);
    expect(r.text).toMatch(/1h/);
  });
});

describe('splitOnAntimeridian (CUJ-1)', () => {
  it('returns empty array for empty trail', () => {
    expect(splitOnAntimeridian([])).toEqual([]);
  });

  it('returns single segment for trail with no crossings', () => {
    const trail: TrailPoint[] = [
      { lat: 0, lon: 0, receivedAtMs: 1 },
      { lat: 1, lon: 1, receivedAtMs: 2 },
      { lat: 2, lon: 2, receivedAtMs: 3 },
    ];
    const segs = splitOnAntimeridian(trail);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toHaveLength(3);
  });

  it('CUJ-1: splits when crossing 180° → -179°', () => {
    const trail: TrailPoint[] = [
      { lat: 0, lon: 178, receivedAtMs: 1 },
      { lat: 0, lon: 179, receivedAtMs: 2 },
      { lat: 0, lon: -179, receivedAtMs: 3 },
      { lat: 0, lon: -178, receivedAtMs: 4 },
    ];
    const segs = splitOnAntimeridian(trail);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toHaveLength(2);
    expect(segs[1]).toHaveLength(2);
    // first segment ends at lon 179, second segment begins at lon -179
    expect(segs[0][segs[0].length - 1].lon).toBe(179);
    expect(segs[1][0].lon).toBe(-179);
  });

  it('CUJ-1: splits when crossing -179° → 179° (westbound)', () => {
    const trail: TrailPoint[] = [
      { lat: 0, lon: -178, receivedAtMs: 1 },
      { lat: 0, lon: -179, receivedAtMs: 2 },
      { lat: 0, lon: 179, receivedAtMs: 3 },
      { lat: 0, lon: 178, receivedAtMs: 4 },
    ];
    const segs = splitOnAntimeridian(trail);
    expect(segs).toHaveLength(2);
  });
});

describe('shortPathInterp (CUJ-1/CUJ-5)', () => {
  it('interpolates linearly when no antimeridian crossing', () => {
    const [lat, lon] = shortPathInterp({ lat: 0, lon: 0 }, { lat: 10, lon: 20 }, 0.5);
    expect(lat).toBeCloseTo(5);
    expect(lon).toBeCloseTo(10);
  });

  it('CUJ-1: takes shorter wrap path when crossing antimeridian eastbound', () => {
    // From 179 to -179 (eastbound, +2°), midpoint should be near 180/-180
    const [, lon] = shortPathInterp({ lat: 0, lon: 179 }, { lat: 0, lon: -179 }, 0.5);
    // Expected wrap midpoint: 180 (which normalizes to -180)
    expect(Math.abs(Math.abs(lon) - 180)).toBeLessThan(0.0001);
  });

  it('returns endpoints exactly at t=0 and t=1', () => {
    const [lat0, lon0] = shortPathInterp({ lat: 10, lon: 20 }, { lat: -10, lon: -20 }, 0);
    expect(lat0).toBe(10);
    expect(lon0).toBe(20);
    const [lat1, lon1] = shortPathInterp({ lat: 10, lon: 20 }, { lat: -10, lon: -20 }, 1);
    expect(lat1).toBe(-10);
    // -20 normalized stays -20
    expect(lon1).toBeCloseTo(-20);
  });

  it('CUJ-1: normalizes interpolated lon to [-180, 180]', () => {
    const [, lon] = shortPathInterp({ lat: 0, lon: 170 }, { lat: 0, lon: -170 }, 0.5);
    expect(lon).toBeGreaterThanOrEqual(-180);
    expect(lon).toBeLessThanOrEqual(180);
  });
});
