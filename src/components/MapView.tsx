import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
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
  const rafRef = useRef<number | null>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const lastSampleAtRef = useRef<number | null>(null);

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

    const handleMoveStart = () => {
      if (!isProgrammaticMoveRef.current) onMapInteract();
    };
    const handleZoomStart = () => {
      if (!isProgrammaticMoveRef.current) onMapInteract();
    };
    const handleMoveEnd = () => {
      isProgrammaticMoveRef.current = false;
      const m = markerRef.current;
      if (!m) return;
      const latlng = m.getLatLng();
      const onScreen = map.getBounds().contains(latlng);
      onMarkerVisibilityChange(onScreen);
    };

    map.on('movestart', handleMoveStart);
    map.on('zoomstart', handleZoomStart);
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('zoomstart', handleZoomStart);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      marker.remove();
      labelRef.current?.remove();
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

    const target: [number, number] = [state.current.lat, state.current.lon];
    const prev = state.previous;
    const gapMs = prev ? state.current.receivedAtMs - prev.receivedAtMs : Infinity;
    const shouldJump = !prev || gapMs > TRAIL_GAP_THRESHOLD_MS;

    if (shouldJump) {
      m.setOpacity(0);
      window.setTimeout(() => {
        m.setLatLng(target);
        m.setOpacity(1);
        if (state.follow) {
          isProgrammaticMoveRef.current = true;
          map.flyTo(
            target,
            ISS_LOCK_ZOOM,
            {
              duration: lastSampleAtRef.current === null
                ? FLY_TO_DURATION_INITIAL_S
                : FLY_TO_DURATION_RECENTER_S,
            },
          );
        } else {
          const onScreen = map.getBounds().contains(target);
          onMarkerVisibilityChange(onScreen);
        }
        lastSampleAtRef.current = state.current!.receivedAtMs;
      }, 200);
    } else {
      m.setOpacity(1);
      const startMs = performance.now();
      const duration = Math.min(gapMs, 5000);
      const a = { lat: prev!.lat, lon: prev!.lon };
      const b = { lat: state.current.lat, lon: state.current.lon };

      const tween = () => {
        const t = Math.min(1, (performance.now() - startMs) / duration);
        const [lat, lon] = shortPathInterp(a, b, t);
        m.setLatLng([lat, lon]);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tween);
        } else {
          rafRef.current = null;
          if (state.follow) {
            isProgrammaticMoveRef.current = true;
            map.panTo(target, { animate: true, duration: 0.4 });
          } else {
            const onScreen = map.getBounds().contains(target);
            onMarkerVisibilityChange(onScreen);
          }
          lastSampleAtRef.current = state.current!.receivedAtMs;
        }
      };
      rafRef.current = requestAnimationFrame(tween);
    }
  }, [state.current?.receivedAtMs, state.follow, map, onMarkerVisibilityChange, state.current, state.previous]);

  useEffect(() => {
    const layer = trailLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const segments = splitOnAntimeridian(state.trail);
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
            color: '#22d3ee',
            weight: 2,
            opacity,
            interactive: false,
            lineCap: 'round',
          },
        );
        seg.addTo(layer);
      }
    }
  }, [state.trail]);

  useEffect(() => {
    if (!state.follow || !state.current) return;
    isProgrammaticMoveRef.current = true;
    map.flyTo([state.current.lat, state.current.lon], ISS_LOCK_ZOOM, {
      duration: FLY_TO_DURATION_RECENTER_S,
    });
  }, [state.follow, map, state.current]);

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
      preferCanvas={false}
      style={{ position: 'absolute', inset: 0, background: '#0a0f17' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapInner {...props} />
    </MapContainer>
  );
}
