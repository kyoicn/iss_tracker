# Mock Brief — ISS Live Tracker

> Source PRD: docs/prd/prd-001-iss-live-tracker.md
> Mock target dir: docs/ux/prd-001-iss-live-tracker-mockups/

## Product Context

ISS Live Tracker is a single-page web app that shows where the International Space Station is right now, on a live dark world map, with real-time telemetry. The audience is casual space enthusiasts who want a glance-and-go experience — no signup, no install, no clutter. The visual goal is "mission control glance": dark, modern, precise, with subtle motion and glow that make the page feel alive.

## Visual Constraints

- **Form factor**: web, responsive — mock BOTH desktop (~1200px viewport) and mobile (~390px viewport)
- **Style**: dark / space-themed — dark background (near-black or deep navy: `#0b0f1a` / `#020617` range), accent colors in cyan (`#22d3ee`), green (`#22c55e` for healthy/live), and amber (`#f59e0b` for warnings/eclipsed/reconnecting). Generous whitespace, system font stack, tabular-nums for all numeric values, "mission control" feel without being cluttered. Glowing accents (soft box-shadows in cyan) on the ISS marker and live indicator dot. Glass treatment (`backdrop-blur` + semi-transparent dark background) for floating panels and controls.
- **Tech**: HTML + Tailwind via CDN preferred. No JS unless interactivity itself is what's being mocked. Use placeholder map imagery — a dark world-map background image, a static SVG marker, a static SVG polyline trail — rather than actual Leaflet rendering.

## File naming convention

`cuj-<id>-<state>.html`
- Examples: `cuj-1-desktop-initial.html`, `cuj-1-mobile-initial.html`, `cuj-2-desktop-follow-off-offscreen.html`, `cuj-5-desktop-reconnecting.html`

## Per-CUJ mocks needed

### CUJ-1: First load and live tracking glance
**One-line summary**: User opens the page, sees a dark world map, and within ~2s the ISS marker appears and starts being tracked live with a fading trail behind it.
**States to mock**:
- `cuj-1-desktop-initial.html` — desktop, after tiles render but before first API response. Map shows full world at zoom 2, no marker, no trail. Right side panel shows placeholder dashes ("—") for each telemetry field with subtle pulsing cyan glow, and a small muted label "Locating ISS…" near the header.
- `cuj-1-desktop-loaded.html` — desktop, just after first data fix. Map centered on ISS at zoom 3. Glowing cyan ISS marker visible. Telemetry panel populated with real-looking values (e.g., lat 50.1°N, lon 118.1°E, alt 408 km, vel 27,600 km/h, Daylight, just now). "LIVE" green pulsing pill in header. No trail yet.
- `cuj-1-desktop-with-trail.html` — desktop, after ~10 polls. ISS marker with a cyan fading polyline trail behind it (~10 segments, fading from full opacity at the marker tail to ~10% opacity at the oldest point). Marker mid-orbit, e.g., over the Pacific.
- `cuj-1-mobile-initial.html` — mobile (~390px), full-bleed dark map at world view, no marker, collapsed bottom sheet with placeholder dashes.
- `cuj-1-mobile-loaded.html` — mobile, marker centered, collapsed bottom sheet showing live indicator + compact lat/long + visibility icon + "just now".

**Key copy strings**:
- Header: `ISS — Zarya`
- Pulse pill text: `LIVE`
- Placeholder field label (initial state): `Locating ISS…`
- Field labels: `LATITUDE`, `LONGITUDE`, `ALTITUDE`, `VELOCITY`, `VISIBILITY`, `LAST UPDATED`
- Visibility values: `Daylight` (with sun icon ☀, amber) or `Eclipsed` (with moon icon 🌙, gray)
- Footer attribution: `Data: wheretheiss.at · Map: OpenStreetMap`

**Visual notes**:
- ISS marker: small circular dot (8–10px) in cyan `#22d3ee` with a soft glow halo (`box-shadow: 0 0 12px 4px rgba(34,211,238,0.5)`). Optional: tiny satellite SVG silhouette inside the glow.
- Trail polyline: cyan, ~2px stroke, with opacity gradient from newest (100%) to oldest (~10%). Use a layered SVG with progressively reduced opacity per segment.
- LIVE pill: rounded full pill (`rounded-full`), small green dot (6px) + `LIVE` label, dot has a 1.5s breathing pulse animation.
- Telemetry values: monospace font, `tabular-nums`, value 24px white-ish (`text-slate-100`), label 10px uppercase tracking-wider muted (`text-slate-400`).
- Side panel (desktop): fixed right, ~320px wide, full height, `bg-slate-950/90 backdrop-blur` with a 1px cyan-tinted left border.

### CUJ-2: Zoom freely while following; pan to explore, recenter to return
**One-line summary**: Zoom keeps Follow ON and re-anchors the map on the ISS at the new zoom level; pan disables Follow so the user can explore; when the ISS drifts off-screen, an edge arrow and a Recenter button appear, and Recenter returns to following at the user's current zoom (not reset).
**States to mock**:
- `cuj-2-desktop-follow-on.html` — Follow toggle ON (cyan pill, "Follow ISS" label with on state). Map centered on ISS. This is the steady state — also representative of the moment after a zoom gesture, since zoom keeps Follow ON and re-anchors on the ISS. No Recenter button, no edge arrow.
- `cuj-2-desktop-follow-off-onscreen.html` — Follow OFF (gray pill, off state) after a pan gesture. Map has been dragged slightly but the ISS marker is still in viewport. No edge arrow, no Recenter button. Subtle toast just below the toggle: "Follow off — map won't auto-center."
- `cuj-2-desktop-follow-off-offscreen.html` — Follow OFF after pan, map dragged to a region where the ISS is NOT visible. A cyan directional arrow (~24px) is rendered at the nearest viewport edge pointing toward the ISS (give it a glow halo). A Recenter floating action button (48px circle, cyan bg, white crosshair/target icon) sits in the bottom-right of the map, above the attribution footer. Tapping Recenter would fly back to the ISS at the current zoom level.
- `cuj-2-mobile-follow-off-offscreen.html` — mobile equivalent of the panned-off-screen state. Recenter button positioned just above the collapsed bottom sheet, with safe-area padding.

**Key copy strings**:
- Toggle label: `Follow ISS`
- Toggle on-state badge: `ON`
- Toggle off-state badge: `OFF`
- Toast: `Follow off — map won't auto-center.`
- Recenter button: icon-only (crosshair/target SVG), `aria-label="Recenter map on ISS"`

**Visual notes**:
- Follow toggle: ~120px × 32px on desktop, ~100px × 30px on mobile. Glass background (`bg-slate-900/80 backdrop-blur`). 1px cyan border when ON, 1px gray border when OFF. Pill switch animates left/right.
- Edge arrow: cyan triangle/chevron SVG with 8px cyan glow shadow. Rotated to point toward the ISS position.
- Toast: small (~280px wide), 12px text, glass background, sits ~12px below the toggle. Auto-dismiss after 2s (mock the visible state).
- Recenter button: circular cyan `#22d3ee` filled background, white centered icon, subtle drop shadow. Mocked at 48px diameter on desktop, 44px on mobile.

### CUJ-3: Read detailed telemetry to understand current ISS state
**One-line summary**: The telemetry panel displays six fields (lat, long, altitude, velocity, visibility, last updated) in a readable, mission-control aesthetic; values update live without layout shift.
**States to mock**:
- `cuj-3-desktop-panel-daylight.html` — close-up / zoomed view of the desktop side panel only (or the full desktop layout with panel emphasized). Visibility = `Daylight` with the amber sun icon.
- `cuj-3-desktop-panel-eclipsed.html` — same panel, visibility = `Eclipsed` with a muted gray moon icon. Subtle visual difference vs daylight to show the state change.
- `cuj-3-desktop-tooltip.html` — desktop panel with a hover tooltip visible on the Velocity row, explaining "Orbital speed relative to Earth's surface. The ISS completes one orbit roughly every 90 minutes." Tooltip is dark glass, ~240px wide, 12px text.

**Key copy strings**:
- Header: `ISS — Zarya`
- LIVE pill: `LIVE`
- Field labels: `LATITUDE`, `LONGITUDE`, `ALTITUDE`, `VELOCITY`, `VISIBILITY`, `LAST UPDATED`
- Example values: `50.1° N`, `118.1° E`, `408 km`, `27,600 km/h`, `Daylight` / `Eclipsed`, `just now` / `5s ago`
- Tooltip (Velocity): `Orbital speed relative to Earth's surface. The ISS completes one orbit roughly every 90 minutes.`

**Visual notes**:
- Six fields stacked vertically with ~16px gap between rows.
- Each row: label on top (10px uppercase muted), value below (24px monospace `tabular-nums` light slate).
- Visibility row: icon to the left of value text. Sun = amber `#f59e0b`. Moon = slate `#64748b`.
- LIVE pill: green `#22c55e` background tint, small breathing dot.
- Tooltips dark glass, no arrow, fade-in.

### CUJ-4: Use the tracker on a phone (mobile bottom sheet)
**One-line summary**: On mobile, the map fills the screen and a bottom sheet collapses to a compact bar; tapping expands it to reveal all telemetry in a 2-column grid.
**States to mock**:
- `cuj-4-mobile-collapsed.html` — mobile portrait, bottom sheet in collapsed state (~80px tall), shows: chevron-up indicator centered at top, then a row with live dot + compact lat/long ("50.1°N 118.1°E") + visibility icon + "5s ago". Map fills the rest of the viewport, Follow toggle visible at top-right.
- `cuj-4-mobile-expanded.html` — mobile portrait, bottom sheet expanded to ~50% viewport height. Drag handle pill (36×4px) at top, then "ISS — Zarya" header with LIVE pill, then six telemetry fields in a 2-column grid. Chevron rotated 180°. Map still visible above the sheet.
- `cuj-4-mobile-landscape.html` — mobile landscape orientation, map fills the wider viewport, bottom sheet is shorter (~64px), Follow toggle top-right, Recenter button (if applicable) above the sheet.

**Key copy strings**:
- Collapsed bar compact lat/long: e.g., `50.1°N 118.1°E`
- Collapsed bar timestamp: e.g., `5s ago`
- Expanded sheet header: `ISS — Zarya`
- LIVE pill: `LIVE`
- Field labels and example values: same as CUJ-3
- Footer attribution (still present, just adjusted positioning): `Data: wheretheiss.at · Map: OpenStreetMap`

**Visual notes**:
- Bottom sheet: rounded top corners (16px radius), `bg-slate-950/95 backdrop-blur`, subtle top shadow for depth, respect `env(safe-area-inset-bottom)`.
- Drag handle: small pill `bg-slate-600` at top-center of expanded sheet.
- 2-column telemetry grid: ~12px column gap, ~16px row gap. Each cell: label (small caps, muted) above value (20px mono).
- Follow toggle: same style as desktop but slightly smaller (~100px wide).
- Recenter button: 44px circle, positioned in the lower-right area above the sheet, with `bottom: calc(80px + env(safe-area-inset-bottom) + 16px)`.

### CUJ-5: Lose connectivity, see graceful recovery
**One-line summary**: After 2 failed polls, the UI shifts to an amber "reconnecting" state; data shows as stale; on recovery, everything returns to healthy green/cyan.
**States to mock**:
- `cuj-5-desktop-reconnecting.html` — desktop, telemetry panel shows: "RECONNECTING" amber pill in header (instead of green LIVE), small amber spinner + inline message "Reconnecting…" below header, "Last updated" value in amber e.g., "12s ago". Marker held at last position on map, trail still visible but not extending.
- `cuj-5-mobile-reconnecting.html` — mobile collapsed bottom sheet, the live dot is now amber and the timestamp text is amber. Map shows marker held, trail visible.
- `cuj-5-desktop-stale-30s.html` — desktop, "Last updated" shows e.g., "32s ago — stale" with the " — stale" suffix in amber, RECONNECTING pill, the rest of the panel mostly unchanged from the reconnecting state but emphasizing the stale-data indicator.

**Key copy strings**:
- Reconnect pill: `RECONNECTING`
- Inline message: `Reconnecting…`
- Stale timestamp suffix: ` — stale` (appended to relative time, e.g., `32s ago — stale`)

**Visual notes**:
- Amber accent everywhere reconnect state shows: `#f59e0b`.
- Pill animation: slower 3s breathing instead of 1.5s, to feel "thinking/waiting" rather than "healthy".
- Map marker: keep it static at last position, no glow change required, but ensure the trail looks "frozen" (no new segment added).
- Tone: alert without panic. Avoid red — this is not an error, it's a degraded but recoverable state.

### CUJ-6: Leave the tab open for hours as ambient display
**One-line summary**: Tab pauses polling when hidden, resumes immediately on visibility. After a long absence, marker fades out and fades in at the new position; no fake interpolation across the gap.
**States to mock**:
- `cuj-6-desktop-after-resume.html` — desktop, just after tab regained focus from a long absence. Marker is at the new (post-resume) position with a soft fade-in glow. Telemetry shows "5m ago" in amber briefly (mock this transitional moment). A new trail segment is starting; the old pre-pause trail is visible at a separate location on the map, showing a clear gap between the historical trail and the new marker position.

**Key copy strings**:
- (Same field labels and values as other CUJs.)
- Transitional stale timestamp: e.g., `5m ago` in amber.

**Visual notes**:
- Show two disconnected trail fragments on the map: the old (pre-pause) trail at one location, and a starting point of a new trail at the marker's current position. This visual gap is the key signal that time has passed.
- This is largely an invisible behavior CUJ; one mock is sufficient.

---

## How to use this brief

In a chat agent with filesystem access to this repo (e.g., Claude Desktop), send a prompt like:

> Please produce mocks for this PRD. First read `docs/ux/README.md` for your designer rules, then read this brief at `docs/ux/prd-001-iss-live-tracker-mockups/MOCK_BRIEF.md`. Produce one HTML at a time per the rules and save each into `docs/ux/prd-001-iss-live-tracker-mockups/`.

The README contains the iteration discipline (one HTML at a time, ask "polish/next/revise" after each).
