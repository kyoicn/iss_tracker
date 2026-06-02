# ISS Live Tracker — Product Requirements

## Product Vision

A single-page web app that shows where the International Space Station is right now, on a live world map, with real-time telemetry. No signup, no install — just open and watch.
`
The product exists to fill a specific gap in the market: most existing ISS trackers are either feature-heavy and cluttered (drowning in orbital math, predictions, and login walls) or aesthetically dated. We want the opposite — a clean, modern, single-purpose tracker that loads instantly and shows the essential live telemetry beautifully. Think "mission control glance," not "mission planning console."

### Goals
- **Glance-and-go usability**: a user can open the site and understand where the ISS is and what it's doing in under 5 seconds.
- **Visual quality**: dark, space-themed aesthetic that feels considered and modern.
- **Zero friction**: no signup, no install, no API key, no settings to configure for the default experience.
- **Reliability**: never crashes, never shows raw error messages, always degrades gracefully.

### Non-goals (for v1)
- Pass predictions ("when can I see the ISS from my location?")
- Multi-satellite tracking
- 3D globe / WebGL rendering
- User accounts, saved locations, notifications
- Historical playback

## Target Users

**Primary persona — "The Curious Glancer"**
- Casual space enthusiast or hobbyist.
- Has seen a NASA livestream, watched a launch, or follows space news loosely.
- Opens the site occasionally out of curiosity ("where is the ISS right now?").
- Wants the answer immediately, in a way that feels alive.
- Mixed device usage: roughly half desktop (background tab while working), half mobile (quick check from bed/couch).
- Low tolerance for friction. Will not sign up. Will not install an app for this.
- Appreciates good design and will share a beautiful tracker on social media; will close a cluttered one in three seconds.

## Cross-cutting Concerns

These requirements apply across all features and CUJs.

### Performance
- First contentful paint under 1.5s on a typical 4G mobile connection.
- First marker on map under 2.5s (limited by first API roundtrip).
- Polling cadence: every 5 seconds. Never poll more aggressively than 1 req/sec (API rate limit is ~1/sec).
- Smooth marker animation must run at 60fps on a 2020-era mobile device.

### Reliability
- Network errors never propagate as raw error messages or stack traces.
- The app never enters a blank/crashed state. If everything fails, last-known position is shown with a clear "stale" indicator.
- Polling continues with exponential backoff (5s → 10s → 20s, capped at 30s) after consecutive failures, and resumes 5s cadence on first success.

### Accessibility
- All interactive controls reachable by keyboard.
- Color contrast meets WCAG AA on all text against the dark background.
- "Follow" toggle and "Recenter" buttons have accessible labels.
- Telemetry values are not conveyed by color alone (e.g., visibility uses both an icon and a text label).

### Responsiveness
- Single layout adapts fluidly between ~390px (mobile) and ~1200px+ (desktop).
- Breakpoint at 768px: below, mobile layout (bottom sheet for telemetry); above, desktop layout (side panel).

### Attribution
- OpenStreetMap tile attribution always visible per OSM tile usage terms (Leaflet renders this by default in the map corner).
- A small footer line credits the ISS position data source: "Data: wheretheiss.at • Map: OpenStreetMap".

### Browser support
- Last 2 versions of Chrome, Safari, Firefox, Edge on desktop.
- Latest iOS Safari and Android Chrome on mobile.
- No IE11.

## PRD Listing

| PRD | Status | Summary |
|---|---|---|
| [prd-001-iss-live-tracker](./prd-001-iss-live-tracker.md) | draft | The MVP: live map with ISS marker, telemetry panel, follow toggle, mobile responsive, graceful reconnect. |
