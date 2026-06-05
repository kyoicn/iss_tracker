import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
  COLOR_ACCENT_CYAN,
  COLOR_BG_MAP,
  FLY_TO_DURATION_INITIAL_S,
  FLY_TO_DURATION_RECENTER_S,
  INITIAL_MAP_CENTER,
  INITIAL_MAP_ZOOM,
  ISS_LOCK_ZOOM,
  TILE_ATTRIBUTION,
  TILE_URL,
  TRAIL_GAP_THRESHOLD_MS,
} from '../constants';
import { shortPathInterp, splitOnAntimeridian } from '../state';
import type { State } from '../state';

type MapViewProps = {
  state: State;
  onMapInteract: () => void;
  onMarkerVisibilityChange: (onScreen: boolean) => void;
  onMapReady: (map: L.Map) => void;
};

const issDivIcon = L.divIcon({
  className: 'iss-marker-icon',
  html: '<div class="iss-marker-dot"></div><div class="iss-marker-halo"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function MapInner({ state, onMapInteract, onMarkerVisibilityChange, onMapReady }: MapViewProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const labelRef = useRef<L.Marker | null>(null);
  const trailLayerRef = useRef<L.LayerGroup | null>(null);
  const liveSegmentRef = useRef<L.Polyline | null>(null);
  const rafRef = useRef<number | null>(null);
  const jumpTimeoutRef = useRef<number | null>(null);
  const programmaticPendingRef = useRef<number>(0);
  const isZoomingRef = useRef<boolean>(false);
  const lastSampleAtRef = useRef<number | null>(null);
  const followRef = useRef<boolean>(state.follow);
  followRef.current = state.follow;
  const currentSampleRef = useRef(state.current);
  currentSampleRef.current = state.current;

  useEffect(() => {
    onMapReady(map);

    const marker = L.marker(INITIAL_MAP_CENTER, {
      icon: issDivIcon,
      interactive: false,
      keyboard: false,
      opacity: 0,
    });
    marker.addTo(map);
    markerRef.current = marker;

    const trailLayer = L.layerGroup();
    trailLayer.addTo(map);
    trailLayerRef.current = trailLayer;

    // Live segment: the in-progress segment from `previous` to the marker's
    // currently-animated position. Updated each rAF frame so the trail grows
    // at the same rate the marker moves, never ahead of it.
    const liveSegment = L.polyline([], {
      color: COLOR_ACCENT_CYAN,
      weight: 2,
      opacity: 1,
      interactive: false,
      lineCap: 'butt',
    });
    liveSegment.addTo(map);
    liveSegmentRef.current = liveSegment;

    const handleMoveStart = () => {
      if (programmaticPendingRef.current > 0) return;
      // Cursor-anchored zoom shifts the center as a side effect, firing
      // movestart even though the user is zooming, not panning. Skip those.
      if (isZoomingRef.current) return;
      onMapInteract();
    };
    const handleZoomStart = () => {
      isZoomingRef.current = true;
    };
    const handleZoomEnd = () => {
      isZoomingRef.current = false;
      // If this was a programmatic zoom (flyTo), the counter already covers it;
      // moveend will decrement. Re-anchor logic only applies to user zooms.
      if (programmaticPendingRef.current > 0) return;
      if (!followRef.current) return;
      const sample = currentSampleRef.current;
      if (!sample) return;
      // Defer to the next tick so the wheel-zoom's own moveend finishes before
      // our re-anchor flyTo's events start. Avoids event interleaving.
      window.setTimeout(() => {
        if (!followRef.current) return;
        const s = currentSampleRef.current;
        if (!s) return;
        programmaticPendingRef.current += 1;
        map.flyTo([s.lat, s.lon], map.getZoom(), { duration: 0.3 });
      }, 0);
    };
    const handleMoveEnd = () => {
      if (programmaticPendingRef.current > 0) {
        programmaticPendingRef.current -= 1;
      }
      const m = markerRef.current;
      if (!m) return;
      const onScreen = map.getBounds().contains(m.getLatLng());
      onMarkerVisibilityChange(onScreen);
    };

    map.on('movestart', handleMoveStart);
    map.on('zoomstart', handleZoomStart);
    map.on('zoomend', handleZoomEnd);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('zoomstart', handleZoomStart);
      map.off('zoomend', handleZoomEnd);
      map.off('moveend', handleMoveEnd);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (jumpTimeoutRef.current !== null) window.clearTimeout(jumpTimeoutRef.current);
      marker.remove();
      labelRef.current?.remove();
      liveSegment.remove();
      trailLayer.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;

    if (!state.current) {
      m.setOpacity(0);
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (jumpTimeoutRef.current !== null) {
      window.clearTimeout(jumpTimeoutRef.current);
      jumpTimeoutRef.current = null;
    }

    const sample = state.current;
    const target: [number, number] = [sample.lat, sample.lon];
    const prev = state.previous;
    const gapMs = prev ? sample.receivedAtMs - prev.receivedAtMs : Infinity;
    const shouldJump = !prev || gapMs > TRAIL_GAP_THRESHOLD_MS;
    const isFirstFix = lastSampleAtRef.current === null;

    const liveSeg = liveSegmentRef.current;

    if (shouldJump) {
      // Deliberate visual gap on long outage / first fix / tab resume.
      liveSeg?.setLatLngs([]);
      m.setOpacity(0);
      jumpTimeoutRef.current = window.setTimeout(() => {
        jumpTimeoutRef.current = null;
        m.setLatLng(target);
        m.setOpacity(1);
        if (followRef.current) {
          programmaticPendingRef.current += 1;
          // First-fix uses the introductory lock-on zoom; later jumps (e.g.,
          // tab-resume after hours) preserve whatever zoom the user has set.
          map.flyTo(target, isFirstFix ? ISS_LOCK_ZOOM : map.getZoom(), {
            duration: isFirstFix ? FLY_TO_DURATION_INITIAL_S : FLY_TO_DURATION_RECENTER_S,
          });
        } else {
          onMarkerVisibilityChange(map.getBounds().contains(target));
        }
        lastSampleAtRef.current = sample.receivedAtMs;
      }, 200);
    } else {
      m.setOpacity(1);
      const startMs = performance.now();
      const duration = Math.min(gapMs, 5000);
      const a = { lat: prev!.lat, lon: prev!.lon };
      const b = { lat: sample.lat, lon: sample.lon };
      // Skip the live segment for antimeridian-spanning tweens — drawing a
      // polyline whose endpoints wrap the seam would cut across the map.
      const wraps = Math.abs(b.lon - a.lon) > 180;
      if (wraps) {
        liveSeg?.setLatLngs([]);
      } else {
        liveSeg?.setLatLngs([[a.lat, a.lon], [a.lat, a.lon]]);
      }

      const tween = () => {
        const t = Math.min(1, (performance.now() - startMs) / duration);
        const [lat, lon] = shortPathInterp(a, b, t);
        m.setLatLng([lat, lon]);
        if (!wraps) liveSeg?.setLatLngs([[a.lat, a.lon], [lat, lon]]);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tween);
        } else {
          rafRef.current = null;
          if (followRef.current) {
            programmaticPendingRef.current += 1;
            map.panTo(target, { animate: true, duration: 0.4 });
          } else {
            onMarkerVisibilityChange(map.getBounds().contains(target));
          }
          lastSampleAtRef.current = sample.receivedAtMs;
        }
      };
      rafRef.current = requestAnimationFrame(tween);
    }
  }, [state.current?.receivedAtMs, map, onMarkerVisibilityChange, state.current, state.previous]);

  useEffect(() => {
    const layer = trailLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // Drop the newest point — the segment ending at it is owned by the live
    // segment polyline, which the marker tween updates each frame. This
    // prevents the historical trail from extending past the marker's
    // currently-animated position (CUJ-1 step 3).
    const history = state.trail.slice(0, -1);
    const segments = splitOnAntimeridian(history);
    for (const segment of segments) {
      if (segment.length < 2) continue;
      for (let i = 1; i < segment.length; i++) {
        const a = segment[i - 1];
        const b = segment[i];
        const gap = b.receivedAtMs - a.receivedAtMs;
        if (gap > TRAIL_GAP_THRESHOLD_MS) continue;

        const oldestIdx = state.trail.indexOf(a);
        const newestIdx = state.trail.length - 1;
        const denom = Math.max(1, newestIdx);
        const opacity = 0.1 + 0.9 * (oldestIdx / denom);

        const seg = L.polyline(
          [
            [a.lat, a.lon],
            [b.lat, b.lon],
          ],
          {
            color: COLOR_ACCENT_CYAN,
            weight: 2,
            opacity,
            interactive: false,
            lineCap: 'butt',
          },
        );
        seg.addTo(layer);
      }
    }
  }, [state.trail]);

  useEffect(() => {
    if (!state.follow) return;
    const sample = state.current;
    if (!sample) return;
    programmaticPendingRef.current += 1;
    // Recenter preserves the user's current zoom — zoom and Follow are
    // independent axes (CUJ-2 refined). Do NOT snap back to ISS_LOCK_ZOOM.
    map.flyTo([sample.lat, sample.lon], map.getZoom(), {
      duration: FLY_TO_DURATION_RECENTER_S,
    });
    // Only fire on follow flipping ON — sample-driven recentering is owned by the
    // marker-placement effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.follow]);

  return null;
}

export default function MapView(props: MapViewProps) {
  return (
    <MapContainer
      center={INITIAL_MAP_CENTER}
      zoom={INITIAL_MAP_ZOOM}
      worldCopyJump={true}
      zoomControl={false}
      attributionControl={true}
      preferCanvas={true}
      style={{ position: 'absolute', inset: 0, background: COLOR_BG_MAP }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapInner {...props} />
    </MapContainer>
  );
}
