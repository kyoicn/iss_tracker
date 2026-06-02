# Task Plan

Last updated: 2026-06-02 (iteration 1)

## Current State

- Repository is empty: no `package.json`, no `src/`, no build config. Only `docs/` and `.gitignore` exist.
- PRD-001 defines 6 P0 CUJs. None implemented.
- Architecture is locked by `docs/design/system.md` and `docs/design/design-iss-tracker.md`:
  - Vite + React 18 + TypeScript + Tailwind 3 + Leaflet 1.9 + react-leaflet 4.2.
  - Single `useReducer` in `App.tsx` owns all state (shape in `state.ts` per system.md §5).
  - `react-leaflet` used for `<MapContainer>` + `<TileLayer>` only; marker/polyline/animation are imperative Leaflet.
  - CartoDB Dark Matter tiles.
  - File layout per system.md §4 — minimize file count.

## Iteration 1 Focus: Foundation + First Vertical Slice (partial CUJ-1)

Goal: scaffold the project and get a runnable app that polls `wheretheiss.at` every 5s and prints live telemetry as text to the screen. No map yet. This validates the full data path (network -> reducer -> render) end-to-end and unblocks every subsequent iteration.

Coverage:
- PRD §"Phased build note" steps 1-2 (scaffold + first live fetch printing to screen).
- Lays the state/api/hooks/constants foundation that CUJ-1 step 1-2, CUJ-3, CUJ-5, and CUJ-6 will all build on.

What is explicitly NOT in this iteration: Leaflet map, marker, trail, animation, Follow toggle, Recenter, EdgeArrow, BottomSheet, ConnectionStatus pill UI polish, mobile layout, antimeridian handling, reconnect UI polish. Those come in later iterations.

---

## Parallel Group 1: Scaffold (1 task, blocks everything else)

### Task 1.1: Scaffold Vite + React + TypeScript + Tailwind + dependencies

- **Do**:
  - Create `package.json` with the exact dependency set from `docs/design/design-iss-tracker.md` §15 — no extras:
    - `dependencies`: `react ^18.x`, `react-dom ^18.x`, `react-leaflet ^4.2.x`, `leaflet ^1.9.x`
    - `devDependencies`: `@types/leaflet`, `@types/react`, `@types/react-dom`, `typescript ^5.x`, `vite ^5.x`, `@vitejs/plugin-react`, `tailwindcss ^3.x`, `autoprefixer`, `postcss`
    - Scripts: `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview` (`vite preview`), `typecheck` (`tsc --noEmit`)
  - Create `tsconfig.json` for React 18 + Vite (strict mode on, `jsx: react-jsx`, `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, include `src`).
  - Create `tsconfig.node.json` for Vite config (standard Vite React-TS template).
  - Create `vite.config.ts` with `@vitejs/plugin-react`.
  - Create `tailwind.config.js` with `content: ['./index.html', './src/**/*.{ts,tsx}']`. Extend theme `colors` with palette tokens from system.md §8 (e.g., `bg-app`, `bg-panel`, `bg-card`, `bg-glass`, `accent-cyan`, `accent-green`, `accent-amber`, `text-primary`, `text-secondary`, `text-muted`, `text-dim`). Keep it minimal — only tokens listed in system.md §8.
  - Create `postcss.config.js` with `tailwindcss` and `autoprefixer`.
  - Create `index.html` at repo root with `<div id="root"></div>`, `<script type="module" src="/src/main.tsx"></script>`, page title "ISS Live Tracker", and a `<noscript>This tracker requires JavaScript.</noscript>` per system.md §18 recommendation.
  - Create `src/main.tsx`: `ReactDOM.createRoot(...).render(<React.StrictMode><App /></React.StrictMode>)`. Imports: `'leaflet/dist/leaflet.css'`, `'./index.css'`, `App` from `./App`.
  - Create `src/index.css` with the three Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) and a `html, body, #root { height: 100%; margin: 0; background: #0d1117; color: #f0f6fc; }` block.
  - Create a minimal placeholder `src/App.tsx` that just renders `<div>ISS Live Tracker — loading…</div>`. This will be replaced in Group 3.
  - Add `node_modules/`, `dist/`, `.vite/` to `.gitignore` if not already present.
  - Run `npm install` to verify the dependency set resolves.
  - Run `npm run typecheck` and `npm run build` to verify the scaffold compiles.
- **Files**: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx` (placeholder), `.gitignore`
- **Done when**:
  - `npm install` completes with no errors.
  - `npm run typecheck` exits 0.
  - `npm run build` produces a `dist/` directory.
  - `npm run dev` starts the dev server (manually verify it serves and renders "ISS Live Tracker — loading…").
  - Commit: `chore: scaffold vite + react + ts + tailwind project`

---

## Parallel Group 2: Foundation Modules (4 tasks, all parallel — depends on Group 1)

All four tasks write to distinct files. Each can run in its own worktree branched from the Group 1 commit.

### Task 2.1: Implement `src/constants.ts`

- **Do**: Create `src/constants.ts` with the exact constants block from `docs/design/system.md` §14, plus any palette/animation tokens cross-referenced in §8 that components will need at runtime (e.g., color hex strings if needed by Leaflet `divIcon` later — for iteration 1, only the ones already listed in §14 are required). Use `as const` where shown. Export every constant individually (no default export).
  - Constants to include: `API_URL`, `TILE_URL`, `TILE_ATTRIBUTION`, `POLL_BASE_MS`, `POLL_BACKOFF_MS`, `FETCH_TIMEOUT_MS`, `TRAIL_MAX_POINTS`, `TRAIL_GAP_THRESHOLD_MS`, `STALE_THRESHOLD_MS`, `RECONNECT_AFTER_FAILURES`, `INITIAL_MAP_CENTER`, `INITIAL_MAP_ZOOM`, `ISS_LOCK_ZOOM`, `FLY_TO_DURATION_INITIAL_S`, `FLY_TO_DURATION_RECENTER_S`, `BREAKPOINT_MOBILE_PX`.
  - Also export a `delayFor(failures: number): number` helper that returns `POLL_BACKOFF_MS[Math.min(failures, POLL_BACKOFF_MS.length - 1)]` (per system.md §7.1).
- **Files**: `src/constants.ts` (new)
- **Done when**:
  - File compiles under `npm run typecheck`.
  - Every constant from system.md §14 is present and exported.
  - `delayFor(0)===5000`, `delayFor(1)===10000`, `delayFor(3)===30000`, `delayFor(99)===30000`.
  - Commit: `feat: add constants module with api, polling, and ui tokens`

### Task 2.2: Implement `src/state.ts` (types + reducer + initial state)

- **Do**: Create `src/state.ts` with:
  - All type definitions from `docs/design/system.md` §5: `IssSample`, `TrailPoint`, `ConnectionStatus`, `State`, `Action` (all 9 action variants).
  - `initialState: State` with `current: null, previous: null, trail: [], follow: true, isMarkerOnScreen: true, hasShownFollowToast: false, status: 'idle', consecutiveFailures: 0, nextPollAtMs: null, isSheetExpanded: false, nowMs: Date.now()`.
  - `reducer(state: State, action: Action): State` covering all 9 actions per the semantics in design-iss-tracker.md §10 and system.md §5-7:
    - `POLL_START`: if `status === 'idle'`, transition to `'connecting'`; otherwise no change.
    - `SAMPLE_OK`: move `current -> previous`, set new `current` from `action.sample`, append `{lat, lon, receivedAtMs}` to `trail` (cap at `TRAIL_MAX_POINTS`, drop oldest), reset `consecutiveFailures` to 0, set `status: 'live'`.
    - `SAMPLE_FAIL`: increment `consecutiveFailures`; if new count `>= RECONNECT_AFTER_FAILURES` set `status: 'reconnecting'`; otherwise leave status as-is.
    - `SET_FOLLOW`: set `follow` from action; if `follow` becoming true does not change other state here (the actual map flyTo is triggered by MapView later).
    - `MAP_INTERACTED`: set `follow: false`, set `hasShownFollowToast: true` only if previously false (preserve once-per-session semantics).
    - `MARKER_VISIBILITY_CHANGE`: set `isMarkerOnScreen` from action.
    - `TOGGLE_SHEET`: flip `isSheetExpanded`.
    - `COLLAPSE_SHEET`: set `isSheetExpanded: false`.
    - `TICK`: set `nowMs` from action.
    - `VISIBILITY_CHANGE`: no state mutation required in iteration 1 (the polling hook reacts to visibility directly via its own param); reducer can be a no-op for this action — leave a comment noting it's intentionally inert for v1.
  - Import `TRAIL_MAX_POINTS` and `RECONNECT_AFTER_FAILURES` from `./constants`.
  - Do NOT include formatting helpers in this iteration (they will be added when the panel UI is built in a later iteration).
- **Files**: `src/state.ts` (new). Reads `src/constants.ts`.
- **Done when**:
  - Compiles under `npm run typecheck`.
  - All 9 action variants are handled in the reducer's switch (exhaustive — TypeScript should not complain about missing cases).
  - Trail array correctly caps at `TRAIL_MAX_POINTS` (verified by feeding 25 `SAMPLE_OK` actions and asserting `trail.length === 20`, oldest dropped).
  - `consecutiveFailures` resets on `SAMPLE_OK` and increments on `SAMPLE_FAIL`.
  - `status` transitions `'idle' -> 'connecting' -> 'live'` on first poll path, and to `'reconnecting'` after `RECONNECT_AFTER_FAILURES` failures.
  - Commit: `feat: add state types, initial state, and reducer`

### Task 2.3: Implement `src/api.ts` (typed fetch client)

- **Do**: Create `src/api.ts` exporting `fetchIssPosition(signal?: AbortSignal): Promise<IssSample | null>`:
  - Imports `API_URL`, `FETCH_TIMEOUT_MS` from `./constants` and `IssSample` from `./state`.
  - Uses native `fetch` with the passed `signal`. If no signal is passed, create an internal `AbortController` for the 8s timeout. If a signal is passed, the caller owns aborts and the function still enforces the timeout via its own internal controller that listens to both (use a combined-abort pattern: when the external signal aborts, also abort the internal one).
  - Hard timeout of `FETCH_TIMEOUT_MS` via `setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)`. Clear the timeout in a `finally` block.
  - On non-2xx response, network error, abort, or JSON parse failure: return `null` (the polling hook treats `null` as `SAMPLE_FAIL`). Do NOT throw.
  - Parse response and narrow types in a `parseIssResponse(raw: unknown): IssSample | null` helper (exported for testability). Required fields per PRD §"Data Source Reference": `latitude` (number), `longitude` (number), `altitude` (number, km), `velocity` (number, km/h), `visibility` (string), `timestamp` (number, unix seconds). Map:
    - `lat` = `raw.latitude`
    - `lon` = `raw.longitude`
    - `altitudeKm` = `raw.altitude`
    - `velocityKmh` = `raw.velocity`
    - `visibility` = `'daylight' | 'eclipsed' | 'unknown'` (anything not matching the first two -> `'unknown'`)
    - `apiTimestampMs` = `raw.timestamp * 1000`
    - `receivedAtMs` = `Date.now()` (set by `fetchIssPosition` after a successful parse, not inside `parseIssResponse` — `parseIssResponse` takes a `nowMs` arg or `fetchIssPosition` overwrites the field).
  - Validate that lat/lon/altitude/velocity/timestamp are finite numbers; otherwise return `null`.
- **Files**: `src/api.ts` (new). Reads `src/constants.ts` and `src/state.ts`.
- **Done when**:
  - Compiles under `npm run typecheck`.
  - `parseIssResponse` returns a valid `IssSample` for a well-formed payload matching the PRD's example JSON.
  - `parseIssResponse` returns `null` for: missing fields, wrong-typed fields (e.g., `latitude: "foo"`), `null` input, non-object input.
  - `fetchIssPosition` returns `null` (does not throw) on simulated network failure (e.g., aborting the signal mid-flight).
  - Commit: `feat: add typed api client for wheretheiss.at`

### Task 2.4: Implement `src/hooks/usePageVisibility.ts`

- **Do**: Create `src/hooks/usePageVisibility.ts` exporting `usePageVisibility(dispatch: React.Dispatch<Action>): boolean`:
  - Returns a boolean `isVisible` matching `document.visibilityState === 'visible'`.
  - Maintains `isVisible` in `useState`, updates on the `visibilitychange` event.
  - On each change, also dispatches `{ type: 'VISIBILITY_CHANGE', visible }` (reducer is currently inert for this action — that's fine; the dispatch is a stable contract).
  - Cleans up the event listener on unmount.
  - SSR-safe: guard against `typeof document === 'undefined'` (initial state defaults to `true`).
- **Files**: `src/hooks/usePageVisibility.ts` (new). Reads `src/state.ts` for the `Action` type.
- **Done when**:
  - Compiles under `npm run typecheck`.
  - Returns `true` initially in a normal browser tab.
  - Updates when `visibilitychange` fires (verified by manual test: switching tabs in dev and watching React DevTools or a `console.log` in App).
  - Commit: `feat: add usePageVisibility hook`

---

## Parallel Group 3: Polling Hook + App Wiring (2 tasks, parallel — depends on Group 2)

Both tasks write to distinct files. They share the `Action` and `IssSample` types from `state.ts` and the `fetchIssPosition` signature from `api.ts` — both are stable contracts produced by Group 2.

### Task 3.1: Implement `src/hooks/useIssPolling.ts`

- **Do**: Create `src/hooks/useIssPolling.ts` exporting `useIssPolling(dispatch: React.Dispatch<Action>, isVisible: boolean): void` per `docs/design/system.md` §7 and `docs/design/design-iss-tracker.md` §9.1:
  - Internals: `useRef` for `timeoutRef` (the pending `setTimeout` handle), `abortControllerRef` (current in-flight fetch), `consecutiveFailuresRef` (mirrors reducer's count so the polling closure doesn't need to re-create on state changes).
  - `useEffect` keyed on `[isVisible, dispatch]`:
    - If `!isVisible`: abort any in-flight fetch (`abortControllerRef.current?.abort()`), clear any pending timeout (`clearTimeout(timeoutRef.current)`), return.
    - If `isVisible`: define an inner `tick()` async function:
      - Create a new `AbortController`, store in ref.
      - `dispatch({ type: 'POLL_START' })`.
      - `await fetchIssPosition(controller.signal)`.
      - If result is non-null: `dispatch({ type: 'SAMPLE_OK', sample: result })`, reset `consecutiveFailuresRef.current = 0`.
      - If result is null: `dispatch({ type: 'SAMPLE_FAIL' })`, increment `consecutiveFailuresRef.current`.
      - Schedule next: `timeoutRef.current = setTimeout(tick, delayFor(consecutiveFailuresRef.current))`. Note: per system.md §7.1, `delayFor(0) === 5000` is the healthy cadence (used right after a success too).
    - Call `tick()` immediately (no initial delay — this is the "immediate fetch on visible" behavior required by CUJ-6).
    - Cleanup: abort in-flight + clear timeout.
  - Imports: `useEffect`, `useRef` from `react`; `fetchIssPosition` from `../api`; `delayFor` from `../constants`; `Action` from `../state`.
- **Files**: `src/hooks/useIssPolling.ts` (new). Reads `src/api.ts`, `src/constants.ts`, `src/state.ts`.
- **Done when**:
  - Compiles under `npm run typecheck`.
  - When mounted in a visible tab, `POLL_START` then `SAMPLE_OK` (or `SAMPLE_FAIL`) actions are dispatched roughly every 5s — verifiable by adding a `console.log` in the reducer or a temporary action log in App.
  - On simulated network failure, the next attempt is scheduled `delayFor(consecutiveFailures)` ms later (5000, 10000, 20000, 30000 capped).
  - No request fires while `isVisible` is false (verify via DevTools Network tab while switching tabs).
  - Commit: `feat: add useIssPolling hook with backoff and visibility awareness`

### Task 3.2: Rewrite `src/App.tsx` — wire reducer + hooks + text telemetry render

- **Do**: Replace the placeholder `src/App.tsx` from Group 1 with the real orchestrator:
  - `useReducer(reducer, initialState)`.
  - Mount `usePageVisibility(dispatch)` and `useIssPolling(dispatch, isVisible)`.
  - Mount a 1-second `TICK` interval inside a `useEffect`: `setInterval(() => dispatch({ type: 'TICK', nowMs: Date.now() }), 1000)`. Pause it when `!isVisible` (clear the interval when hidden, restart when visible). Cleanup on unmount.
  - Render a minimal text-based telemetry UI (no map yet) covering everything needed to verify the data path is working. Use Tailwind utility classes with the palette tokens added in Group 1's `tailwind.config.js`:
    - A page title "ISS Live Tracker" at the top.
    - A status indicator showing `state.status` (e.g., "idle", "connecting", "live", "reconnecting") — colored cyan/green for healthy and amber for reconnecting.
    - When `state.current === null`: show "Locating ISS..." (matches PRD CUJ-1 placeholder copy).
    - When `state.current !== null`: show six lines of telemetry:
      - Latitude: `state.current.lat` (one decimal, with `N`/`S` hemisphere letter — quick inline format helper is fine).
      - Longitude: `state.current.lon` (one decimal, with `E`/`W` hemisphere letter).
      - Altitude: `Math.round(state.current.altitudeKm)` km
      - Velocity: `Math.round(state.current.velocityKmh).toLocaleString()` km/h
      - Visibility: `state.current.visibility` (literal string, no icon yet)
      - Last updated: `Math.round((state.nowMs - state.current.receivedAtMs) / 1000)` s ago
    - Show `state.consecutiveFailures` as a small diagnostic line (we'll remove this in a later iteration; useful now for QA verification).
    - Show `state.trail.length` as a small diagnostic line (so QA can confirm trail accumulation works).
  - Layout: flex column, centered, dark background — does not need to be polished. Use monospace font for the numeric values to preview the tabular-nums treatment.
  - Do NOT mount `<MapContainer>` or any Leaflet code in this iteration.
- **Files**: `src/App.tsx` (rewrite). Reads `src/state.ts`, `src/hooks/useIssPolling.ts`, `src/hooks/usePageVisibility.ts`.
- **Done when**:
  - Compiles under `npm run typecheck`.
  - `npm run dev` shows "Locating ISS..." briefly, then real telemetry values updating every ~5s with the "Last updated" counter ticking every 1s.
  - `npm run build` succeeds.
  - Switching browser tabs pauses polling (verifiable via DevTools Network tab).
  - No console errors during normal operation.
  - Commit: `feat: wire reducer, polling, and text telemetry in App`

---

## Conflict Risks

- **Group 1 -> Groups 2 & 3**: Hard dependency. Group 2 cannot start until `package.json`, `tsconfig.json`, `tailwind.config.js`, and `vite.config.ts` exist and dependencies are installed. Mitigation: Group 1 is a single sequential task that completes before any other group is dispatched.
- **`src/App.tsx` exists as a placeholder after Group 1 and is rewritten in Task 3.2**: only one agent touches it after Group 1, so no conflict.
- **`src/constants.ts` is read by Tasks 2.3 (`api.ts`), 2.2 (`state.ts`), and Task 3.1 (`useIssPolling.ts`)**: read-only consumers, no write conflict. The contract is fully specified by system.md §14, so Tasks 2.2/2.3 can be written against the documented constant names before Task 2.1's file lands — but to keep agents straightforward, Group 2 agents should be told to assume the constants module exists with the names from system.md §14. Group 2 is parallel; if Task 2.1 finishes last, the other tasks will fail typecheck momentarily — that is expected and resolved when all Group 2 branches are merged together.
- **`src/state.ts` types are read by Task 2.3 (`api.ts`), 2.4 (`usePageVisibility.ts`), 3.1 (`useIssPolling.ts`), and 3.2 (`App.tsx`)**: read-only consumers. Same merge-time resolution as constants above; type names are pinned by system.md §5.
- **No two tasks write the same file within a group.** Verified file-by-file.
- **Iteration 1 deliberately defers**: Leaflet/map code, antimeridian helpers, marker tween, follow toggle, mobile layout, formatted UI per mocks. Attempting any of these now risks rework when the design contracts they depend on (e.g., MapView ref propagation, format helpers) are still abstract.

## Efficiency Estimate

- Group 1: 1 task (sequential foundation).
- Group 2: 4 parallel tasks (constants, state/reducer, api client, page visibility hook).
- Group 3: 2 parallel tasks (polling hook, App wiring).
- Total: 7 tasks across 3 groups vs. 7 sequential tasks — roughly 3x faster wall-clock (longest path is Group 1 -> Group 2's slowest -> Group 3's slowest).

---

## QA Findings — Iter 2 (added 2026-06-02 by QA gate, see `docs/qa-report.md`)

Iter-2 functional walkthrough verified all 6 P0 CUJs PASS both runs. QA gate verdict: **FAIL** (any bug ⇒ FAIL per gate rules). The following fix tasks are queued before iter-2 can be declared complete. None of these are launch blockers individually, but per the deterministic gate rule, the iteration is not done until they are addressed or explicitly waived.

### QA fix tasks (severity-tagged)

- [ ] **QA-fix [MEDIUM][FLAKY]**: Eliminate Recenter ↔ poll-tween race in `src/components/MapView.tsx`. The shared `isProgrammaticMoveRef` boolean is reset by every `moveend`, so a poll-driven `panTo` finishing between the recenter's `SET_FOLLOW(true)` dispatch and the recenter `flyTo`'s movestart can let a stray event leak through as `MAP_INTERACTED`, flipping Follow back OFF. Suggested approach: replace the shared boolean with a per-animation token or count, so each programmatic animation owns its own pending-end flag. Acceptance: clicking Recenter under continuous polling never leaves Follow in OFF state across 20 consecutive trials. — source: qa-report.md 2026-06-02 — **Retry 1 (2026-06-02, commit 19e833f): code fix landed (counter ref); dynamic re-verification BLOCKED — Playwright MCP unavailable. See qa-report.md → Retry 1.**
- [x] **QA-fix [LOW][BUG]**: Resolve the "?" indicator on telemetry metric cards (`src/components/TelemetryPanel.tsx:24-29`). Either implement the P1 hover tooltip wired to mock `docs/ux/prd-001-iss-live-tracker-mockups/cuj-3-desktop-tooltip.html`, or remove the icon. The current state misleadingly implies tooltips exist. — source: qa-report.md 2026-06-02 — **Retry 1 (2026-06-02, commit 19e833f): icons removed; PASS via static verification.**
- [x] **QA-fix [LOW][BUG]**: Add a favicon (or `<link rel="icon">` placeholder) to eliminate the 404 console error on every page load. — file: `index.html` — source: qa-report.md 2026-06-02 — **Retry 1 (2026-06-02, commit 19e833f): `public/favicon.svg` added + `<link rel="icon">` wired; PASS via HTTP HEAD 200.**

### QA coverage gaps (not bugs, but recommended before launch)

- [ ] **QA-followup**: Add a CUJ-6 memory soak test (1hr session + DevTools heap snapshot) to verify the <10MB-growth criterion that was marked NOT_RUN this iteration. — source: qa-report.md 2026-06-02
- [ ] **QA-followup**: Add a real touch-emulation Playwright test for the mobile bottom-sheet drag-to-collapse gesture (current coverage exercises only the tap path). — source: qa-report.md 2026-06-02
