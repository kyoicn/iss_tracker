---
id: prd-001
title: ISS Live Tracker MVP
status: active
created: 2026-06-02
deprecation_reason:
---

# PRD-001: ISS Live Tracker MVP

## Overview

The MVP delivers the entire core product in a single page: a dark, full-bleed world map with the ISS rendered as a glowing marker, a fading polyline trail of recent positions, and a telemetry panel showing latitude, longitude, altitude, velocity, daylight/eclipse state, and last-updated time. The map auto-centers on the ISS by default; a "Follow" toggle lets the user pan freely. The page works on both desktop (~1200px viewport, side panel layout) and mobile (~390px viewport, bottom-sheet layout). All data comes from `https://api.wheretheiss.at/v1/satellites/25544`, polled every 5 seconds, with no API key and no signup.

## Motivation

See `docs/prd/index.md` — Product Vision. In short: existing trackers are either cluttered (n2yo, ISS Tracker .pl) or aesthetically dated (Spot The Station, ISS Info). There is a clear market opening for a single-purpose, beautifully-designed, instant-load tracker that respects the user's attention.

## Phased build note (dev order, not a CUJ)

The user-supplied implementation plan:
1. Scaffold Vite + React + Tailwind.
2. Get a single live fetch from `wheretheiss.at` printing to the screen (validates network + data shape).
3. Layer in the Leaflet map with a static marker.
4. Add polling + smooth marker animation.
5. Add the telemetry panel.
6. Add the Follow toggle and Recenter affordance.
7. Add the polyline trail.
8. Add graceful error handling and reconnect indicator.
9. Polish: mobile bottom sheet, attribution footer, loading states.

This sequencing is for engineering, not user-visible work. CUJs below describe the finished product.

## Data Source Reference

`GET https://api.wheretheiss.at/v1/satellites/25544` returns JSON:

```json
{
  "name": "iss",
  "id": 25544,
  "latitude": 50.11,
  "longitude": 118.07,
  "altitude": 408.05,         // kilometers
  "velocity": 27600.14,        // km/h
  "visibility": "daylight",    // or "eclipsed"
  "footprint": 4500.0,         // km
  "timestamp": 1717286400,     // unix seconds
  "daynum": 2460400.5,
  "solar_lat": 22.1,
  "solar_lon": -45.0,
  "units": "kilometers"
}
```

Rate limit: ~1 request/sec. We poll at 0.2 req/sec (every 5s), which leaves ample headroom and complies with the published limit. Response headers `X-Rate-Limit-*` should be respected if we ever observe 429 responses (treat 429 like any other transient failure — back off).

## CUJ Listing

| ID | Title | Status | Priority |
|---|---|---|---|
| CUJ-1 | First load and live tracking glance | [x] Complete | P0 |
| CUJ-2 | Zoom freely while following; pan to explore, recenter to return | [x] Complete | P0 |
| CUJ-3 | Read detailed telemetry to understand current ISS state | [~] In progress (P1 hover tooltip deferred) | P0 |
| CUJ-4 | Use the tracker on a phone (mobile bottom sheet) | [~] In progress (swipe/drag-to-collapse gesture deferred) | P0 |
| CUJ-5 | Lose connectivity, see graceful recovery | [x] Complete | P0 |
| CUJ-6 | Long-session ambient display — always polling, deep trail | [~] In progress (1 hr memory soak unmeasured) | P0 |

---

### CUJ-1: First load and live tracking glance

**Status**: [x] Complete
**Dependencies**: none
**Priority**: P0 (launch blocker)

#### Context
This is the dominant journey. A curious user opens the URL — possibly from a tweet, a Google search, or a saved bookmark — and wants to know "where is the ISS right now?" within seconds, without doing anything. If this journey is not delightful, the product fails.

#### Preconditions
- User navigates to the site URL in a modern browser with a working internet connection.
- No prior visit / no stored state required.
- User has not interacted with the page yet.

#### Journey Steps

1. **User action**: Navigates to the site URL.
   - **System response**: HTML + JS bundle loads. As soon as the React app mounts, the OpenStreetMap tiles begin rendering in the dark theme map area. Simultaneously, the app issues the first `GET https://api.wheretheiss.at/v1/satellites/25544` request.
   - **User sees**: A full-bleed dark-themed map of the world rendered immediately (no spinner, no splash). On desktop, the map fills the left/center area with a telemetry side panel on the right (~320px wide). On mobile, the map fills the viewport with a collapsed bottom-sheet bar at the bottom. Telemetry values show placeholder dashes ("—") with a subtle pulsing cyan glow, and a small label in the panel reads "Locating ISS…" in muted text.
   - **Details**: Map starts centered at lat 0, lon 0 (equator/prime meridian) at zoom level 2 so the whole world is visible. Map tiles use a dark style — either OSM "carto dark" alternative or a CSS filter (`filter: invert(0.92) hue-rotate(180deg) brightness(0.95)`) applied to default OSM tiles. The latter is acceptable for v1 if it preserves legibility. No layout shift between the placeholder state and the loaded state.

2. **User action**: Waits (passively) for the first data response.
   - **System response**: The API responds (typically 200–800ms). The map smoothly animates to center on the ISS's current lat/long at zoom level 3. The ISS marker appears at that position with a soft fade-in (200ms). The telemetry panel's placeholder dashes are replaced by the actual values: latitude, longitude, altitude (km), velocity (km/h), visibility ("Daylight" or "Eclipsed" with corresponding sun/moon icon), and "Last updated: just now."
   - **User sees**: The ISS marker — a small circular icon styled as a satellite silhouette (or a glowing dot if a stylized icon isn't ready) — pulsing softly in cyan (`#22d3ee`) at the position. A faint cyan glow halo surrounds it (12px blur, 40% opacity). The telemetry panel now shows real numbers. The "Last updated" timer starts ticking ("just now" → "1s ago" → "2s ago" …).
   - **Details**: First marker on screen target: under 2.5s from URL navigation. Map auto-pans using Leaflet's `flyTo` with a 1000ms duration easing.

3. **User action**: Waits 5 seconds.
   - **System response**: The next poll completes. The marker smoothly animates from its previous lat/long to the new lat/long over ~5000ms (matching the poll interval, so motion looks continuous). The trail polyline now has 2 points and draws a faint line behind the marker. Telemetry values update in place (no flash, just the number changing). "Last updated" resets to "just now."
   - **User sees**: A live-feeling map where the ISS is gliding across the world, leaving a fading trail behind it. The trail is a polyline in cyan that fades from full opacity at the marker's tail to transparent at the oldest point. After enough polls accumulate (up to 500 points), the trail extends behind the ISS showing roughly the last ~42 minutes of ground track.
   - **Details**: Marker animation interpolates linearly between known positions over the 5s interval. If a poll is delayed or late, the marker continues animating along its last computed trajectory but does not overshoot — it holds at the last known position and waits. Trail polyline has max 500 points; oldest point is dropped when a new one is added. Opacity gradient: newest segment 100%, oldest segment ~10%. Trail segments are drawn via Leaflet's canvas renderer so the cost stays constant regardless of length (see CUJ-6 AC #4).

4. **User action**: Watches passively, eventually closes the tab or moves on.
   - **System response**: No additional behavior. The page continues polling at 5s intervals as long as the tab is open and the OS allows timers to run — backgrounding does NOT pause polling (see CUJ-6).
   - **User sees**: Same as step 3, continuously updating.
   - **Details**: No analytics, no tracking pixels, no popups, no modals, no nags. The page does one thing.

#### Edge Cases & Error States
- **First API call fails (network or 5xx)**: Map stays at world view. Telemetry placeholders remain. After 2 consecutive failures, a small inline message appears in the telemetry panel: "Reconnecting…" in amber text (`#f59e0b`) with a small spinning icon. Polling continues with backoff (10s, then 20s, capped at 30s) until success. See CUJ-5 for the recovery sub-journey.
- **First API call returns malformed JSON**: Treated as a failed call — same path as network failure.
- **Tiles fail to load**: Leaflet shows its default broken-tile placeholder (light gray squares). The marker and trail still render correctly over them. We do not add custom tile-error handling for v1.
- **User is on a metered connection / data saver enabled**: We do not detect or adapt. Polling at 5s × ~1KB response = ~12KB/min, which is negligible.
- **Antimeridian crossing**: When two consecutive positions span the 180°/-180° longitude line (e.g., +179 → -179), the trail polyline does NOT draw a line across the entire map. The trail breaks at the crossing — the previous segment ends at the edge, and a new segment begins on the other side. The marker animation also handles the wrap by taking the shorter great-circle path visually (Leaflet's default `setLatLng` will jump; we apply the same break logic and re-anchor the marker without an interpolated sweep across the map).

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-1-desktop-initial.html` — desktop, just after tiles render, before first API response (placeholder telemetry, world view).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-1-desktop-loaded.html` — desktop, after first data fix (marker on map, telemetry populated, no trail yet).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-1-desktop-with-trail.html` — desktop, after ~10 polls (trail polyline visible, marker mid-orbit).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-1-mobile-initial.html` — mobile equivalent of initial state (collapsed bottom sheet).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-1-mobile-loaded.html` — mobile equivalent of loaded state.

#### Acceptance Criteria
- [x] Site loads to first paint in under 1.5s on a typical 4G connection (Lighthouse mobile).
- [x] Map tiles render with a dark visual treatment (either dark tile source or CSS filter), preserving legibility of country borders and major labels.
- [x] First API request to `wheretheiss.at` is fired within 200ms of React mount.
- [x] Marker appears on the map within 2.5s of URL navigation on a typical connection.
- [x] No layout shift occurs between placeholder and loaded telemetry states.
- [x] Marker smoothly animates (no jumps) between consecutive positions over ~5s.
- [x] Trail polyline appears after the second poll and grows to max 20 points, oldest dropped first.
- [x] Trail opacity fades from 100% at the newest segment to ~10% at the oldest.
- [x] Trail does not draw across the antimeridian — it breaks cleanly when longitude wraps.
- [x] Telemetry "Last updated" timer updates at least once per second showing relative time.
- [x] No console errors during normal operation. (Favicon 404 resolved in commit `19e833f`.)

---

### CUJ-2: Zoom freely while following; pan to explore, recenter to return

**Status**: [x] Complete (refined 2026-06-05 in commit `83e0b04`; verified in browser with wheel zoom + drag pan + Follow-toggle re-enable)
**Dependencies**: CUJ-1
**Priority**: P0 (launch blocker)

> Implementation note: the original `[MEDIUM][FLAKY]` race between the follow-recenter `flyTo` and the poll-driven `panTo` was fixed in commit `19e833f` by replacing the shared `isProgrammaticMoveRef` boolean with a counter (`programmaticPendingRef`) — see `src/components/MapView.tsx:40, 62, 66, 70-72, 130, 155, 208`. Code review confirms each programmatic move owns exactly one increment/decrement, so concurrent animations cannot leak a real `movestart` through to `onMapInteract`. Dynamic re-walk in a live browser was blocked by Playwright MCP unavailability in the QA agent's environment; recommend a one-shot re-walk (pan off-screen → click Recenter → wait through one poll → verify Follow stays ON) once Playwright MCP is installed.

#### Context
The map's only meaningful content is the ISS — there's no terrain to explore for its own sake. So the two viewport gestures carry different meanings: a **zoom** is the user saying "let me see the ISS at a different scale," and a **pan** is the user saying "let me look somewhere else for a moment." This CUJ decouples them: zooming keeps Follow ON and immediately re-anchors the map on the ISS at the new zoom level, while panning disables Follow so the user can explore without the map fighting back. A single Recenter affordance returns them to following — preserving whatever zoom level they chose.

#### Preconditions
- CUJ-1 is complete: the page is loaded, marker is visible, telemetry is populated.
- The Follow toggle is ON by default (map auto-centers on each poll at the current zoom level).

#### Journey Steps

1. **User action**: Zooms the map via scroll wheel, pinch, double-click, or keyboard `+` / `-`.
   - **System response**: Leaflet applies the zoom to the new level. Because zoom gestures anchor on the cursor (or pinch midpoint), the map center may have shifted off the ISS. Within the same tick, the app issues a short `flyTo([iss.lat, iss.lon], newZoom, { duration: 0.3 })` to re-anchor on the ISS at the new zoom. Follow remains ON. No toast, no toggle-state change, no other UI feedback.
   - **User sees**: The world appears to zoom in or out around the ISS marker — even if the cursor was offset from the marker, the ISS smoothly slides back to the screen center over ~300ms at the new zoom. The Follow toggle stays cyan/ON. Polling continues; the trail keeps growing; telemetry keeps ticking.
   - **Details**: Re-anchor duration is intentionally shorter than the Recenter flyTo (300ms vs 1500ms) so it reads as "the map staying with me at the new zoom" rather than a discrete jump. The re-anchor uses the counter-based `programmaticPendingRef` guard so it does not itself disable Follow. Zoom-out is unbounded by app logic — Leaflet's tile-source minimum applies. Zoom-in respects Leaflet's max tile zoom.

2. **User action**: Pans the map via mouse drag (desktop) or single-finger drag (touch).
   - **System response**: Map pans as dragged. Follow flips OFF on the first detected user-initiated `movestart`. On the first auto-disable of a given session, a small glass toast appears just below the Follow toggle: "Follow off — map won't auto-center." Toast auto-dismisses after 2s; subsequent pans within the same session do NOT re-show it. Polling continues; marker position keeps updating on the map but the map does NOT recenter.
   - **User sees**: The Follow toggle pill animates from cyan/ON to gray/OFF (~150ms). The "Follow off" toast fades in below the toggle (first time only). The map stays where the user dragged it. The ISS marker continues to glide based on incoming polls; it may drift toward or away from the viewport edge.
   - **Details**: Toggle position: top-right of the map, 16px from top and right edges. Size: ~120px wide × 32px tall, dark glass (`bg-slate-900/80 backdrop-blur`), 1px cyan border when ON, 1px gray border when OFF. Toast uses the same glass treatment, ~280px wide, 12px text.

3. **User action**: Continues to interleave pan and zoom gestures while Follow is OFF.
   - **System response**: Each pan keeps Follow OFF. Each zoom is applied but does NOT re-anchor on the ISS (the immediate re-anchor in step 1 only runs when Follow is ON). Polling continues. If the ISS marker drifts outside the current viewport, a directional edge arrow appears at the nearest viewport edge pointing toward the ISS, and the Recenter floating action button fades in at the bottom-right of the map.
   - **User sees**: The map stays where the user left it. When the marker drifts off-screen, a cyan ~24px chevron with a soft glow appears at the viewport edge pointing toward the ISS, rotating to track the bearing as the ISS moves. A 48px circular cyan Recenter button (white crosshair icon) appears in the bottom-right (~16px inset, above the attribution footer). On mobile, the Recenter button sits just above the bottom sheet with safe-area padding.
   - **Details**: Edge arrow position is computed from the line between the viewport center and the ISS lat/long, clipped to the viewport edge with a 16px inset. Recenter button visibility predicate: `(follow === false) && (iss is outside current viewport bounds)`. When ISS is on-screen with Follow OFF, neither arrow nor Recenter button are shown.

4. **User action**: Taps the Recenter button, OR re-taps the Follow toggle to turn it ON.
   - **System response**: The app reads the map's **current zoom level** and issues `flyTo([iss.lat, iss.lon], currentZoom, { duration: 1.5 })`. Follow flips back to ON. The edge arrow and Recenter button fade out (200ms) once Follow is ON.
   - **User sees**: The map smoothly glides to center on the ISS over ~1500ms, holding whatever zoom the user had chosen. The Follow toggle pill animates back to cyan/ON. Arrow and Recenter button disappear.
   - **Details**: The current-zoom preservation is the key difference from CUJ-1's first-load lock-on, which uses `ISS_LOCK_ZOOM=3` as an introductory framing. Recenter never resets to `ISS_LOCK_ZOOM`; the user's zoom is sacred once they've expressed a preference. The flyTo uses the counter-based programmatic-move guard so the concurrent next poll cannot leak a `movestart` and re-disable Follow.

5. **User action**: Continues using the tracker, freely interleaving zoom (Follow stays ON) and pan (Follow flips OFF, recover via Recenter).
   - **System response**: Each gesture has its own clean meaning per the rules above. Polling, telemetry, and trail behavior are unaffected throughout.
   - **User sees**: A map that respects intent — zoom doesn't penalize the user with a lost follow, pan doesn't fight the user with auto-recentering.
   - **Details**: No additional state to surface; the toggle, edge arrow, and Recenter button are the only chrome involved.

#### Edge Cases & Error States
- **User zooms but does not pan**: Follow STAYS ON. The map immediately re-anchors on the ISS at the new zoom level via a ~300ms `flyTo`. (This inverts the prior behavior where any zoom disabled Follow.)
- **User pinches on a touchscreen with finger drift (pan + zoom in the same gesture)**: The pan component disables Follow; the zoom component is applied. End state: Follow=OFF, zoom at the new level. The "immediate re-anchor" of step 1 does NOT run because Follow is now OFF.
- **User zooms out below `INITIAL_MAP_ZOOM=2` while following**: No special behavior — the map zooms out as requested and re-anchors on the ISS. Leaflet's default minimum zoom for OSM-style tiles (0) is allowed.
- **User zooms to Leaflet's max tile zoom while following**: Map stays centered on the ISS at max zoom; user sees a tile-resolution view around the sub-point. Acceptable.
- **User toggles Follow off but keeps the map centered on the ISS, then waits**: Map does not auto-recenter on next poll. As the ISS moves, it drifts away from center within the viewport. Eventually it leaves the viewport — arrow + Recenter button appear at that point.
- **Recenter while ISS is on-screen but Follow is OFF** (user panned slightly): Recenter still flies to the ISS at the **current zoom level** and flips Follow back ON. Zoom is preserved.
- **User pans, then API fails**: Same as CUJ-5 — "Reconnecting…" appears in the panel. The map remains where the user left it. Follow remains off.
- **User pans while Follow is on, then quickly stops**: Follow auto-disables on the first pan gesture. We do not "re-enable Follow if the user appears to have only nudged the map." Once off, it stays off until explicitly turned on again.
- **Touch device — user taps the marker accidentally**: Tap on marker does NOT disable Follow and does NOT show a popup in v1. The marker is non-interactive in v1. (Future: tap to show ISS info card.)

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-on.html` — default state, Follow toggle ON, marker centered.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-off-onscreen.html` — Follow OFF, marker still in viewport, no arrow/Recenter button.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-off-offscreen.html` — Follow OFF, marker off-screen, edge arrow and Recenter button visible.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-mobile-follow-off-offscreen.html` — mobile equivalent.

#### Acceptance Criteria
- [x] Follow toggle is visible in the top-right of the map at all times.
- [x] Toggle defaults to ON on page load.
- [x] User-initiated **pan** (mouse drag, single-finger touch drag) automatically switches Follow to OFF.
- [x] User-initiated **zoom** (scroll wheel, pinch, double-click, keyboard `+` / `-`) does NOT change Follow's state.
- [x] When Follow is OFF, the map does not auto-recenter on poll updates.
- [x] Polling and marker updates continue regardless of Follow state.
- [x] When Follow is OFF and the ISS marker is outside the viewport, a directional arrow appears at the nearest viewport edge pointing toward the marker.
- [x] When Follow is OFF and the ISS marker is outside the viewport, a Recenter floating button appears in the bottom-right of the map.
- [x] Tapping the Recenter button OR re-enabling Follow flies the map back to the ISS at the user's **current zoom level** (not reset to `ISS_LOCK_ZOOM`) over ~1500ms and turns Follow ON. (Race vs. concurrent poll fixed in `19e833f` via counter-based programmatic-move guard.)
- [x] A brief "Follow off" toast appears the first time Follow is auto-disabled in a session (max once per session is acceptable).
- [x] When Follow is ON and the user zooms via any gesture, the map immediately re-anchors on the ISS at the new zoom level via a ~300ms `flyTo`.

---

### CUJ-3: Read detailed telemetry to understand current ISS state

**Status**: [~] In progress — P1 hover-tooltip behavior (step 3) is intentionally not implemented in this iteration. The misleading "?" badge that previously suggested tooltips existed was removed in commit `19e833f`. All P0 panel behavior (steps 1 and 2) is complete and QA-verified.
**Dependencies**: CUJ-1
**Priority**: P0 (launch blocker)

> Spec deviation from text: AC #9 says "~320 px wide"; the shipped implementation is 360 px wide (`PANEL_WIDTH_PX`), per the resolved design decision in `docs/design/system.md`. This is intentional and not a regression.

#### Context
Beyond just "where," the user wants the essential numeric context — how high, how fast, day or night, when this was measured. This is what differentiates a tracker from a static map. The telemetry must be readable at a glance and obviously live.

#### Preconditions
- CUJ-1 is complete: page loaded, data has arrived at least once.

#### Journey Steps

1. **User action**: Looks at the telemetry panel.
   - **System response**: The panel displays six fields, each with a clear label and value:
     - **Latitude**: `50.11° N` (one decimal place, with hemisphere letter)
     - **Longitude**: `118.07° E` (one decimal place, with hemisphere letter)
     - **Altitude**: `408 km` (rounded to whole km)
     - **Velocity**: `27,600 km/h` (rounded to whole, with thousands separator)
     - **Visibility**: `Daylight` (with a sun icon ☀ in amber) or `Eclipsed` (with a moon icon 🌙 in muted gray)
     - **Last updated**: `just now` / `5s ago` / `12s ago` (live-updating relative time)
   - **User sees**:
     - On **desktop**: A right-hand side panel, ~320px wide, dark glass background (`bg-slate-950/90` with `backdrop-blur`). Header at top: "ISS — Zarya" in cyan, small "LIVE" pill in green with a pulsing dot to its right. Below the header, the six fields are stacked vertically, each as a row with the label in muted small caps (10px, `text-slate-400 uppercase tracking-wider`) and the value in monospace numerics (24px, `text-slate-100 font-mono tabular-nums`). Generous vertical spacing (~16px between rows). The visibility row shows the icon to the left of the value text.
     - On **mobile**: Collapsed bottom sheet shows a compact horizontal bar with: a small "LIVE" pulse dot, lat/long compact ("50.1°N 118.1°E"), and the visibility icon. A chevron indicates it's expandable. (See CUJ-4 for expanded state.)
   - **Details**: Tabular-nums prevents value width jitter when digits change. The "LIVE" pulse dot animates with a 1.5s breathing animation (opacity 0.5 → 1.0 → 0.5). The "Last updated" field updates on a 1-second interval (separate from the 5s poll) to keep the relative time accurate.

2. **User action**: Waits and observes values changing on subsequent polls.
   - **System response**: When a new poll completes, each numeric value updates in place. The "Last updated" resets to "just now." If the visibility state changed (e.g., daylight → eclipsed), the icon and text both update with a 200ms cross-fade.
   - **User sees**: Numbers smoothly tick over. Because of tabular-nums, no horizontal shift. The visibility icon transition is the most visually noticeable change when the ISS crosses the terminator.
   - **Details**: Do not animate numeric counts up/down (no "rolling odometer"). The value simply changes — the smooth marker motion on the map is the primary visual cue; the panel is the precise readout.

3. **User action**: (Desktop) Hovers over a telemetry value.
   - **System response**: A small tooltip appears below the value explaining what it represents and its unit. Example for Velocity: "Orbital speed relative to Earth's surface. The ISS completes one orbit roughly every 90 minutes."
   - **User sees**: Tooltip in dark glass treatment matching the panel, ~240px max width, 12px text, fades in after 400ms hover delay.
   - **Details**: Tooltips are desktop-only (not triggered by touch). They are nice-to-have polish; if cut, the CUJ still passes its primary acceptance criteria. Mark each tooltip's existence as P1 within this P0 CUJ.

#### Edge Cases & Error States
- **Visibility field missing or unrecognized value from API**: Show "—" for the value and "Unknown" as the label. Do not show an icon.
- **Latitude / longitude exactly at 0**: Show as `0.0° N` and `0.0° E` (do not omit the hemisphere letter).
- **Very stale data (>30s old)**: The "Last updated" value text turns amber (`#f59e0b`) and shows e.g. "45s ago — stale." See CUJ-5.
- **"LIVE" pill behavior during reconnect**: Pill changes from green "LIVE" to amber "RECONNECTING" with a different animation (slower pulse, ~3s breathing). See CUJ-5.

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-3-desktop-panel-daylight.html` — desktop telemetry panel showing all fields, visibility = Daylight.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-3-desktop-panel-eclipsed.html` — same panel, visibility = Eclipsed.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-3-desktop-tooltip.html` — panel with a hover tooltip visible on the Velocity row.

#### Acceptance Criteria
- [x] Telemetry panel renders all six fields with correct labels and units.
- [x] Latitude and longitude show one decimal place and the correct hemisphere letter (N/S, E/W).
- [x] Altitude is rounded to whole km and displayed with "km" suffix.
- [x] Velocity is rounded to whole and displayed with thousands separator and "km/h" suffix.
- [x] Visibility shows "Daylight" with a sun icon (amber) OR "Eclipsed" with a moon icon (gray).
- [x] "Last updated" displays relative time and updates every second.
- [x] Numeric values use tabular-nums so they don't shift horizontally when digits change.
- [x] A "LIVE" pill with a pulsing green dot is visible in the panel header when polling is healthy.
- [x] On desktop, panel is fixed at right side, 360 px wide (resolved upward from "~320 px"), dark glass treatment.
- [ ] (P1) Hover tooltips on desktop explain each metric. — **Deferred.** Mock `cuj-3-desktop-tooltip.html` defines target behavior (400 ms delay, dark glass tooltip, ~240 px max-width). No tooltip component is wired and no metric currently has an `onMouseEnter` handler or `title` attribute. The misleading "?" badge that previously implied this feature was removed in commit `19e833f` to avoid false affordance signaling.

---

### CUJ-4: Use the tracker on a phone (mobile bottom sheet)

**Status**: [~] In progress — tap-to-expand / tap-to-collapse and tap-outside-overlay paths are complete and QA-verified. **Swipe-up to expand and swipe-down/drag-to-collapse touch gestures are not implemented** — the spec in step 2 lists "swipes the bottom sheet upward, OR taps anywhere on the collapsed bar" and step 2's collapse list includes "swiping down"; only the tap paths exist. QA's pinch-zoom verification used mouse-drag simulation on a desktop-shaped viewport; real touch-event Playwright coverage is also a gap.
**Dependencies**: CUJ-1, CUJ-3
**Priority**: P0 (launch blocker)

#### Context
Roughly half of casual visits will be from phones — someone in bed, on a couch, at a desk grabbing their phone. The mobile experience must feel native and considered, not a squished version of the desktop layout. The map should dominate, and telemetry should be available without cluttering the view.

#### Preconditions
- User is on a viewport ≤768px wide (typically a phone).
- Page is loaded and first data has arrived.

#### Journey Steps

1. **User action**: Opens the URL on a phone.
   - **System response**: Same data flow as CUJ-1. The layout uses the mobile variant: map fills the viewport edge-to-edge; a bottom sheet sits at the bottom of the screen in collapsed state.
   - **User sees**:
     - Full-bleed dark map filling the entire viewport.
     - Top-right: the "Follow ISS" toggle (same as desktop but slightly smaller, ~100px wide).
     - Bottom: a collapsed bottom sheet, ~80px tall, with rounded top corners (16px radius), dark glass background. The sheet contains: a small chevron-up indicator centered at top (signaling it expands), then a single row: pulsing green "LIVE" dot, compact lat/long ("50.1°N 118.1°E" in mono), visibility icon (sun/moon), and "5s ago" on the right.
     - The OSM attribution sits in the bottom-left of the map, above the bottom sheet (Leaflet default placement, adjusted with CSS so it's not occluded).
   - **Details**: Bottom sheet uses `position: fixed; bottom: 0; left: 0; right: 0;`. Safe-area-inset-bottom respected for iPhone notch/home-indicator devices. The sheet has a subtle top shadow for depth.

2. **User action**: Swipes the bottom sheet upward, OR taps anywhere on the collapsed bar.
   - **System response**: Bottom sheet expands smoothly (300ms ease-out) to ~50% viewport height, revealing the full telemetry: latitude, longitude, altitude, velocity, visibility, last updated — same six fields as CUJ-3, in a 2-column grid (mobile) with adequate spacing. The chevron rotates 180° to indicate the new "collapse" affordance.
   - **User sees**: Bottom sheet now covers the lower half of the screen. Map is still visible above. Each telemetry field shows label (small caps, muted) above value (mono, 20px). The "ISS — Zarya" header appears at the top of the expanded sheet. A subtle drag handle (pill, ~36×4px) sits at the top of the sheet.
   - **Details**: Expanded sheet allows vertical scroll within itself if content overflows (it shouldn't in v1 with 6 fields). Tapping the drag handle, swiping down, or tapping the map area outside the sheet collapses it back to the bar.

3. **User action**: Pinches to zoom the map.
   - **System response**: Map zooms with the pinch. Follow toggle auto-disables (same as CUJ-2). If the sheet is expanded, the pinch is captured by the map (sheet does not interfere). If the user touches inside the sheet, the sheet handles the gesture (vertical swipe to collapse).
   - **User sees**: Same Recenter button + edge arrow affordance as CUJ-2, but the Recenter button is positioned just above the bottom sheet (with safe-area padding) instead of the bottom-right of the map.
   - **Details**: Gesture conflict handled by checking touch start target: if inside the sheet bounds, sheet handles it; if outside, map handles it.

4. **User action**: Rotates phone to landscape.
   - **System response**: Layout reflows. Bottom sheet collapses (if expanded) and becomes shorter (~64px). The Follow toggle moves with the layout.
   - **User sees**: Map fills the wider landscape viewport. Bottom sheet still pinned to the bottom. All controls remain accessible.
   - **Details**: We do not switch to the desktop side-panel layout on landscape mobile — the bottom sheet pattern stays. Switch to side panel only at ≥768px viewport width.

#### Edge Cases & Error States
- **Very small phone (e.g., 320px iPhone SE 1st gen)**: Layout still works; lat/long compact display may wrap to two lines on the collapsed bar — acceptable.
- **User opens the keyboard somehow (e.g., autofill)**: Not applicable — no inputs in v1.
- **Sheet expanded while orientation changes**: Sheet collapses automatically to avoid bad layout.
- **Touch events on the OSM attribution link**: Link works as expected (opens openstreetmap.org). It's positioned to not interfere with the sheet's drag handle.

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-4-mobile-collapsed.html` — collapsed bottom sheet, daylight state.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-4-mobile-expanded.html` — expanded bottom sheet, full telemetry visible.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-4-mobile-landscape.html` — landscape orientation, bottom sheet shortened.

#### Acceptance Criteria
- [x] On viewports ≤768px wide, the layout uses a bottom-sheet pattern; the desktop side panel is NOT rendered.
- [x] The map fills the full viewport behind the sheet.
- [x] Collapsed bottom sheet is ~80px tall and shows: live indicator, compact lat/long, visibility icon, last-updated.
- [x] Tapping the collapsed sheet or its chevron expands it smoothly to ~50% viewport height showing all six telemetry fields.
- [ ] Expanded sheet can be collapsed by tapping the chevron, dragging down, or tapping outside. — **Partial.** Tap-chevron and tap-outside paths work. **Drag-down gesture is not implemented** — no `touchstart`/`touchmove` handler in `BottomSheet.tsx`.
- [x] Follow toggle is positioned in the top-right, accessible without overlap from system UI.
- [x] Recenter button (when shown) is positioned just above the bottom sheet with safe-area padding.
- [x] Layout respects iPhone safe-area-inset for notch and home-indicator devices.
- [x] Pinch-zoom works and disables Follow as expected. (QA verified via mouse-drag simulation on a desktop-shaped viewport; real touch-event coverage is a gap, not a behavior failure.)
- [x] Layout reflows correctly on portrait/landscape rotation.

---

### CUJ-5: Lose connectivity, see graceful recovery

**Status**: [x] Complete
**Dependencies**: CUJ-1, CUJ-3
**Priority**: P0 (launch blocker)

#### Context
The user might lose Wi-Fi briefly, suspend their laptop, walk into an elevator, or hit a transient API blip. The product promise is: never crash, never look broken, always come back when the network does. This journey defines that recovery experience.

#### Preconditions
- CUJ-1 is complete: page has loaded and shown at least one successful data update.
- The user does nothing different — connectivity changes are environmental.

#### Journey Steps

1. **User action**: (Implicit) Loses network connection mid-session. The next scheduled poll fails (network error, timeout, or non-2xx response).
   - **System response**: First failure is silent. The marker holds at its last known position. The trail does not extend. Telemetry values remain visible but the "Last updated" timer continues to count up ("5s ago", "6s ago"…). A retry is scheduled in 5s.
   - **User sees**: Visually nothing changes. Marker stays put. "Last updated" continues counting.
   - **Details**: Rationale for silent first failure — single-poll blips are common on flaky connections and would be visually noisy. We don't alarm the user until a pattern is confirmed.

2. **User action**: (Implicit) Second consecutive poll fails (10s of stale data).
   - **System response**: Reconnect state activates. The "LIVE" pill in the header changes to "RECONNECTING" in amber (`#f59e0b`) with a slower pulse animation (3s breathing). The "Last updated" text turns amber. A small inline message appears in the telemetry panel below the header: "Reconnecting…" with a small amber spinner icon. Backoff begins: next retry in 10s.
   - **User sees**: Subtle but unmistakable shift from green/cyan tones to amber in the status indicator and timestamp. Marker still holds at last position; trail remains visible but does not extend.
   - **Details**: Backoff schedule: 5s (poll N+1, silent), 5s (poll N+2, activate reconnecting), 10s (poll N+3), 20s (poll N+4), 30s (poll N+5+, capped). Never give up — keep retrying every 30s until success or page closed.

3. **User action**: (Implicit) Data becomes >30s stale.
   - **System response**: The "Last updated" text now shows e.g. "32s ago — stale" with the "— stale" suffix in amber.
   - **User sees**: Clear visual confirmation that the displayed numbers are not current. No misleading impression of real-time data.
   - **Details**: The threshold of 30s is chosen because polling at 5s means anything older than 30s implies at least 5 consecutive missed polls — clearly a sustained issue.

4. **User action**: (Implicit) Network restored. Next retry succeeds.
   - **System response**: Polling immediately returns to 5s cadence. The "RECONNECTING" pill returns to "LIVE" green. The amber inline message disappears. The map smoothly animates the marker from its held position to the new (likely far away, since the ISS has been moving) position over 1500ms using `flyTo` if Follow is on, or by extending the trail with a new segment (with antimeridian handling per CUJ-1). The "Last updated" resets to "just now" in default styling.
   - **User sees**: Status returns to healthy. Marker glides to its true current position. If the user had been watching, the visual feedback is immediate and reassuring.
   - **Details**: Important — when reconnecting after a long outage, the new position may be very far from the held position. We do NOT animate the marker linearly across the entire interval (that would create a fake-trajectory illusion). Instead, we treat it as a "jump" — the marker fades out at the old position (200ms), fades in at the new position (200ms), and a new trail segment begins. The historical trail polyline is NOT extended across the gap; the gap is left blank. (Future enhancement: visualize gap with a dashed line.)

#### Edge Cases & Error States
- **API returns 429 (rate limited)**: Treated as a transient failure — backoff applies. Should not happen at 5s polling, but defended against.
- **API returns 500 / 502 / 503**: Same as network failure — backoff and retry.
- **API returns 200 with malformed JSON**: Same as failure.
- **Browser tab goes to background (Page Visibility API)**: Polling continues at 5 s; the app does NOT pause on `visibilitychange`. (See CUJ-6 — covered in detail there.)
- **User has been disconnected for hours, comes back**: Same recovery path. Trail history is preserved (last 20 positions before the outage are still shown), the new segment starts at the post-reconnect position.
- **Page never gets a successful initial fetch**: After 2 failures, "Reconnecting…" replaces "Locating ISS…" in the placeholder panel. Map remains at world view. Marker never appears until first success. CUJ-1's path then resumes.

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-desktop-reconnecting.html` — desktop, reconnecting state visible (amber pill, stale timestamp, inline message).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-mobile-reconnecting.html` — mobile equivalent (amber indicator in collapsed sheet).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-desktop-stale-30s.html` — stale-data state ("32s ago — stale" visible).

#### Acceptance Criteria
- [x] A single poll failure does not surface any UI change.
- [x] After 2 consecutive failures, the "LIVE" pill becomes "RECONNECTING" in amber and an inline "Reconnecting…" message appears in the telemetry panel.
- [x] Backoff schedule on failures is: 5s, 10s, 20s, 30s (capped). Never gives up.
- [x] "Last updated" text turns amber and gains " — stale" suffix when data is >30s old.
- [x] On first successful retry, polling returns to 5s cadence, indicators return to green/cyan, "Last updated" resets to "just now".
- [x] When the marker's new post-reconnect position is far from the held position, it fades out and fades in (no fake-trajectory linear interpolation).
- [x] The trail polyline is not extended across the outage gap.
- [x] The trail's pre-outage history (up to 20 points) is preserved.
- [x] No raw error message or stack trace is ever shown to the user.
- [x] Application never enters a blank/white/crashed state regardless of network conditions.

---

### CUJ-6: Long-session ambient display — always polling, deep trail

**Status**: [~] In progress (implemented 2026-06-05 in iter-4; 1 hr memory soak AC #6 still pending manual DevTools verification)
**Dependencies**: CUJ-1, CUJ-5
**Priority**: P0 (launch blocker — confirmed by user as v1 scope)

#### Context
A meaningful share of enthusiast users will leave the page open on a second monitor, a kitchen tablet, or a background tab — checking it occasionally over hours. The product promise for this audience is "real-time tracker, always live": when the user glances back at the tab, the ISS marker and telemetry should already be current. Any "X minutes ago" stale-amber intermediate, fade-jump, or "welcome back" reconciliation breaks that promise. Polling must therefore continue whenever the OS permits — `document.visibilityState` is irrelevant to the polling cadence. A complementary value is a **deep visible history**: when the user returns, the cyan trail should show a meaningful slice of the recent orbit (~half an orbit, ~42 minutes) so they can immediately read where the ISS has been.

#### Preconditions
- CUJ-1 is complete: page is loaded and tracking; the first fix has landed, the marker is glowing, and the trail has started.
- The user has the tab open in a browser the OS has not suspended.

#### Journey Steps

1. **User action**: Opens the tab and lets CUJ-1 complete (first fix, lock-on, marker glow, trail begins).
   - **System response**: Polling runs at the 5 s cadence and the 1 s "Last updated" tick runs alongside it. The trail array begins accumulating positions.
   - **User sees**: Normal CUJ-1 steady state: live marker gliding, telemetry ticking, trail growing behind the marker.
   - **Details**: Trail rendering uses Leaflet's canvas renderer (`preferCanvas: true` on map init, or a `L.canvas()` renderer explicitly passed to the polyline) so segments are drawn to a single canvas rather than as per-segment SVG nodes. This is what makes the 500-point cap feasible without DOM bloat.

2. **User action**: Switches to another browser tab, minimizes the window, or otherwise hides this tab (`document.visibilityState === "hidden"`).
   - **System response**: Polling continues at 5 s. The 1 s tick continues. The reducer keeps appending new positions to the trail; when the trail reaches 500 points it drops the oldest on each append. No `visibilitychange` handler suspends, throttles, or otherwise modifies any timer. The app takes no action (Wake Lock API or otherwise) to keep the device from sleeping.
   - **User sees**: Nothing (tab is hidden).
   - **Details**: `requestAnimationFrame` is paused by the browser while the tab is hidden, so the in-flight marker tween freezes. New samples still arrive; each one cancels the prior tween's rAF and schedules a new one (existing useEffect cleanup pattern in `MapView.tsx`). When the tab becomes visible again, only the most-recent tween runs, from its captured `prev`/`current` pair — so the marker arrives at the correct current position (or fade-jumps if the gap exceeds the CUJ-5 threshold).

3. **User action**: After ~10 minutes the user returns to the tab.
   - **System response**: No tab-visible recovery is performed because nothing was paused. The most-recent poll's data is already in state; the marker's last queued tween resumes/starts and lands at the current position; telemetry reflects the latest fix.
   - **User sees**: The marker is already at the ISS's current position. Telemetry reads "just now" (or "5s ago" if the user catches the page just before the next poll), in the normal cyan/green styling — **no amber "5m ago", no stale state, no fade-jump**. The cyan trail extends behind the marker showing the last ~10 minutes (~120 points) of ground track.
   - **Details**: This is the central payoff of the always-on design. The longer the absence, the more dramatic the trail behind the marker, up to the 500-point cap.

4. **User action**: Leaves the page running continuously for many hours (overnight, all-day ambient display).
   - **System response**: The trail array stays bounded at 500 points; the oldest position is dropped on each new append. Polling continues at 5 s. The canvas renderer redraws the bounded polyline each frame at constant cost — no DOM node accumulation. Memory footprint stays roughly constant.
   - **User sees**: A continuously updating live tracker with a long cyan trail showing the last ~42 minutes (~half an orbit) of ground track behind the marker, indistinguishable in behavior from a freshly-loaded page.
   - **Details**: 500 points × 5 s/point ≈ 2500 s ≈ 41.7 minutes. The ISS's orbital period is ~92 minutes, so ~42 minutes of trail covers slightly less than half an orbit — visually a long arc spanning multiple continents. Implementation note for engineers: ensure React effect cleanup correctly clears timers on unmount, and that Leaflet layer cleanups (`marker.remove()`, `polyline.remove()`) run when components unmount. Replace the trail polyline via `setLatLngs(boundedArray)` rather than recreating it on each tick.

5. **User action**: (Implicit) The OS puts the device to sleep (laptop lid closed, phone screen off long enough for app suspension, etc.). Some time later the device wakes.
   - **System response**: While the device is sleeping, browser timers are stopped by the OS — the app does not fight this. On wake, the browser fires the overdue `setTimeout` immediately (standard browser behavior), which triggers one fetch. If the `receivedAtMs` gap between the previous successful sample and the new one exceeds `TRAIL_GAP_THRESHOLD_MS = 8 s`, the marker fade-jumps to the new position per the existing CUJ-5 gap-skip logic, and the trail does not bridge the sleep gap. Normal 5 s cadence resumes.
   - **User sees**: On the first glance after wake, a brief fade-out at the pre-sleep position and fade-in at the post-sleep position; the trail before the sleep gap remains visible up to the cap, but no segment connects across the gap. Within 5 s normal motion resumes.
   - **Details**: This is the one scenario where the user can observe a fade-jump in the always-on design, and it is the right behavior — the gap is real, not a polling artifact.

#### Edge Cases & Error States
- **Device sleeps and wakes**: Timers stop OS-side. On wake, the browser fires the overdue `setTimeout` immediately; one fetch happens, and a fade-jump is applied if the receivedAtMs gap exceeds 8 s. The app does NOT use the Wake Lock API or any other mechanism to keep the device awake.
- **Tab visible but window completely occluded**: Polling continues (always-on). Visibility ≠ focus ≠ occlusion; none of them affect polling.
- **User opens many tabs of this page**: Each tab polls independently at 0.2 req/sec. 5 tabs ≈ 1 req/sec which is at the published API limit; 10+ tabs from the same IP may trigger transient `429` responses, which are handled by the existing CUJ-5 backoff path. We do not coordinate across tabs.
- **Browser throttles `setTimeout` in background tabs**: Chrome typically clamps the minimum to ~1 s when a tab is hidden, and as aggressively as ~1 minute under battery saver / energy-efficiency modes. Our 5 s cadence is above the 1 s floor so it is usually unaffected, but under aggressive throttling the cadence may slip. The existing `gap > 8 s → fade-jump` reducer rule absorbs this gracefully without any special handling.
- **Marker tween while tab hidden**: `requestAnimationFrame` is paused by the browser. New samples continue arriving; each cancels the prior tween's rAF and schedules a new one (existing cleanup pattern). When the tab becomes visible, only the LAST queued tween runs, from its captured `prev`/`current` pair — so the marker smoothly arrives at the most-recent position (or fade-jumps if the gap > 8 s).
- **Trail at 500-point cap during a fade-jump**: Cap behavior is unchanged — the new post-gap point is appended, the oldest is dropped, and the gap is simply a non-connected break in the polyline (per CUJ-5).

#### Mocks / Reference Designs
[needs-mocks]

Mocks for this CUJ:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-6-desktop-after-resume.html` — **STALE.** Depicts a brief "5m ago" amber stale-state and fade-jump during tab resume, neither of which occurs in the revised always-on design. Replace with `cuj-6-desktop-long-trail.html` (below) and delete this file once the replacement is drawn.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-6-desktop-long-trail.html` — desktop, tab in the foreground after a long ambient session. Marker is at its current position with normal cyan styling and the standard "just now" / "5s ago" cyan timestamp (no amber, no stale state). A long cyan polyline trail extends behind the marker showing ~42 minutes (~500 points) of ground track spanning multiple continents — visualizing slightly less than half an orbit. This is the headline visual for the "always live" promise.

#### Acceptance Criteria
- [x] Polling continues at the 5 s cadence regardless of `document.visibilityState` (no `visibilitychange` handler suspends or modifies the poll timer).
- [x] The 1 s "Last updated" tick interval likewise continues regardless of `document.visibilityState`.
- [x] The app takes no explicit action (Wake Lock API or otherwise) to prevent OS-level device sleep.
- [x] No tab-visible recovery handling is implemented — polling never stops on the app's side. When the OS suspends timers (device sleep), the browser fires the overdue `setTimeout` on wake (standard browser behavior) and the normal cadence resumes from that fetch.
- [x] Trail array never grows beyond 500 points; the oldest point is dropped first when capacity is reached.
- [ ] After 1 hour of continuous use, memory growth is within ~10 MB of baseline (verified via DevTools heap snapshot), despite the 25× larger trail cap. — **Not measured.** Carries forward from iter-2: requires a manual ~1 hr DevTools heap snapshot session that the autonomous loop can't run. No leaks identified in code review; the only growth surface is the trail array (bounded at 500) and the single reused canvas element.
- [x] Trail polyline segments are rendered via Leaflet's canvas renderer (`preferCanvas: true` or an explicit `L.canvas()` renderer) so DOM node count and per-frame paint cost stay constant regardless of trail length.
- [x] When a fetch returns after an OS-induced timer suspension and the resulting `receivedAtMs` gap exceeds `TRAIL_GAP_THRESHOLD_MS = 8 s`, the marker fade-jumps (per CUJ-5's gap-skip logic) rather than linearly interpolating across the gap. — Existing CUJ-5 gap-skip logic in `MapView.tsx` already handles this; no new code path needed.
- [x] No timers, listeners, or Leaflet layers leak on component unmount (verified via React StrictMode double-mount behavior).

---

## Dependency Graph

```
CUJ-1 (first load)
  ├── CUJ-2 (follow toggle)
  ├── CUJ-3 (telemetry detail)
  │     └── CUJ-4 (mobile bottom sheet) ── depends on CUJ-1 + CUJ-3
  └── CUJ-5 (reconnect) ── depends on CUJ-1 + CUJ-3
        └── CUJ-6 (long session) ── depends on CUJ-1 + CUJ-5
```

CUJ-1 is the root. All P0 CUJs must be complete before launch. CUJ-6 (P1) is technically launchable without — but is strongly recommended before "1.0" given the audience's likely usage pattern.

## Resolved Decisions

- **Dark map style**: **CartoDB Dark Matter** (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`). Free, OSM-based, designed for dark themes. Attribution: standard OSM + "© CARTO".
- **Follow auto-disable on pan/zoom**: **confirmed**. Any user-initiated pan or zoom flips Follow to OFF and surfaces the brief toast (per CUJ-2 step 1).
- **CUJ-6 in v1 scope**: **confirmed**. Always-on polling (no `visibilitychange` pause), 500-point trail with canvas rendering, and OS-sleep gap-jump behavior are launch-blocking. (Earlier iteration paused polling on `visibilitychange`; reversed 2026-06-05 because the "ambient display, always live" promise required the marker to be current the instant the user looks back.)

## Open Questions

- **Marker icon**: do we use a stylized satellite SVG or a simple glowing dot? Decision deferred to design (mocks).
- **PWA installability**: skip for v1 — adds complexity. Revisit if usage warrants.
- **Telemetry units toggle (km ↔ miles)**: skip for v1. The API supports a `units` query param so it's a small future addition.
