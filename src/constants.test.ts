import { describe, it, expect } from 'vitest';
import {
  delayFor,
  POLL_BACKOFF_MS,
  POLL_BASE_MS,
  RECONNECT_AFTER_FAILURES,
  STALE_THRESHOLD_MS,
  TRAIL_MAX_POINTS,
  FETCH_TIMEOUT_MS,
} from './constants';

describe('constants', () => {
  it('CUJ-5: delayFor returns 5000ms after 0 failures (healthy cadence)', () => {
    expect(delayFor(0)).toBe(5000);
    expect(POLL_BASE_MS).toBe(5000);
  });

  it('CUJ-5: delayFor follows 5s → 10s → 20s → 30s backoff schedule', () => {
    expect(delayFor(0)).toBe(5000);
    expect(delayFor(1)).toBe(10000);
    expect(delayFor(2)).toBe(20000);
    expect(delayFor(3)).toBe(30000);
  });

  it('CUJ-5: delayFor caps at 30000ms for large failure counts', () => {
    expect(delayFor(4)).toBe(30000);
    expect(delayFor(99)).toBe(30000);
    expect(delayFor(1000)).toBe(30000);
  });

  it('delayFor handles 0 and negative inputs without throwing', () => {
    expect(delayFor(0)).toBe(5000);
    expect(delayFor(-1)).toBe(5000);
  });

  it('POLL_BACKOFF_MS schedule matches PRD CUJ-5: 5s, 10s, 20s, 30s', () => {
    expect(POLL_BACKOFF_MS).toEqual([5000, 10000, 20000, 30000]);
  });

  it('STALE_THRESHOLD_MS is 30s per PRD CUJ-5', () => {
    expect(STALE_THRESHOLD_MS).toBe(30_000);
  });

  it('RECONNECT_AFTER_FAILURES is 2 per PRD CUJ-5', () => {
    expect(RECONNECT_AFTER_FAILURES).toBe(2);
  });

  it('TRAIL_MAX_POINTS is 500 per PRD CUJ-1/CUJ-6 (≈42 min of ground track at 5s cadence)', () => {
    expect(TRAIL_MAX_POINTS).toBe(500);
  });

  it('FETCH_TIMEOUT_MS is greater than POLL_BASE_MS to allow late responses', () => {
    expect(FETCH_TIMEOUT_MS).toBeGreaterThan(POLL_BASE_MS);
  });
});
