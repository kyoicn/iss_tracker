import { useEffect, useReducer } from 'react';
import { initialState, reducer } from './state';
import { useIssPolling } from './hooks/useIssPolling';
import { usePageVisibility } from './hooks/usePageVisibility';

function fmtLat(lat: number): string {
  const hemi = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(1)}° ${hemi}`;
}

function fmtLon(lon: number): string {
  const hemi = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(1)}° ${hemi}`;
}

function fmtLastUpdated(deltaMs: number): string {
  if (deltaMs < 1500) return 'just now';
  return `${Math.round(deltaMs / 1000)}s ago`;
}

function fmtVisibility(v: 'daylight' | 'eclipsed' | 'unknown'): string {
  if (v === 'daylight') return 'Daylight';
  if (v === 'eclipsed') return 'Eclipsed';
  return 'Unknown';
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isVisible = usePageVisibility(dispatch);
  useIssPolling(dispatch, isVisible);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK', nowMs: Date.now() });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isVisible]);

  const statusColor =
    state.status === 'live'
      ? 'text-accent-green'
      : state.status === 'reconnecting'
      ? 'text-accent-amber'
      : 'text-text-muted';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-app text-text-primary">
      <h1 className="text-2xl font-semibold mb-1">ISS Live Tracker</h1>
      <div className={`text-xs uppercase tracking-wider mb-6 ${statusColor}`}>
        Status: {state.status}
      </div>

      {state.current === null ? (
        <div className="text-text-muted">Locating ISS…</div>
      ) : (
        <div className="font-mono tabular-nums text-sm space-y-1 text-text-secondary">
          <div>
            <span className="text-text-muted">Latitude:    </span>
            {fmtLat(state.current.lat)}
          </div>
          <div>
            <span className="text-text-muted">Longitude:   </span>
            {fmtLon(state.current.lon)}
          </div>
          <div>
            <span className="text-text-muted">Altitude:    </span>
            {Math.round(state.current.altitudeKm)} km
          </div>
          <div>
            <span className="text-text-muted">Velocity:    </span>
            {Math.round(state.current.velocityKmh).toLocaleString()} km/h
          </div>
          <div>
            <span className="text-text-muted">Visibility:  </span>
            {fmtVisibility(state.current.visibility)}
          </div>
          <div>
            <span className="text-text-muted">Last update: </span>
            {fmtLastUpdated(state.nowMs - state.current.receivedAtMs)}
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-text-dim font-mono">
        <div>diagnostic — failures: {state.consecutiveFailures}</div>
        <div>diagnostic — trail length: {state.trail.length}</div>
      </div>
    </div>
  );
}
