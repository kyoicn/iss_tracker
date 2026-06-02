import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type L from 'leaflet';
import MapView from './components/MapView';
import TelemetryPanel from './components/TelemetryPanel';
import BottomSheet from './components/BottomSheet';
import FollowToggle from './components/FollowToggle';
import RecenterButton from './components/RecenterButton';
import EdgeArrow from './components/EdgeArrow';
import { useIssPolling } from './hooks/useIssPolling';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useIsMobile } from './hooks/useIsMobile';
import { PANEL_WIDTH_PX } from './constants';
import { initialState, reducer } from './state';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isVisible = usePageVisibility(dispatch);
  useIssPolling(dispatch, isVisible);
  const isMobile = useIsMobile();
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK', nowMs: Date.now() });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isVisible]);

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  const handleFollowToggle = useCallback(() => {
    dispatch({ type: 'SET_FOLLOW', follow: !state.follow, userInitiated: true });
  }, [state.follow]);

  const handleRecenter = useCallback(() => {
    dispatch({ type: 'SET_FOLLOW', follow: true, userInitiated: true });
  }, []);

  const handleMapInteract = useCallback(() => {
    if (state.follow) {
      setToastVisible(true);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2200);
    }
    dispatch({ type: 'MAP_INTERACTED' });
  }, [state.follow]);

  const handleMarkerVisibilityChange = useCallback((onScreen: boolean) => {
    dispatch({ type: 'MARKER_VISIBILITY_CHANGE', onScreen });
  }, []);

  const handleToggleSheet = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHEET' });
  }, []);

  const handleCollapseSheet = useCallback(() => {
    dispatch({ type: 'COLLAPSE_SHEET' });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showRecenterAndArrow =
    !state.follow && !state.isMarkerOnScreen && state.current !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-app text-text-primary">
      <div
        className="absolute inset-y-0 left-0"
        style={{ right: isMobile ? 0 : PANEL_WIDTH_PX }}
      >
        <MapView
          state={state}
          onMapInteract={handleMapInteract}
          onMarkerVisibilityChange={handleMarkerVisibilityChange}
          onMapReady={handleMapReady}
        />

        <div
          className="glass absolute left-4 top-4 z-[600] flex items-center gap-3 rounded-[10px] px-3.5 py-2.5"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="6" height="6" rx="1" />
            <path d="M9 9 L3 3 M15 9 L21 3 M9 15 L3 21 M15 15 L21 21" />
            <circle cx="3" cy="3" r="1.4" />
            <circle cx="21" cy="3" r="1.4" />
            <circle cx="3" cy="21" r="1.4" />
            <circle cx="21" cy="21" r="1.4" />
          </svg>
          <div>
            <div className="text-[13px] font-medium leading-tight text-text-secondary">
              ISS — Zarya
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
              {state.status === 'reconnecting' ? (
                <>
                  <span className="reconnect-dot" />
                  <span>Reconnecting</span>
                </>
              ) : state.current === null ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted" />
                  <span>Locating</span>
                </>
              ) : (
                <>
                  <span className="live-dot" />
                  <span>Live tracking</span>
                </>
              )}
            </div>
          </div>
        </div>

        <FollowToggle follow={state.follow} onToggle={handleFollowToggle} />

        {!state.follow && state.current ? (
          <div
            className="glass-soft absolute right-4 z-[600] flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-amber"
            style={{ top: 64 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-amber" />
            {state.isMarkerOnScreen ? 'Free pan' : 'ISS off-screen'}
          </div>
        ) : null}

        {toastVisible ? (
          <div
            className="glass toast-in absolute z-[700] rounded-md px-3 py-1.5 font-mono text-[11px] text-text-secondary"
            style={{ top: 56, right: 16 }}
            role="status"
          >
            Follow off — map won't auto-center.
          </div>
        ) : null}

        {showRecenterAndArrow ? (
          <>
            <EdgeArrow current={state.current!} map={mapInstance} nowMs={state.nowMs} />
            <RecenterButton onRecenter={handleRecenter} isMobile={isMobile} />
          </>
        ) : null}
      </div>

      {isMobile ? (
        <BottomSheet
          state={state}
          onToggleSheet={handleToggleSheet}
          onCollapse={handleCollapseSheet}
        />
      ) : (
        <div className="absolute inset-y-0 right-0">
          <TelemetryPanel state={state} />
        </div>
      )}
    </div>
  );
}
