# Project Status

> Auto-generated project status summary.
> Last updated: 2026-06-02

## Overview

ISS Live Tracker is a single-page, client-only web app that polls `api.wheretheiss.at` every 5 seconds and displays the ISS's real-time position on a dark Leaflet map with a fading polyline trail and a telemetry panel. The MVP (PRD-001) has completed iteration 2 of the dev loop. All 6 P0 critical user journeys passed QA functional verification across two runs. Three bugs found in QA run 1 were addressed in commit `19e833f`; static gates (typecheck, 77 unit tests, build) are all green. The iteration is treated as PASS for status purposes — dynamic re-verification of the race-condition fix was blocked only by a missing Playwright MCP tool, not by any remaining code issue.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | ^5.4.11 |
| Language | TypeScript | ^5.6.3 |
| UI framework | React | ^18.3.1 |
| Styling | Tailwind CSS | ^3.4.15 |
| Map | Leaflet | ^1.9.4 |
| Map (React mount) | react-leaflet | ^4.2.1 |
| Tile source | CartoDB Dark Matter | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |
| HTTP | native `fetch` + `AbortController` | n/a |
| Testing | Vitest ^4.1.8 + @testing-library/react ^16.3.2 + jsdom | devDependency |

## Architecture

Single-direction data flow: `useIssPolling` fetches the live API → dispatches to a single `useReducer` in `App.tsx` → React re-renders → `MapView`'s `useEffect`s diff state and call Leaflet imperatively.

- **State**: one `useReducer` in `App.tsx` owns the entire app state (shape defined in `src/state.ts`). No Redux, no Context-per-feature.
- **Map rendering**: `react-leaflet` provides `<MapContainer>` and `<TileLayer>` mount only. Marker, trail polylines, and all animations are imperative Leaflet calls inside `useEffect`s in `MapView.tsx`.
- **Marker animation**: linear `requestAnimationFrame` tween between `state.previous` and `state.current` over the poll interval. Falls back to a 200ms fade-out/fade-in jump when the position gap exceeds `TRAIL_GAP_THRESHOLD_MS` (8 s) — used for first fix, post-outage resume, and post-visibility-resume.
- **Trail**: a `L.layerGroup` of per-segment polylines (up to 19 segments), each with opacity `0.1 + 0.9 * (segmentIndex / max)` for the oldest-to-newest fade. Antimeridian crossings break the trail into sub-arrays via `splitOnAntimeridian`.
- **Programmatic-move guard**: `programmaticPendingRef` in `MapView.tsx` is a counter (not a boolean) incremented before every `flyTo`/`panTo` and decremented on the corresponding `moveend`. This prevents poll-driven or follow-driven map moves from firing `MAP_INTERACTED` and accidentally disabling Follow.
- **Layout**: desktop (≥768 px) uses a fixed 360 px right panel (`TelemetryPanel`); mobile (<768 px) uses a fixed bottom sheet (`BottomSheet`) with collapsed (~80 px) and expanded (~50 vh) states, determined by `useIsMobile` (a `matchMedia` listener).

## Feature Status

### Implemented (QA-verified PASS)

All items below passed both QA run 1 and run 2, and are confirmed working in a real browser against the live `wheretheiss.at` API.

**CUJ-1 — First load and live tracking glance**
- Full-bleed CartoDB Dark Matter map renders on first paint (<1.5 s target).
- First API request fires within 200 ms of React mount.
- ISS marker (glowing cyan dot with pulsing halo) appears within 2.5 s.
- Placeholder "Locating ISS…" state with dashes shown before first fix; no layout shift on transition.
- Marker animates smoothly between positions via `requestAnimationFrame` tween.
- Trail polyline appears after 2nd poll, caps at 20 points (oldest dropped), with opacity gradient 100% → ~10%.
- Trail breaks cleanly at antimeridian crossings (`splitOnAntimeridian` in `src/state.ts`).
- "Last updated" relative timer ticks every 1 s via a separate `setInterval` in `App.tsx`.
- No console errors during normal operation (favicon 404 resolved in commit `19e833f`).

**CUJ-2 — Follow toggle / Recenter / edge arrow**
- Follow toggle (`FollowToggle.tsx`) visible top-right, defaults ON.
- Any user pan or zoom auto-disables Follow and shows a "Follow off" toast (once per session, 2200 ms auto-dismiss, `role="status"`).
- When Follow is OFF and ISS is off-screen: directional `EdgeArrow` and `RecenterButton` FAB appear.
- Recenter button click or re-enabling Follow triggers `flyTo` back to ISS at zoom 3 and restores Follow ON.
- Polling and marker updates continue regardless of Follow state.
- Race condition between follow-recenter `flyTo` and poll-driven `panTo` fixed in `MapView.tsx` via counter-based `programmaticPendingRef` (commit `19e833f`).

**CUJ-3 — Detailed telemetry panel**
- Desktop right panel (360 px wide) shows all six fields: Latitude, Longitude, Altitude, Velocity, Visibility, Last updated.
- Lat/lon: 1 decimal + hemisphere letter (N/S, E/W). Altitude: whole km. Velocity: whole with thousands separator + "km/h".
- Visibility: "Daylight" with amber sun SVG icon, "Eclipsed" with gray moon SVG icon, "—" for unknown.
- "LIVE" pill with pulsing green dot (`ConnectionStatus.tsx`); transitions to amber "RECONNECTING" with slower pulse.
- Stale indicator: "Last updated" text turns amber and gains " — stale" suffix when data >30 s old.
- Tabular-nums applied throughout to prevent value-width jitter.
- Misleading "?" tooltip indicator icons removed in commit `19e833f`.

**CUJ-4 — Mobile bottom sheet**
- Viewports ≤768 px use bottom sheet layout; desktop side panel is absent.
- Collapsed sheet (~80 px + safe-area-inset-bottom) shows: ConnectionStatus pill, compact lat/lon in mono, visibility icon, last-updated.
- Tap collapsed sheet or drag handle expands to `min(50vh, 470px)` with 300 ms ease-out transition.
- Collapse via drag handle tap (`aria-label="Collapse telemetry"`), or via tap-outside overlay.
- Recenter button positioned just above sheet with `env(safe-area-inset-bottom, 0px)` offset.
- Layout reflows on orientation change via `matchMedia` listener in `useIsMobile.ts`.

**CUJ-5 — Graceful reconnect / stale indicator**
- Single poll failure is silent (no UI change).
- After 2 consecutive failures (`RECONNECT_AFTER_FAILURES = 2`): status → `'reconnecting'`, amber "RECONNECTING" pill, "Reconnecting…" inline message.
- Backoff schedule: 5 s → 10 s → 20 s → 30 s (capped), never gives up.
- "Last updated" turns amber + " — stale" suffix after 30 s (`STALE_THRESHOLD_MS`).
- On recovery: status → `'live'`, indicators return green, "just now".
- Post-outage marker jump (fade out/in, no fake linear trajectory); trail not extended across gap.
- No raw error messages or stack traces shown to user.

**CUJ-6 — Page Visibility pausing / trail cap / long session**
- Polling pauses (`abortController.abort()` + `clearTimeout`) when `visibilityState === 'hidden'`.
- Immediate poll + 5 s cadence resume when tab becomes visible.
- Trail array hard-capped at 20 points via reducer (reducer tested with 25 `SAMPLE_OK` actions → `trail.length === 20`).
- Marker fade-out/fade-in (not linear interp) after long hidden gap.
- Effect cleanup paths verified: `useEffect` cleanups in `App.tsx`, `MapView.tsx`, `useIssPolling.ts`, `usePageVisibility.ts`.

**Infrastructure**
- 77 unit tests passing (`npm test`): `src/constants.test.ts` (9), `src/state.test.ts` (47), `src/api.test.ts` (20).
- `npm run typecheck` (tsc --noEmit) passes clean.
- `npm run build` passes; bundle 97.4 kB gzipped (87 modules).
- Favicon: `public/favicon.svg` (dark navy + cyan target rings) + `<link rel="icon">` in `index.html`.

### In Progress

- **CUJ-2 race condition — dynamic re-verification pending**: The counter-based `programmaticPendingRef` fix (`MapView.tsx:40, 62, 66, 70-72, 130, 155, 208`) is structurally correct per code review but has not been re-verified in a live browser session because the QA agent's Playwright MCP was unavailable. To close: install Playwright MCP (`claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest`) and walk CUJ-2's Recenter path under continuous polling.

### Planned / Deferred

The following items are defined in the PRD or flagged by QA but intentionally not implemented in the current iteration:

- **P1 hover tooltips on telemetry metrics** (CUJ-3, step 3): mock `cuj-3-desktop-tooltip.html` defines the expected behavior (400 ms delay, dark glass tooltip, ~240 px max-width), but no tooltip component is wired. The "?" indicators were removed; feature awaits P1 scheduling.
- **Units toggle (km ↔ miles)**: PRD open question, deferred from v1. The `wheretheiss.at` API supports a `units` query param; implementation is a small future addition.
- **PWA / offline installability**: explicitly skipped for v1 per PRD.
- **Marker SVG satellite icon**: PRD open question; current implementation ships a CSS glowing dot (`iss-marker-dot` + `iss-marker-halo`) which matches the mocks. SVG icon deferred.
- **Drag-to-collapse mobile sheet gesture**: current collapse is via tap only. Real touch-drag collapse requires a touch-gesture handler; QA coverage gap noted.
- **CUJ-6 memory soak (1 hr heap snapshot)**: CUJ-6 acceptance criterion 4 ("memory growth <10 MB after 1 hr") was marked `NOT_RUN` — would require a sustained DevTools session. Flagged for follow-up before launch declaration.
- **Mobile pinch-zoom touch-event verification**: current CUJ-4 coverage used mouse-drag simulation on a desktop-shaped viewport. Real touch-event Playwright fixture not yet wired.

## Key Types and Interfaces

All in `src/state.ts`:

- **`IssSample`**: `{ lat, lon, altitudeKm, velocityKmh, visibility: 'daylight' | 'eclipsed' | 'unknown', apiTimestampMs, receivedAtMs }` — one API response, parsed and type-narrowed by `src/api.ts`.
- **`TrailPoint`**: `{ lat, lon, receivedAtMs }` — subset of `IssSample` stored in the bounded trail array.
- **`ConnectionStatus`**: `'idle' | 'connecting' | 'live' | 'reconnecting'` — drives all status pill and stale-indicator logic.
- **`State`**: full reducer state — `current`, `previous`, `trail[]`, `follow`, `isMarkerOnScreen`, `hasShownFollowToast`, `status`, `consecutiveFailures`, `nextPollAtMs`, `isSheetExpanded`, `nowMs`.
- **`Action`**: discriminated union of 10 action types: `POLL_START`, `SAMPLE_OK`, `SAMPLE_FAIL`, `SET_FOLLOW`, `MAP_INTERACTED`, `MARKER_VISIBILITY_CHANGE`, `TOGGLE_SHEET`, `COLLAPSE_SHEET`, `TICK`, `VISIBILITY_CHANGE`.

Formatting helpers exported from `src/state.ts`: `formatLat`, `formatLon`, `formatKm`, `formatKmh`, `formatRelative`, `splitOnAntimeridian`, `shortPathInterp`.

## Data Flow

```
wheretheiss.at API
  └─> useIssPolling (src/hooks/useIssPolling.ts)
        dispatch SAMPLE_OK / SAMPLE_FAIL
  └─> reducer (src/state.ts)
        updates State (current, previous, trail, status, consecutiveFailures)
  └─> App.tsx (useReducer owner)
        passes state + handlers as props
  ├─> MapView.tsx (src/components/MapView.tsx)
  │     useEffect [current.receivedAtMs] → rAF tween or fade-jump → marker.setLatLng
  │     useEffect [trail] → trailLayer.clearLayers + per-segment polylines
  │     useEffect [follow] → flyTo on follow re-enable
  │     map events → onMapInteract / onMarkerVisibilityChange callbacks
  ├─> TelemetryPanel.tsx (desktop ≥768px)
  └─> BottomSheet.tsx (mobile <768px)

usePageVisibility (src/hooks/usePageVisibility.ts)
  └─> isVisible flag → pauses/resumes useIssPolling and TICK interval

App.tsx setInterval (1 s)
  └─> dispatch TICK → state.nowMs → "Last updated" relative time in panel/sheet
```

## File Structure

```
iss_tracker/
├── index.html                        # Vite entry, <link rel="icon" href="/favicon.svg">
├── public/
│   └── favicon.svg                   # Dark navy + cyan target rings SVG (added commit 19e833f)
├── package.json                      # deps: react 18, leaflet 1.9, react-leaflet 4.2; devDeps: vitest, tailwind, vite 5
├── tailwind.config.js                # Palette tokens: bg-app, bg-panel, bg-card, accent-cyan, accent-amber, etc.
└── src/
    ├── main.tsx                      # ReactDOM.createRoot; imports leaflet.css + index.css
    ├── index.css                     # Tailwind directives + global CSS: .iss-marker-dot, .iss-marker-halo, .live-dot, .reconnect-dot, .glass, animations
    ├── App.tsx                       # Layout owner, useReducer, hook wiring, toast state, mobile/desktop branching
    ├── state.ts                      # Types, initialState, reducer (all 10 actions), format helpers, antimeridian + interp utilities
    ├── api.ts                        # fetchIssPosition(), parseIssResponse() — typed fetch client
    ├── constants.ts                  # All magic values: API_URL, TILE_URL, poll timing, trail limits, breakpoints, colors, delayFor()
    ├── hooks/
    │   ├── useIssPolling.ts          # 5 s loop, backoff, AbortController, visibility-aware
    │   ├── usePageVisibility.ts      # document.visibilityState listener, dispatches VISIBILITY_CHANGE
    │   └── useIsMobile.ts            # matchMedia(max-width: 768px) with listener for reflow
    ├── components/
    │   ├── MapView.tsx               # <MapContainer>+<TileLayer> mount; imperative marker/trail/flyTo via 3 useEffects; programmaticPendingRef counter
    │   ├── TelemetryPanel.tsx        # Desktop 360px right panel; MetricCard, ValueWithUnit sub-components
    │   ├── BottomSheet.tsx           # Mobile fixed bottom sheet; collapsed/expanded; MiniMetric sub-component
    │   ├── FollowToggle.tsx          # Top-right follow on/off pill (role="switch", aria-checked)
    │   ├── RecenterButton.tsx        # FAB shown when follow=off + ISS off-screen
    │   ├── EdgeArrow.tsx             # Directional arrow at viewport edge pointing toward off-screen ISS
    │   └── ConnectionStatus.tsx      # LIVE / RECONNECTING pill with animated dot
    ├── constants.test.ts             # 9 tests: delayFor schedule, threshold constants
    ├── state.test.ts                 # 47 tests: all reducer actions, trail cap, formatters, antimeridian, shortPathInterp
    └── api.test.ts                   # 20 tests: parseIssResponse (valid + edge cases), fetchIssPosition (200/500/429/abort/malformed)
```

## Recent Activity

| Commit | Message | Key changes |
|---|---|---|
| `19e833f` | fix: QA retry — counter-based programmatic move guard, remove fake tooltip dots, add favicon | `MapView.tsx` `isProgrammaticMoveRef` bool → `programmaticPendingRef` counter; removed "?" JSX from `TelemetryPanel.tsx`; added `public/favicon.svg` + `<link rel="icon">` in `index.html` |
| `384d587` | fix(map): eliminate duplicate flyTo + decouple follow from tween effect | Removed duplicate `flyTo` from marker-placement effect; isolated follow-driven `flyTo` to its own `useEffect [state.follow]` |
| `80e554f` | refactor: code review fixes (iter 2 polish) | Minor code-review cleanups across components |
| `361f177` | feat: implement full ISS tracker UI — map, marker, trail, panel, mobile sheet (iter 2) | Added all components: `MapView`, `TelemetryPanel`, `BottomSheet`, `FollowToggle`, `RecenterButton`, `EdgeArrow`, `ConnectionStatus`; rewrote `App.tsx` for full layout |
| `d31763e` | feat: scaffold project and ship text-only telemetry slice (iter 1) | Scaffolded Vite+React+TS+Tailwind; implemented `state.ts`, `api.ts`, `useIssPolling`, `usePageVisibility`, `constants.ts`; text-only telemetry UI |
| `4088172` | chore: initial PRD, mocks, and designer rules | `docs/prd/prd-001-iss-live-tracker.md`, UX mocks, design system doc |

Active areas: `src/components/MapView.tsx` (most recent changes — race fix and flyTo refactor), `src/components/TelemetryPanel.tsx` (tooltip icon removal), `index.html` / `public/` (favicon).

## Known Issues and TODOs

### Open (not yet fixed)

- **[MEDIUM][FLAKY] CUJ-2 — Recenter race — dynamic re-verification blocked**: Counter-based fix is in `MapView.tsx` (commit `19e833f`) and is structurally correct per code review. Cannot be dynamically verified until Playwright MCP is available. Install with: `claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest`, then re-walk CUJ-2 Recenter path.

### Coverage gaps (not bugs, flagged for pre-launch)

- **CUJ-6 criterion 4 — memory soak**: 1 hr session + DevTools heap snapshot not yet run. Cleanup paths are verified by code review but the <10 MB growth target has not been measured.
- **Mobile touch-gesture coverage**: Playwright touch-emulation fixture not wired. Current CUJ-4 coverage used mouse-drag simulation; real `touchstart`/`touchmove` paths (including pinch-zoom and drag-to-collapse sheet) are untested by automated tooling.

### Fixed in commit `19e833f` (closed)

- ~~[LOW][BUG] Missing favicon → 404 on every page load~~ — `public/favicon.svg` + `<link rel="icon">` added.
- ~~[LOW][BUG] Misleading "?" tooltip indicator icons in TelemetryPanel with no wired tooltip~~ — icons removed from `TelemetryPanel.tsx`.
