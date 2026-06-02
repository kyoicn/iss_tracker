import { RECONNECT_AFTER_FAILURES, STALE_THRESHOLD_MS, TRAIL_MAX_POINTS } from './constants';

export type IssSample = {
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: 'daylight' | 'eclipsed' | 'unknown';
  apiTimestampMs: number;
  receivedAtMs: number;
};

export type TrailPoint = {
  lat: number;
  lon: number;
  receivedAtMs: number;
};

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'reconnecting';

export type State = {
  current: IssSample | null;
  previous: IssSample | null;
  trail: TrailPoint[];

  follow: boolean;
  isMarkerOnScreen: boolean;
  hasShownFollowToast: boolean;

  status: ConnectionStatus;
  consecutiveFailures: number;
  nextPollAtMs: number | null;

  isSheetExpanded: boolean;

  nowMs: number;
};

export type Action =
  | { type: 'POLL_START' }
  | { type: 'SAMPLE_OK'; sample: IssSample }
  | { type: 'SAMPLE_FAIL' }
  | { type: 'SET_FOLLOW'; follow: boolean; userInitiated: boolean }
  | { type: 'MAP_INTERACTED' }
  | { type: 'MARKER_VISIBILITY_CHANGE'; onScreen: boolean }
  | { type: 'TOGGLE_SHEET' }
  | { type: 'COLLAPSE_SHEET' }
  | { type: 'TICK'; nowMs: number }
  | { type: 'VISIBILITY_CHANGE'; visible: boolean };

export const initialState: State = {
  current: null,
  previous: null,
  trail: [],
  follow: true,
  isMarkerOnScreen: true,
  hasShownFollowToast: false,
  status: 'idle',
  consecutiveFailures: 0,
  nextPollAtMs: null,
  isSheetExpanded: false,
  nowMs: Date.now(),
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'POLL_START':
      if (state.status === 'idle') return { ...state, status: 'connecting' };
      return state;

    case 'SAMPLE_OK': {
      const trail = [
        ...state.trail,
        {
          lat: action.sample.lat,
          lon: action.sample.lon,
          receivedAtMs: action.sample.receivedAtMs,
        },
      ].slice(-TRAIL_MAX_POINTS);
      return {
        ...state,
        previous: state.current,
        current: action.sample,
        trail,
        consecutiveFailures: 0,
        status: 'live',
      };
    }

    case 'SAMPLE_FAIL': {
      const next = state.consecutiveFailures + 1;
      const status: ConnectionStatus = next >= RECONNECT_AFTER_FAILURES ? 'reconnecting' : state.status;
      return { ...state, consecutiveFailures: next, status };
    }

    case 'SET_FOLLOW':
      return { ...state, follow: action.follow };

    case 'MAP_INTERACTED':
      return {
        ...state,
        follow: false,
        hasShownFollowToast: true,
      };

    case 'MARKER_VISIBILITY_CHANGE':
      if (state.isMarkerOnScreen === action.onScreen) return state;
      return { ...state, isMarkerOnScreen: action.onScreen };

    case 'TOGGLE_SHEET':
      return { ...state, isSheetExpanded: !state.isSheetExpanded };

    case 'COLLAPSE_SHEET':
      if (!state.isSheetExpanded) return state;
      return { ...state, isSheetExpanded: false };

    case 'TICK':
      return { ...state, nowMs: action.nowMs };

    case 'VISIBILITY_CHANGE':
      return state;

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function formatLat(lat: number): string {
  const hemi = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(1)}° ${hemi}`;
}

export function formatLon(lon: number): string {
  const hemi = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(1)}° ${hemi}`;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatKmh(kmh: number): string {
  return `${Math.round(kmh).toLocaleString()} km/h`;
}

export function formatRelative(deltaMs: number): { text: string; isStale: boolean } {
  const isStale = deltaMs > STALE_THRESHOLD_MS;
  const staleSuffix = isStale ? ' — stale' : '';

  if (deltaMs < 1500) return { text: 'just now', isStale };
  const sec = Math.round(deltaMs / 1000);
  if (sec < 60) return { text: `${sec}s ago${staleSuffix}`, isStale };
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return { text: `${min}m ${remSec}s ago${staleSuffix}`, isStale };
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return { text: `${hr}h ${remMin}m ago${staleSuffix}`, isStale };
}

export function splitOnAntimeridian(trail: TrailPoint[]): TrailPoint[][] {
  if (trail.length === 0) return [];
  const segments: TrailPoint[][] = [[trail[0]]];
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1];
    const curr = trail[i];
    if (Math.abs(curr.lon - prev.lon) > 180) {
      segments.push([curr]);
    } else {
      segments[segments.length - 1].push(curr);
    }
  }
  return segments;
}

export function shortPathInterp(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  t: number,
): [number, number] {
  const lat = a.lat + (b.lat - a.lat) * t;
  let bLon = b.lon;
  if (Math.abs(b.lon - a.lon) > 180) {
    bLon = b.lon > a.lon ? b.lon - 360 : b.lon + 360;
  }
  let lon = a.lon + (bLon - a.lon) * t;
  lon = ((lon + 540) % 360) - 180;
  return [lat, lon];
}
