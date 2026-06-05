export const API_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const POLL_BASE_MS = 5000;
export const POLL_BACKOFF_MS = [5000, 10000, 20000, 30000] as const;
export const FETCH_TIMEOUT_MS = 8000;

export const TRAIL_MAX_POINTS = 500;
export const TRAIL_GAP_THRESHOLD_MS = 8000;

export const STALE_THRESHOLD_MS = 30_000;
export const RECONNECT_AFTER_FAILURES = 2;

export const INITIAL_MAP_CENTER: [number, number] = [0, 0];
export const INITIAL_MAP_ZOOM = 2;
export const ISS_LOCK_ZOOM = 3;
export const FLY_TO_DURATION_INITIAL_S = 1.0;
export const FLY_TO_DURATION_RECENTER_S = 1.5;

export const BREAKPOINT_MOBILE_PX = 768;

export const PANEL_WIDTH_PX = 360;
export const MOBILE_SHEET_COLLAPSED_PX = 80;

export const COLOR_BG_MAP = '#0a0f17';
export const COLOR_ACCENT_CYAN = '#22d3ee';

export function delayFor(failures: number): number {
  const idx = Math.min(Math.max(failures, 0), POLL_BACKOFF_MS.length - 1);
  return POLL_BACKOFF_MS[idx];
}
