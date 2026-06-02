---
id: prd-001
title: ISS Live Tracker MVP
status: draft
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
| CUJ-1 | First load and live tracking glance | [ ] Not started | P0 |
| CUJ-2 | Toggle Follow off to explore the map, then recenter | [ ] Not started | P0 |
| CUJ-3 | Read detailed telemetry to understand current ISS state | [ ] Not started | P0 |
| CUJ-4 | Use the tracker on a phone (mobile bottom sheet) | [ ] Not started | P0 |
| CUJ-5 | Lose connectivity, see graceful recovery | [ ] Not started | P0 |
| CUJ-6 | Leave the tab open for hours as ambient display | [ ] Not started | P0 |

---

### CUJ-1: First load and live tracking glance

**Status**: [ ] Not started
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
   - **User sees**: A live-feeling map where the ISS is gliding across the world, leaving a fading trail behind it. The trail is a polyline in cyan that fades from full opacity at the marker's tail to transparent at the oldest point. After enough polls accumulate (up to 20 points), the trail extends behind the ISS showing its recent ground track.
   - **Details**: Marker animation interpolates linearly between known positions over the 5s interval. If a poll is delayed or late, the marker continues animating along its last computed trajectory but does not overshoot — it holds at the last known position and waits. Trail polyline has max 20 points; oldest point is dropped when a new one is added. Opacity gradient: newest segment 100%, oldest segment ~10%.

4. **User action**: Watches passively, eventually closes the tab or moves on.
   - **System response**: No additional behavior. The page continues polling at 5s intervals as long as the tab is open and visible. (See CUJ-6 for tab-backgrounded behavior.)
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
- [ ] Site loads to first paint in under 1.5s on a typical 4G connection (Lighthouse mobile).
- [ ] Map tiles render with a dark visual treatment (either dark tile source or CSS filter), preserving legibility of country borders and major labels.
- [ ] First API request to `wheretheiss.at` is fired within 200ms of React mount.
- [ ] Marker appears on the map within 2.5s of URL navigation on a typical connection.
- [ ] No layout shift occurs between placeholder and loaded telemetry states.
- [ ] Marker smoothly animates (no jumps) between consecutive positions over ~5s.
- [ ] Trail polyline appears after the second poll and grows to max 20 points, oldest dropped first.
- [ ] Trail opacity fades from 100% at the newest segment to ~10% at the oldest.
- [ ] Trail does not draw across the antimeridian — it breaks cleanly when longitude wraps.
- [ ] Telemetry "Last updated" timer updates at least once per second showing relative time.
- [ ] No console errors during normal operation.

---

### CUJ-2: Toggle Follow off to explore the map, then recenter

**Status**: [ ] Not started
**Dependencies**: CUJ-1
**Priority**: P0 (launch blocker)

#### Context
The user notices the ISS is over a region they want to look at more closely (e.g., "oh, it's over Japan — let me zoom in"). They need to pan/zoom without the map fighting them by auto-recentering every 5 seconds. After exploring, they want a one-tap way to snap back to following the ISS.

#### Preconditions
- CUJ-1 is complete: the page is loaded, marker is visible, telemetry is populated.
- The Follow toggle is ON by default (map auto-centers on each poll).

#### Journey Steps

1. **User action**: Attempts to drag the map (mouse drag on desktop, touch drag on mobile) OR zooms in (scroll wheel / pinch).
   - **System response**: The map pans/zooms as the user expects. The Follow toggle automatically switches OFF, indicating the system has detected manual interaction. (Rationale: explicitly toggling Follow off before every pan is friction; auto-disable matches user intent.)
   - **User sees**: The Follow toggle (a labeled switch in the top-right corner of the map area, "Follow ISS" with an on/off pill) animates from cyan/on to gray/off. A small toast or inline label briefly appears near the toggle: "Follow off — map won't auto-center." (Toast auto-dismisses after 2s.)
   - **Details**: Toggle position: top-right of the map, 16px from top and right edges. Size: ~120px wide × 32px tall, dark glass background (`bg-slate-900/80 backdrop-blur`), 1px cyan border when on, gray border when off. The toast uses the same glass treatment, positioned just below the toggle.

2. **User action**: Continues to pan/zoom freely.
   - **System response**: Map responds to all gestures. Polling continues in the background. The ISS marker continues to update its position on the map (moving across the user's current view) and the trail continues to extend. The map does NOT recenter on the marker. Telemetry continues to update.
   - **User sees**: The map stays where they put it. The ISS marker may drift toward or away from the visible viewport. If the marker drifts off-screen, a directional arrow appears at the edge of the viewport closest to the ISS's current position, pointing toward it. The arrow is cyan, ~24px, with a soft glow.
   - **Details**: The off-screen arrow position is computed from the line between the viewport center and the ISS lat/long, clipped to the viewport edge with a 16px inset. The arrow rotates to point in the correct direction. If the ISS is on-screen, no arrow is shown.

3. **User action**: Decides to return to tracking. Either taps the Follow toggle, OR taps a "Recenter" floating button.
   - **System response**: When the ISS is off-screen, a "Recenter" floating action button appears in the bottom-right of the map area (above the attribution footer, ~16px inset). The button is a circle, 48px diameter, cyan background, white centered "crosshair/target" icon. Tapping either control: (a) flies the map to the current ISS position with a smooth pan/zoom (1500ms Leaflet `flyTo`), (b) restores zoom level 3, (c) turns the Follow toggle back ON.
   - **User sees**: The map smoothly flies back to the ISS. The Follow toggle pill animates back to cyan/on. The off-screen arrow disappears. The Recenter button fades out (200ms) once Follow is back on.
   - **Details**: The Recenter button only appears when (Follow is off) AND (ISS marker is outside the current map viewport). When ISS is off-screen but Follow is on (shouldn't normally happen, but as a guard), Follow continues to recenter automatically.

#### Edge Cases & Error States
- **User toggles Follow off but keeps the map centered on the ISS, then waits**: Map does not auto-recenter on next poll. As the ISS moves, it drifts away from center within the viewport. Eventually it leaves the viewport — arrow + Recenter button appear at that point.
- **User pans, then API fails**: Same as CUJ-5 — "Reconnecting…" appears in the panel. The map remains where the user left it. Follow remains off.
- **User pans while Follow is on, then quickly stops**: Follow auto-disables on the first pan gesture. We do not "re-enable Follow if the user appears to have only nudged the map." Once off, it stays off until explicitly turned on again.
- **User zooms but does not pan**: Zoom also disables Follow (per step 1). Reasoning: if the user zoomed in, they want to inspect a region; auto-recentering would yank them away.
- **Touch device — user taps the marker accidentally**: Tap on marker does NOT disable Follow and does NOT show a popup in v1. The marker is non-interactive in v1. (Future: tap to show ISS info card.)

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-on.html` — default state, Follow toggle ON, marker centered.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-off-onscreen.html` — Follow OFF, marker still in viewport, no arrow/Recenter button.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-desktop-follow-off-offscreen.html` — Follow OFF, marker off-screen, edge arrow and Recenter button visible.
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-2-mobile-follow-off-offscreen.html` — mobile equivalent.

#### Acceptance Criteria
- [ ] Follow toggle is visible in the top-right of the map at all times.
- [ ] Toggle defaults to ON on page load.
- [ ] Any user-initiated pan or zoom automatically switches Follow to OFF.
- [ ] When Follow is OFF, the map does not auto-recenter on poll updates.
- [ ] Polling and marker updates continue regardless of Follow state.
- [ ] When Follow is OFF and the ISS marker is outside the viewport, a directional arrow appears at the nearest viewport edge pointing toward the marker.
- [ ] When Follow is OFF and the ISS marker is outside the viewport, a Recenter floating button appears in the bottom-right of the map.
- [ ] Tapping the Recenter button OR re-enabling Follow flies the map back to the ISS over ~1500ms and turns Follow ON.
- [ ] A brief "Follow off" toast appears the first time Follow is auto-disabled in a session (max once per session is acceptable).

---

### CUJ-3: Read detailed telemetry to understand current ISS state

**Status**: [ ] Not started
**Dependencies**: CUJ-1
**Priority**: P0 (launch blocker)

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
- [ ] Telemetry panel renders all six fields with correct labels and units.
- [ ] Latitude and longitude show one decimal place and the correct hemisphere letter (N/S, E/W).
- [ ] Altitude is rounded to whole km and displayed with "km" suffix.
- [ ] Velocity is rounded to whole and displayed with thousands separator and "km/h" suffix.
- [ ] Visibility shows "Daylight" with a sun icon (amber) OR "Eclipsed" with a moon icon (gray).
- [ ] "Last updated" displays relative time and updates every second.
- [ ] Numeric values use tabular-nums so they don't shift horizontally when digits change.
- [ ] A "LIVE" pill with a pulsing green dot is visible in the panel header when polling is healthy.
- [ ] On desktop, panel is fixed at right side, ~320px wide, dark glass treatment.
- [ ] (P1) Hover tooltips on desktop explain each metric.

---

### CUJ-4: Use the tracker on a phone (mobile bottom sheet)

**Status**: [ ] Not started
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
- [ ] On viewports ≤768px wide, the layout uses a bottom-sheet pattern; the desktop side panel is NOT rendered.
- [ ] The map fills the full viewport behind the sheet.
- [ ] Collapsed bottom sheet is ~80px tall and shows: live indicator, compact lat/long, visibility icon, last-updated.
- [ ] Tapping the collapsed sheet or its chevron expands it smoothly to ~50% viewport height showing all six telemetry fields.
- [ ] Expanded sheet can be collapsed by tapping the chevron, dragging down, or tapping outside.
- [ ] Follow toggle is positioned in the top-right, accessible without overlap from system UI.
- [ ] Recenter button (when shown) is positioned just above the bottom sheet with safe-area padding.
- [ ] Layout respects iPhone safe-area-inset for notch and home-indicator devices.
- [ ] Pinch-zoom works and disables Follow as expected.
- [ ] Layout reflows correctly on portrait/landscape rotation.

---

### CUJ-5: Lose connectivity, see graceful recovery

**Status**: [ ] Not started
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
- **Browser tab goes to background (Page Visibility API)**: Polling pauses. On tab focus, immediately issue one poll and resume 5s cadence. (See CUJ-6 — covered in detail there.)
- **User has been disconnected for hours, comes back**: Same recovery path. Trail history is preserved (last 20 positions before the outage are still shown), the new segment starts at the post-reconnect position.
- **Page never gets a successful initial fetch**: After 2 failures, "Reconnecting…" replaces "Locating ISS…" in the placeholder panel. Map remains at world view. Marker never appears until first success. CUJ-1's path then resumes.

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced:
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-desktop-reconnecting.html` — desktop, reconnecting state visible (amber pill, stale timestamp, inline message).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-mobile-reconnecting.html` — mobile equivalent (amber indicator in collapsed sheet).
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-5-desktop-stale-30s.html` — stale-data state ("32s ago — stale" visible).

#### Acceptance Criteria
- [ ] A single poll failure does not surface any UI change.
- [ ] After 2 consecutive failures, the "LIVE" pill becomes "RECONNECTING" in amber and an inline "Reconnecting…" message appears in the telemetry panel.
- [ ] Backoff schedule on failures is: 5s, 10s, 20s, 30s (capped). Never gives up.
- [ ] "Last updated" text turns amber and gains " — stale" suffix when data is >30s old.
- [ ] On first successful retry, polling returns to 5s cadence, indicators return to green/cyan, "Last updated" resets to "just now".
- [ ] When the marker's new post-reconnect position is far from the held position, it fades out and fades in (no fake-trajectory linear interpolation).
- [ ] The trail polyline is not extended across the outage gap.
- [ ] The trail's pre-outage history (up to 20 points) is preserved.
- [ ] No raw error message or stack trace is ever shown to the user.
- [ ] Application never enters a blank/white/crashed state regardless of network conditions.

---

### CUJ-6: Leave the tab open for hours as ambient display

**Status**: [ ] Not started
**Dependencies**: CUJ-1, CUJ-5
**Priority**: P0 (launch blocker — confirmed by user as v1 scope)

#### Context
A meaningful share of enthusiast users will leave the page open on a second monitor, a kitchen tablet, or a background tab — checking it occasionally over hours. The app must remain healthy in this scenario: no memory leaks, no runaway polling when the tab is hidden, and a sensible "welcome back" experience when the tab regains focus.

#### Preconditions
- CUJ-1 is complete: page is loaded and tracking.
- User minimizes the window, switches to another tab, or locks their screen.

#### Journey Steps

1. **User action**: Switches to another browser tab or minimizes the window. The current tab becomes hidden (Page Visibility API: `document.visibilityState === "hidden"`).
   - **System response**: Polling pauses. The currently-scheduled `setTimeout`/`setInterval` for the next poll is cleared. No requests are issued while the tab is hidden. Existing telemetry remains in memory.
   - **User sees**: Nothing (tab is hidden).
   - **Details**: We pause polling for two reasons: (1) be a polite citizen of the network and API, (2) avoid unbounded memory growth in the trail array if we kept appending for hours. Browsers also throttle background timers, which would corrupt our 5s cadence assumption — pausing is cleaner.

2. **User action**: Returns to the tab (clicks it / unminimizes / wakes the device). Tab becomes visible.
   - **System response**: Immediately issues one poll. On success, telemetry updates, marker jumps to new position via fade-out/fade-in (same as long-outage recovery in CUJ-5, because hours have likely passed). Resumes 5s polling cadence.
   - **User sees**: Telemetry appears stale at first ("5m ago" in amber), then within 500ms the new data lands and the panel returns to "just now" green. Marker fades from old position to new position.
   - **Details**: The trail polyline is NOT extended across the hidden gap (same logic as CUJ-5). The user can see at a glance — by comparing the trail's last point to the marker's current position — that time has passed. No "you've been away for X" message; the timestamp tells the story.

3. **User action**: Leaves the page running continuously for many hours.
   - **System response**: Trail array stays capped at 20 points. No DOM nodes leak. Memory footprint stays roughly constant (within ~10MB variance). Polling continues at 5s.
   - **User sees**: A continuously updating live tracker, indistinguishable from a fresh load.
   - **Details**: Implementation note for engineers: ensure React effect cleanup correctly clears timers on unmount, and that Leaflet layer cleanups (`marker.remove()`, `polyline.remove()`) run when components unmount. Specifically, replace the trail polyline rather than incrementally redrawing, OR use a mutable Leaflet polyline whose `setLatLngs` is called with the bounded array.

#### Edge Cases & Error States
- **Device sleeps and wakes**: Same path as tab hidden/visible. Page Visibility API fires correctly.
- **Tab visible but window completely occluded**: `visibilityState` is still "visible" — we keep polling. Acceptable.
- **User opens 10 copies of the tab**: Each polls independently at 5s. Total load is 10 × 0.2 req/sec = 2 req/sec across all tabs, still well within the API's ~1 req/sec/IP limit only if the user is on a single IP. We do not coordinate across tabs in v1. Acceptable for the audience size.
- **Browser throttles even when "visible" (e.g., low battery mode)**: Polling will be irregular. We don't compensate beyond the standard backoff — if polls genuinely fail, CUJ-5's reconnect path applies.

#### Mocks / Reference Designs
[needs-mocks]

Mocks to be produced (low priority, mostly identical to CUJ-1 visuals):
- `docs/ux/prd-001-iss-live-tracker-mockups/cuj-6-desktop-after-resume.html` — desktop, just after tab regained focus, showing marker jump and "5m ago" amber timestamp briefly before resolving.

(Most of CUJ-6 is invisible behavior; primary verification is via behavior tests, not visual mocks.)

#### Acceptance Criteria
- [ ] Polling pauses when `document.visibilityState === "hidden"` (no network requests issued).
- [ ] Polling resumes immediately on tab visible, with one immediate poll followed by 5s cadence.
- [ ] Trail array never grows beyond 20 points.
- [ ] After 1 hour of continuous use, memory growth is within ~10MB of baseline (verified via DevTools heap snapshot).
- [ ] After tab resume, marker fades out/in rather than linearly interpolating across a long gap.
- [ ] No timers, listeners, or Leaflet layers leak on component unmount (verified via React StrictMode double-mount behavior).

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
- **CUJ-6 in v1 scope**: **confirmed**. Page Visibility pausing, trail cap, and resume-jump behavior are launch-blocking.

## Open Questions

- **Marker icon**: do we use a stylized satellite SVG or a simple glowing dot? Decision deferred to design (mocks).
- **PWA installability**: skip for v1 — adds complexity. Revisit if usage warrants.
- **Telemetry units toggle (km ↔ miles)**: skip for v1. The API supports a `units` query param so it's a small future addition.
