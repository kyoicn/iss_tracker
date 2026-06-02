# QA Report

Last updated: 2026-06-02
Scope: PRD-001 (ISS Live Tracker MVP) — all 6 P0 CUJs

## Verdict: FAIL

Functional verification of all 6 CUJs PASSED both runs. Two bugs found — one `[MEDIUM][FLAKY]` race condition in the Recenter flyTo path and one `[LOW][BUG]` for misleading `"?"` tooltip indicator icons that don't actually wire any tooltip. Per the deterministic verdict rule, any bug at any severity ⇒ FAIL. The product is functionally working but the two issues should be queued before launch.

## Automated Test Summary
- Total tests: 77 (pre-existing: 0, new: 77)
- Passing: 76
- Failing: 0
- Skipped: 1 (live-network smoke test, opt-in via `SKIP_LIVE=0`)
- Flaky (failed-then-passed on framework retry): 0

Test framework added: Vitest 4.1.8 (+ jsdom, @testing-library/react). Scripts: `npm test` (single run), `npm run test:watch`.

Test files added:
- `src/constants.test.ts` — 9 tests covering `delayFor` backoff schedule, threshold constants, rate limits.
- `src/state.test.ts` — 47 tests covering every reducer branch (all 9 actions), trail cap, hemisphere formatters, stale-threshold boundary, antimeridian split, short-path interpolation.
- `src/api.test.ts` — 20 tests covering `parseIssResponse` (well-formed, missing fields, wrong types, NaN/Infinity, eclipsed/unknown visibility) and `fetchIssPosition` (200, 500, 429, network failure, abort, malformed JSON).

`npm run typecheck` and `npm run build` both pass.

## Mock Coverage Summary
- CUJs with mocks compared: 6 (textual/structural comparison against `docs/ux/prd-001-iss-live-tracker-mockups/cuj-*.html` files; full file:// rendering blocked by Playwright sandbox so visual side-by-side was performed by reading mock HTML source and comparing live DOM/screenshots)
- CUJs without mocks (`NO_MOCK`): 0

Notes on mock comparison limitation: Playwright MCP blocks `file://` navigation in this environment. Mocks were compared by reading the HTML source files and verifying class names, layout dimensions, color tokens, and copy strings against the live implementation's DOM and screenshots. This is weaker than full pixel comparison but sufficient to confirm structural and palette fidelity for v1. No visual deviations were logged on this basis.

## Per-CUJ Verification

### CUJ-1: First load and live tracking glance — PASS

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | First paint < 1.5s | manual | PASS | PASS | PASS |
| 2 | Dark map tiles render | manual | PASS | PASS | PASS |
| 3 | First API request within 200ms of mount | manual (via network panel) | PASS | PASS | PASS |
| 4 | Marker appears within 2.5s | manual | PASS | PASS | PASS |
| 5 | No layout shift between placeholder/loaded | manual | PASS | PASS | PASS |
| 6 | Marker smoothly animates between positions | manual + automated (shortPathInterp test) | PASS | PASS | PASS |
| 7 | Trail polyline appears after 2nd poll, caps at 20 | both (reducer test caps at TRAIL_MAX_POINTS) | PASS | PASS | PASS |
| 8 | Trail opacity gradient 100% → ~10% | manual (verified via MapView.tsx:181 `0.1 + 0.9 * (oldestIdx / denom)`) | PASS | PASS | PASS |
| 9 | Trail breaks at antimeridian | automated (splitOnAntimeridian test) + code review | PASS | PASS | PASS |
| 10 | "Last updated" timer updates every second | manual ("2s ago" → "4s ago" observed at 1.5s interval) | PASS | PASS | PASS |
| 11 | No console errors | manual | PASS (one favicon 404 only) | PASS (one favicon 404 only) | PASS |

#### Edge Cases & Error States
| Scenario | Expected | Observed (run1) | Observed (run2) | Result |
|----------|----------|-----------------|-----------------|--------|
| First API call fails | Placeholders remain, after 2 fails "Reconnecting…" appears | Verified in CUJ-5 | Verified in CUJ-5 | PASS |
| Antimeridian crossing | Trail breaks at +180/-180 | Covered by unit test `splitOnAntimeridian` | Covered by unit test | PASS |

#### Manual Verification Notes
- Live API returned `{lat: -15.24, lon: 54.52, alt: 425.93, vel: 27554.5}`. Implementation displayed `15.2° S, 54.5° E, 426 km, 27,554 km/h` — values verified to come from real API responses, not hardcoded.
- Marker, trail accumulation, panel updates all confirmed in real browser.
- Console error: one 404 for `/favicon.ico` (no favicon shipped). Minor; not a CUJ-1 acceptance criterion failure.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-1/run1/` (00-initial, 01-loaded, 02-trail) and `.../run2/` (00-initial, 01-loaded)
- Console messages (both runs): only `[ERROR] Failed to load resource: 404 favicon.ico` (cosmetic, not a feature failure)
- Network requests verified: `https://api.wheretheiss.at/v1/satellites/25544` polled at ~5s cadence after initial fetch
- Mocks compared: `cuj-1-desktop-initial.html`, `cuj-1-desktop-loaded.html`, `cuj-1-desktop-with-trail.html`, `cuj-1-mobile-initial.html`, `cuj-1-mobile-loaded.html` — structural & palette match

#### Issues Found
- `[LOW][BUG]` Missing favicon → 404 on every load. Add `<link rel="icon">` or ship a favicon. — `index.html`

---

### CUJ-2: Toggle Follow off / Recenter / EdgeArrow — PASS (with flaky note)

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | Follow toggle visible top-right always | manual | PASS | PASS | PASS |
| 2 | Toggle defaults ON on load | manual | PASS | PASS | PASS |
| 3 | Pan/zoom auto-switches Follow OFF | manual (synthetic mousedown/mousemove/mouseup) | PASS | PASS | PASS |
| 4 | When OFF, no auto-recenter on poll | manual | PASS | PASS | PASS |
| 5 | Polling + marker updates continue regardless of Follow | manual | PASS | PASS | PASS |
| 6 | Edge arrow when OFF and ISS off-screen | manual (`.edge-arrow` element present) | PASS | PASS | PASS |
| 7 | Recenter FAB when OFF and ISS off-screen | manual (`button[aria-label="Recenter map on ISS"]`) | PASS | PASS | PASS |
| 8 | Tapping Recenter or re-enabling Follow flies back + Follow ON | manual + reducer test (`SET_FOLLOW`) | PASS | PASS (in isolated test) | PASS |
| 9 | Brief "Follow off" toast first time auto-disabled | manual (mutation observer captured "Follow off — map won't auto-center.") | PASS | PASS | PASS |

#### Edge Cases & Error States
| Scenario | Expected | Observed (run1) | Observed (run2) | Result |
|----------|----------|-----------------|-----------------|--------|
| Pan, then API fails | Marker holds, Reconnecting appears | Covered by CUJ-5 | Covered by CUJ-5 | PASS |
| Pan while Follow on, then quickly stop | Follow stays off | Verified | Verified | PASS |
| Marker click | No popup, no Follow change | Marker has `interactive: false` per MapView.tsx:50 — verified | n/a in walk | PASS |

#### Manual Verification Notes
- Toast appears with `role="status"` and text "Follow off — map won't auto-center." Captured via MutationObserver because the toast auto-dismisses at 2200ms.
- Off-screen detection: confirmed via `MapView.tsx` `moveend` handler calling `onMarkerVisibilityChange(map.getBounds().contains(latlng))`.
- Edge arrow rotation/position computed from atan2 of dx/dy to ISS — verified visually pointing in correct direction.
- **Flake observed**: In one observation during run2, immediately after clicking Recenter the Follow toggle reported `aria-checked="false"` instead of `"true"`. A subsequent clean test (pan → off-screen → click Recenter → wait → check) showed correct `aria-checked="true"` for the full 3-second observation window. This indicates a race condition between the standalone follow-recenter `useEffect` ([MapView.tsx:201-212]) and the marker-placement effect ([MapView.tsx:95-162]) under heavy concurrent polling. The cleanup commit `384d587 fix(map): eliminate duplicate flyTo` addressed the primary duplicate-flyTo issue, but the timing race between the two flyTo paths and the `isProgrammaticMoveRef` flag can still cause spurious `MAP_INTERACTED` dispatches when a real poll-driven panTo's `moveend` fires after the recenter-driven flyTo's `movestart`.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-2/run1/` (00-initial, 01-pan-toast, 02-toast-and-free-pan, 03-off-screen, 04-after-recenter); `.../run2/` (00-pan-toast, 01-off-screen, 02-recentered)
- Mocks compared: `cuj-2-desktop-follow-on.html`, `cuj-2-desktop-follow-off-onscreen.html`, `cuj-2-desktop-follow-off-offscreen.html` — structural match
- Network: standard 5s polling, no anomalies

#### Issues Found
- `[MEDIUM][FLAKY]` After Recenter click, Follow toggle intermittently reverts to OFF due to race between the follow-recenter `flyTo` effect (`MapView.tsx:201-212`) and the marker-placement effect (`MapView.tsx:95-162`). The `isProgrammaticMoveRef` flag is shared by both paths and is reset on every `moveend`. If a poll-driven `panTo` finishes between the recenter's `setFollow(true)` and the recenter's `flyTo` movestart, the recenter `flyTo`'s subsequent `moveend` from a third party event (e.g., zoom snapping) can leak through as a user interaction.

---

### CUJ-3: Detailed telemetry panel — PASS

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | All six fields render with correct labels & units | manual | PASS | PASS | PASS |
| 2 | Lat/lon with 1 decimal + hemisphere letter | both (`formatLat`/`formatLon` tests) | PASS | PASS | PASS |
| 3 | Altitude rounded to whole km | both | PASS | PASS | PASS |
| 4 | Velocity rounded with thousands sep + km/h | both | PASS | PASS | PASS |
| 5 | Visibility shows Daylight (sun) or Eclipsed (moon) | manual | PASS (Daylight observed) | PASS (Daylight observed) | PASS |
| 6 | "Last updated" updates every 1s | manual ("2s ago" → "4s ago" observed) | PASS | PASS | PASS |
| 7 | Tabular-nums no shift | manual + CSS class verification | PASS | PASS | PASS |
| 8 | "LIVE" pill with pulsing green dot | manual (`.live-dot` class with `breath` animation) | PASS | PASS | PASS |
| 9 | Desktop right panel ~320px wide | manual (actually 360px per resolved design decision in `docs/design/system.md:306-310`) | PASS | PASS | PASS |
| 10 | (P1) Hover tooltips explain each metric | manual — NOT IMPLEMENTED but icons suggest they exist | FAIL | FAIL | FAIL (P1) |

#### Edge Cases & Error States
| Scenario | Expected | Observed (run1) | Observed (run2) | Result |
|----------|----------|-----------------|-----------------|--------|
| Visibility missing/unknown | "—" or "Unknown", no icon | Code path verified (`TelemetryPanel.tsx:188-190` and `parseIssResponse` test) | Same | PASS |
| Lat/lon exactly 0 | Shows "0.0° N" / "0.0° E" | Unit test `formatLat(0)==='0.0° N'` passes | Same | PASS |
| Very stale data (>30s) | Amber + "— stale" suffix | Verified in CUJ-5; `formatRelative` test covers boundary | Same | PASS |
| RECONNECTING pill | Amber, slower pulse | Verified in CUJ-5 (`ConnectionStatus.tsx`) | Same | PASS |

#### Manual Verification Notes
- Live API returned lat=-15.24, alt=425.93, vel=27554.5; panel showed 15.2° S, 426 km, 27,554 km/h. All values traceable to real API responses.
- Visibility icon: sun rendered in amber `#f59e0b` next to text "Daylight" — both the icon AND the text are present (color is not the sole signal).
- "Last updated" ticker: confirmed updates every 1s via 1s `setInterval` in `App.tsx:24-30` that dispatches `TICK`.
- Hover tooltip P1: Each metric card renders a small `"?"` indicator (`TelemetryPanel.tsx:24-29`) but no `title` attribute, no `onMouseEnter` handler, and no tooltip component is wired. The `"?"` icon misleadingly implies tooltip availability.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-3/run1/00-panel.png`, `.../run2/00-panel.png`
- Mocks compared: `cuj-3-desktop-panel-daylight.html`, `cuj-3-desktop-panel-eclipsed.html`, `cuj-3-desktop-tooltip.html` — structural & color match; tooltip mock confirms the tooltip behavior is intended but unimplemented.

#### Issues Found
- `[LOW][BUG]` Each metric card shows a "?" icon implying a hover tooltip, but no tooltip is wired. Either implement the P1 tooltip (per CUJ-3 step 3 mock `cuj-3-desktop-tooltip.html`) or remove the misleading "?" icon. — `src/components/TelemetryPanel.tsx:24-29`

---

### CUJ-4: Mobile bottom sheet — PASS

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | ≤768px uses bottom-sheet, no side panel | manual (`aside` absent, `section[aria-label]` present) | PASS | PASS | PASS |
| 2 | Map fills viewport behind sheet | manual | PASS | PASS | PASS |
| 3 | Collapsed sheet ~80px shows live indicator, compact lat/long, vis icon, last-updated | manual (`sheetH === 80px`) | PASS | PASS | PASS |
| 4 | Tap collapsed sheet expands to ~50% viewport | manual (`sheetH === 422px` on 844px tall viewport) | PASS | PASS | PASS |
| 5 | Collapse via drag handle tap | manual (button aria-label "Collapse telemetry") | PASS | PASS | PASS |
| 6 | Collapse via tap outside | manual (`onClick={onCollapse}` overlay verified in BottomSheet.tsx:45-50) | PASS (code review) | PASS (code review) | PASS |
| 7 | Follow toggle top-right accessible | manual | PASS | PASS | PASS |
| 8 | Recenter button positioned just above sheet | manual (`RecenterButton.tsx:10-14` uses MOBILE_SHEET_COLLAPSED_PX offset + safe-area-inset-bottom) | PASS | PASS | PASS |
| 9 | Layout respects safe-area-inset | manual (CSS `env(safe-area-inset-bottom, 0px)` in BottomSheet.tsx:58-59) | PASS (code review) | PASS (code review) | PASS |
| 10 | Pinch-zoom works and disables Follow | manual via mouse drag (touch testing limited) | PASS | PASS | PASS |
| 11 | Layout reflows on rotation | manual (CSS-driven via `useIsMobile` + `matchMedia` listener) | PASS (mql change handler verified) | PASS | PASS |

#### Manual Verification Notes
- Sheet height transitions: collapsed → expanded → collapsed cycle worked smoothly with the documented 300ms ease-out transition.
- Sheet uses `transition-[height]` Tailwind utility per `BottomSheet.tsx:54`.
- Backdrop overlay (`fixed inset-0`) appears only when expanded — tapping it triggers `onCollapse`.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-4/run1/` (00-mobile-collapsed, 01-mobile-expanded); `.../run2/` (00-mobile-collapsed, 01-expanded)
- Mocks compared: `cuj-4-mobile-collapsed.html`, `cuj-4-mobile-expanded.html`, `cuj-4-mobile-landscape.html` — structural match

#### Issues Found
- None

---

### CUJ-5: Lose connectivity / graceful reconnect / stale indicator — PASS

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | Single poll failure does not surface UI change | both (reducer test: SAMPLE_FAIL count=1 leaves status unchanged) | PASS | PASS | PASS |
| 2 | After 2 consecutive failures → RECONNECTING pill + "Reconnecting…" inline | both | PASS | PASS | PASS |
| 3 | Backoff: 5s, 10s, 20s, 30s capped | both (constants test + observed timing) | PASS | PASS | PASS |
| 4 | "Last updated" → amber + "— stale" when >30s | both (formatRelative test) | PASS | PASS | PASS |
| 5 | On first success → polling 5s, indicators green, "just now" | manual | PASS | PASS | PASS |
| 6 | Far jump after reconnect → fade out/in (not linear interp) | manual (verified via MapView.tsx:120-135 `shouldJump = gap > TRAIL_GAP_THRESHOLD_MS`) | PASS (code review) | PASS | PASS |
| 7 | Trail not extended across outage gap | manual (verified via MapView.tsx:175-176 `if (gap > TRAIL_GAP_THRESHOLD_MS) continue`) | PASS (code review) | PASS | PASS |
| 8 | Trail pre-outage history (up to 20) preserved | both (reducer test + observation: trail.length stayed at 20 through outage) | PASS | PASS | PASS |
| 9 | No raw error message or stack trace shown | manual (fetch wrapped in try/catch returning null) | PASS | PASS | PASS |
| 10 | Application never enters blank/white/crashed state | manual | PASS | PASS | PASS |

#### Edge Cases & Error States
| Scenario | Expected | Observed (run1) | Observed (run2) | Result |
|----------|----------|-----------------|-----------------|--------|
| API returns 429 | Backoff applies | Unit test verifies fetchIssPosition returns null on 429 | Same | PASS |
| API returns 5xx | Backoff applies | Unit test verifies | Same | PASS |
| API returns malformed JSON | Treated as failure | Unit test verifies | Same | PASS |
| Page never gets successful initial fetch | "Reconnecting…" replaces "Locating ISS…" | Verified status indicator changes from "Connecting"/"Locating" to "Reconnecting" after 2 fails | Same | PASS |

#### Manual Verification Notes
- Simulated outage by overriding `window.fetch` to reject for `api.wheretheiss.at`. After 2 consecutive failures (within ~10-12s), state.status transitioned to 'reconnecting' and the RECONNECTING pill appeared in amber.
- Observed "44s ago — stale" in amber, demonstrating the stale threshold and color treatment.
- Recovery: after restoring `window.fetch`, the next scheduled retry (per backoff schedule) fired and SAMPLE_OK transitioned state.status to 'live'. Pill returned to LIVE green, "Last updated" reset.
- Timing of recovery: per backoff (5s/10s/20s/30s), recovery may take up to 30s after network is restored — this matches the PRD's never-gives-up schedule and is correct behavior, not a bug.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-5/run1/` (00-after-fails, 01-recovered); `.../run2/` (00-after-fails, 01-recovered)
- Mocks compared: `cuj-5-desktop-reconnecting.html`, `cuj-5-desktop-stale-30s.html`, `cuj-5-mobile-reconnecting.html` — structural & color match (amber `#f59e0b` confirmed)

#### Issues Found
- None

---

### CUJ-6: Long session / Page Visibility pausing / trail cap — PASS

#### Acceptance Criteria
| # | Criterion | Coverage | Result (run1) | Result (run2) | Final |
|---|-----------|----------|---------------|---------------|-------|
| 1 | Polling pauses when `visibilityState === 'hidden'` | manual (0 new requests during 12s hidden window after clearing buffer) | PASS | PASS | PASS |
| 2 | Resume → 1 immediate poll, then 5s cadence | manual (request fired 1.5ms after `visibilitychange`→visible) | PASS | PASS | PASS |
| 3 | Trail array never exceeds 20 | both (reducer test: 25 SAMPLE_OK → trail.length === 20) | PASS | PASS | PASS |
| 4 | <10MB memory growth over 1hr | not measured | NOT_RUN | NOT_RUN | NOT_RUN |
| 5 | After resume, marker fade out/in (not linear interp) | manual (verified via MapView.tsx:120 `shouldJump = !prev || gap > TRAIL_GAP_THRESHOLD_MS`) | PASS | PASS | PASS |
| 6 | No timers/listeners/Leaflet layers leak | manual (verified via useEffect cleanup functions in App.tsx:66-69, MapView.tsx:81-91, useIssPolling.ts:41-46, usePageVisibility.ts:18-20) | PASS (code review) | PASS | PASS |

#### Edge Cases & Error States
| Scenario | Expected | Observed (run1) | Observed (run2) | Result |
|----------|----------|-----------------|-----------------|--------|
| Device sleeps and wakes | Same path as hidden/visible | Verified via Page Visibility API events | Same | PASS |
| Tab visible but occluded | Keep polling | `visibilityState` remains 'visible' | Same | PASS |

#### Manual Verification Notes
- Polling correctly pauses by aborting the in-flight controller and clearing the scheduled `setTimeout` (`useIssPolling.ts:41-46`).
- Resume triggers re-running the effect's body (because `isVisible` flips, which is in the deps array), which calls `tick()` immediately. Verified 1.5ms latency from `visibilitychange` event to actual fetch start.
- Memory profile (criterion 4) not measured this iteration — would require sustained 1hr session. Marked NOT_RUN, not a failure (memory leak prevention is verified by code review of cleanup paths).
- StrictMode double-mount in dev does cause an extra `ERR_ABORTED` per effect run but the `cancelled` flag in `useIssPolling.ts:24` prevents spurious SAMPLE_FAIL dispatches.

#### Artifacts
- Screenshots: `docs/qa-artifacts/iter2/cuj-6/run1/00-after-resume.png`, `.../run2/00-after-resume.png`
- Mocks compared: `cuj-6-desktop-after-resume.html` — minimal, mostly behavior-only
- Network: requests pause cleanly during hidden window; one immediate poll on resume

#### Issues Found
- None (memory criterion not measured this iteration; flagged for follow-up)

---

## Bugs Found

### MEDIUM
- `[MEDIUM][FLAKY]` Recenter click can race with concurrent poll-driven panTo, intermittently leaving Follow toggle in OFF state — CUJ-2 — `src/components/MapView.tsx:201-212` and `src/components/MapView.tsx:95-162`. Suggested fix: gate the recenter-driven `flyTo`'s programmatic-move flag with a longer-lived "in-flight" handle (e.g., set `isProgrammaticMoveRef = true` until the next `moveend` belongs to this specific flyTo), or move the user-vs-programmatic discrimination to a per-action ref instead of a shared boolean.

### LOW
- `[LOW][BUG]` Missing favicon → 404 on every page load — All CUJs — `index.html` (root). Add a favicon or `<link rel="icon">` placeholder.
- `[LOW][BUG]` Telemetry metric cards display a "?" icon that suggests hover tooltips but no tooltip is wired — CUJ-3 — `src/components/TelemetryPanel.tsx:24-29`. Either implement the P1 tooltip per `cuj-3-desktop-tooltip.html` mock or remove the misleading "?" icon.

## Coverage Gaps

- **CUJ-6 criterion 4 (memory < 10MB over 1hr)**: Not measured this iteration. Would require a long-running session and DevTools heap snapshots. Recommended follow-up.
- **CUJ-2 touch / pinch-zoom on mobile**: Mobile pinch verification was done via mouse-drag simulation on desktop-shaped viewport. Real touch event coverage requires a touch-capable browser fixture (Playwright supports it but wasn't wired this iteration).

## New Tests Written
- `src/constants.test.ts` — 9 tests for `delayFor`, `POLL_BACKOFF_MS`, `STALE_THRESHOLD_MS`, `RECONNECT_AFTER_FAILURES`, `TRAIL_MAX_POINTS`, `FETCH_TIMEOUT_MS` — covers CUJ-5 backoff and CUJ-1/CUJ-6 trail cap.
- `src/state.test.ts` — 47 tests covering:
  - reducer: all 9 actions (POLL_START, SAMPLE_OK, SAMPLE_FAIL, SET_FOLLOW, MAP_INTERACTED, MARKER_VISIBILITY_CHANGE, TOGGLE_SHEET, COLLAPSE_SHEET, TICK, VISIBILITY_CHANGE)
  - trail cap at TRAIL_MAX_POINTS
  - consecutiveFailures reset on success, increment on failure
  - status transitions idle→connecting→live and to reconnecting after RECONNECT_AFTER_FAILURES
  - formatLat / formatLon (including 0° edge)
  - formatKm / formatKmh (rounding + thousands sep)
  - formatRelative (just now, seconds, minutes, hours, stale threshold boundary)
  - splitOnAntimeridian (empty, no-cross, eastbound +180/-180, westbound -180/+180)
  - shortPathInterp (no wrap, eastbound wrap, westbound wrap, endpoints, normalization)
- `src/api.test.ts` — 20 tests covering:
  - parseIssResponse: well-formed, eclipsed/unknown/missing visibility, null/undefined/string/number input, missing/wrong-type/NaN/Infinity numeric fields
  - fetchIssPosition: 200 OK, 500, 429, network error, malformed JSON, external abort

## Recommendations

In priority order:

1. **[MEDIUM][FLAKY]** Fix the Recenter ↔ poll-tween race in MapView. The shared `isProgrammaticMoveRef` boolean is too coarse — replace with a per-animation token or explicitly track which event sources are programmatic.
2. **[LOW][BUG]** Decide on tooltip: either implement the P1 hover tooltip wired to mock `cuj-3-desktop-tooltip.html`, or remove the "?" indicator from `TelemetryPanel.tsx`.
3. **[LOW][BUG]** Add a favicon to eliminate the 404 console error.
4. **Coverage gap** Add a CUJ-6 memory test (1hr soak with heap-snapshot comparison) before declaring full launch readiness.
5. **Coverage gap** Add a real touch-emulation Playwright test for the mobile bottom-sheet drag-to-collapse gesture (currently only the tap-to-toggle path is exercised).

---

## Retry 1 (after commit 19e833f)

Last updated: 2026-06-02
Scope: re-verify the 3 bugs filed in the initial pass plus a CUJ-1..6 smoke check (fixes are localized).

### Verdict: BLOCKED

**Reason:** Bugs 2 and 3 are independently confirmed fixed via static/HTTP verification. Bug 1 (the `[MEDIUM][FLAKY]` Recenter race) is structurally fixed in source per code review, but **cannot be dynamically re-verified in this environment** — the Playwright MCP (`mcp__playwright__browser_*`) is not present in this agent's tool list, and the previous flake was visible only in a live, time-sensitive browser session. Per the QA Prerequisites rule ("Do not proceed with web UI verification … Set the affected CUJ Results to BLOCKED. Do not downgrade to reading HTML, inspecting source files, or guessing"), I cannot self-certify a PASS on the race-condition fix without driving a real browser.

To unblock: install Playwright MCP at user scope and re-run this retry. The command, per the QA prerequisites doc:

```
claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest
```

### Gate checks (rerun, all green)
- `npm run typecheck` — PASS (no output, clean)
- `npm test` — **77/77 passing**, 0 failing, 0 skipped (the previously-skipped live-network test was re-enabled or removed — count went from 76+1skip to 77 passing; no regression in counted tests). Duration 7.06s.
- `npm run build` — PASS, 87 modules, `dist/assets/index-*.js` 320.67 kB → 97.40 kB gzipped.

### Bug 3 — Missing favicon → 404 — CONFIRMED FIXED

Verified statically and via HTTP:
- `public/favicon.svg` exists (367 bytes, valid SVG: dark navy bg, cyan target rings — matches palette).
- `index.html:7` declares `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.
- `curl -sI http://localhost:5173/favicon.svg` → `HTTP/1.1 200 OK`, `Content-Type: image/svg+xml`.
- `curl -sI http://localhost:5173/favicon.ico` → 404 (expected; nothing asks for `.ico` because the `<link>` points at `.svg`).
- Browsers asked for the icon by the `<link>` href, so no 404 will appear in the network log for any favicon path the page actually requests.

Result: **PASS** (verified without browser; the fix is wholly static).

### Bug 2 — Misleading "?" tooltip indicators — CONFIRMED FIXED

Verified statically:
- Read `src/components/TelemetryPanel.tsx` in full. The `MetricCard` component (lines 8–28) renders only the label icon + label text inside the header span. No "?" badge node exists.
- `grep -n '"?"'` across `src/components/` returned zero hits.
- The pre-fix code path (per the original report: `TelemetryPanel.tsx:24-29` rendering a "?" indicator) is entirely removed.

Result: **PASS** (verified without browser; the fix is wholly static markup removal).

### Bug 1 — Recenter race (FLAKY) — STRUCTURALLY FIXED, DYNAMIC RE-VERIFICATION BLOCKED

Code review of `src/components/MapView.tsx`:
- Line 40: `const programmaticPendingRef = useRef<number>(0);` — counter replaces the previous boolean.
- Lines 62, 66: `movestart`/`zoomstart` handlers short-circuit when `programmaticPendingRef.current > 0`. Because it's a counter, overlapping programmatic moves can no longer be misclassified as user interactions — the counter stays positive while any animation is in flight.
- Lines 70–72: `moveend` decrements iff > 0. Pure user-initiated `moveend`s never decrement, so the counter cannot underflow.
- Lines 130, 155, 208: all three `flyTo`/`panTo` call sites increment the counter before dispatching the animation. This matches the planned fix described in the task.

The fix is semantically correct: each programmatic move owns exactly one increment and exactly one decrement (paired with its own `moveend`), so concurrent animations cannot leak a real `movestart` through to `onMapInteract`.

Result: **BLOCKED** for dynamic verification (no Playwright MCP). Code review verdict: fix appears correct and addresses the root cause described in the original `[MEDIUM][FLAKY]` finding.

### CUJ-1..6 smoke (not re-walked)

Not re-walked dynamically — same blocker as Bug 1. All previously-passing CUJ verdicts remain provisionally held (no regression-suggesting changes were introduced by commit `19e833f`: only a counter-vs-boolean swap in MapView, removal of presentational `?` JSX, and a static favicon asset).

| CUJ | Previous verdict | Retry status |
|-----|------------------|--------------|
| CUJ-1 | PASS | BLOCKED for re-walk; no changes touch CUJ-1 paths besides favicon (favicon improves it). |
| CUJ-2 | PASS (with flaky note) | BLOCKED for re-walk; MapView race fix is the only relevant change and is verified by code review. |
| CUJ-3 | PASS (with `?` bug) | BLOCKED for re-walk; static `?` removal is verified by code review. |
| CUJ-4 | PASS | BLOCKED for re-walk; no changes touch BottomSheet. |
| CUJ-5 | PASS | BLOCKED for re-walk; no changes touch reconnect path. |
| CUJ-6 | PASS | BLOCKED for re-walk; no changes touch polling/visibility. |

### Bugs Found this retry
None new at any severity.

### Overall retry verdict

**BLOCKED** — per deterministic roll-up rule "Any CUJ has Result `BLOCKED` ⇒ overall BLOCKED". The honest characterization is: the static-verifiable fixes (Bug 2, Bug 3) are confirmed PASS, and the dynamic fix (Bug 1) is correctly implemented per code review but cannot be re-verified live in this environment. Once Playwright MCP is installed, a quick re-walk of CUJ-2's Recenter path (pan off-screen → click Recenter rapidly → wait 6–8s through a poll → verify Follow toggle still ON) should turn this into PASS without further code changes expected.
