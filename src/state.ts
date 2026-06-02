import { RECONNECT_AFTER_FAILURES, TRAIL_MAX_POINTS } from './constants';

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
        hasShownFollowToast: state.hasShownFollowToast || true,
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
