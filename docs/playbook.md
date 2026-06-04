# Playbook — ISS Live Tracker

Operational reference for compiling, running, deploying, and debugging the app. Stack: Vite + React 18 + TypeScript + Tailwind 3 + Leaflet 1.9 + react-leaflet 4.2. No backend, no API keys, no server-side state. All data comes from the public `wheretheiss.at` API.

## Prerequisites

- Node.js ≥ 18 (Vite 5 requires 18+; tested on 20)
- npm 9+ (yarn / pnpm also work but lockfile is `package-lock.json`)
- A modern browser (Chrome / Safari / Firefox latest)

```sh
node --version   # v18+ required
npm --version    # v9+
```

Install dependencies once after clone:

```sh
npm install
```

## Daily commands (npm scripts)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR at [http://localhost:5173](http://localhost:5173) |
| `npm run typecheck` | `tsc --noEmit` — type-only check, no output |
| `npm test` | One-shot Vitest run (77 tests) |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | Typecheck + production bundle to `dist/` |
| `npm run preview` | Serve the production `dist/` locally on port 4173 |

## Local development

```sh
npm run dev
# → open http://localhost:5173
```

Notes:
- Polling fires every 5s once the tab is visible. Background tabs pause polling via the Page Visibility API.
- Vite HMR works on every source change. Reducer state is reset on full reload.
- React StrictMode is on (in `src/main.tsx`); effects intentionally double-mount in dev. The polling hook + Leaflet imperative effects are designed to be StrictMode-safe.

### Run on a custom port / expose on LAN

```sh
npm run dev -- --port 5180 --host
```

## Production build

```sh
npm run build
# Output: dist/ (~320 KB raw / ~97 KB gzipped)
```

Verify the bundle works locally:

```sh
npm run preview
# → open http://localhost:4173
```

## Testing

Unit tests live next to source files as `*.test.ts`. Suite covers:
- `src/state.test.ts` — reducer (all 9 actions), trail cap, antimeridian split, `shortPathInterp`, `formatRelative` boundaries
- `src/api.test.ts` — `parseIssResponse` happy + sad paths, `fetchIssPosition` failure modes (non-2xx, 429, network error, malformed JSON, abort)
- `src/constants.test.ts` — `delayFor` backoff schedule

```sh
npm test                                      # run all
npm test -- src/state.test.ts                 # single file
npm test -- -t "antimeridian"                 # match by test name
VITE_SKIP_LIVE=1 npm test                     # skip the live-network smoke test
```

The live smoke test in `src/api.test.ts` hits `wheretheiss.at` for real and is included by default. Set `VITE_SKIP_LIVE=1` in CI when network is unreliable.

## Deployment

The build is a fully static SPA with no server-side code. Deploy `dist/` to any static host. Examples:

### Vercel

```sh
npm install -g vercel
vercel --prod                                 # uses vite preset automatically
```

### Netlify

```sh
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Or commit a `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### Cloudflare Pages

Build command: `npm run build` · Output directory: `dist` · Node version: 20.

### GitHub Pages

```sh
npm run build
# then push dist/ to a gh-pages branch via your usual tool
```

If serving from a sub-path like `https://user.github.io/iss_tracker/`, set Vite's `base` in [vite.config.ts](../vite.config.ts):

```ts
export default defineConfig({
  plugins: [react()],
  base: '/iss_tracker/',
  ...
});
```

### Self-hosted / S3 + CloudFront / nginx

Serve `dist/` as static files. SPA routing isn't needed (single page, no client router). Just enable gzip and a long cache on `dist/assets/*` (filenames are hashed).

Suggested headers:

```
Cache-Control: public, max-age=31536000, immutable    # for /assets/*
Cache-Control: public, max-age=0, must-revalidate     # for index.html
```

## Debugging

### Inspect polling activity

DevTools → Network → filter for `wheretheiss.at`. You should see one request roughly every 5s. While the tab is hidden, no requests should fire — see [src/hooks/useIssPolling.ts](../src/hooks/useIssPolling.ts) and [src/hooks/usePageVisibility.ts](../src/hooks/usePageVisibility.ts).

### Force the reconnect path

In DevTools console:

```js
// Force every subsequent fetch to fail
const realFetch = window.fetch;
window.fetch = () => Promise.reject(new TypeError('forced fail'));
// …after 2 consecutive failures, the LIVE pill turns amber "RECONNECTING"
// Restore:
window.fetch = realFetch;
```

After ~30s of failures, `Last updated` will append ` — stale` in amber. See acceptance criteria in [docs/prd/prd-001-iss-live-tracker.md#cuj-5](./prd/prd-001-iss-live-tracker.md).

### Force a long-gap / fade-jump on the marker

In DevTools console, fire a synthetic visibility change to make the polling hook think the tab was hidden, then restore it:

```js
Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
document.dispatchEvent(new Event('visibilitychange'));
// wait several seconds, then:
Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
document.dispatchEvent(new Event('visibilitychange'));
```

On resume the marker should fade out → fade in at the new position (not linearly interpolate across the gap). The trail polyline should NOT bridge the gap.

### Inspect reducer state

Add a temporary effect in [src/App.tsx](../src/App.tsx) to log state on every change:

```ts
useEffect(() => { console.log('state', state); }, [state]);
```

React DevTools also works — `App` is the only `useReducer` owner.

### Inspect the Leaflet map instance

The map ref is held in App as `mapInstance` state. From DevTools console:

```js
// Find the live container
const el = document.querySelector('.leaflet-container');
// Leaflet doesn't expose the map directly via the DOM, but you can grab it from React DevTools
// (select the MapInner component, look at its hooks → the `useMap()` return value)
```

Or temporarily expose it in [src/components/MapView.tsx](../src/components/MapView.tsx) for ad-hoc debugging:

```ts
// inside MapInner's mount effect
;(window as any).__map = map;
// then in console: window.__map.getBounds(), window.__map.getZoom(), …
```

Remove before commit.

### Verify the trail visually skips outage gaps

Use the visibility-change trick above to force a gap > 8s (`TRAIL_GAP_THRESHOLD_MS` in [src/constants.ts](../src/constants.ts)). The trail should show two disconnected segments with empty space between, not a single bridged line.

### Verify the antimeridian split

In DevTools console, dispatch a synthetic sample crossing 180°:

```js
// (advanced — only useful if you've wired window.__dispatch for debugging)
```

Easier: wait until the ISS is over the Pacific in the actual API (lon ~ ±170°+) and watch the trail behavior.

### Check the bundle

```sh
npm run build
ls -la dist/assets/
# index-*.js   ~ 320 KB raw / ~ 97 KB gzipped
# index-*.css  ~  30 KB raw / ~ 10 KB gzipped
```

If the JS bundle creeps past ~500 KB raw, audit dependencies — react + react-dom + leaflet + react-leaflet are the only runtime deps and account for ~95% of the size.

## Configuration knobs

All in [src/constants.ts](../src/constants.ts) — no env vars at runtime:

| Constant | Default | Notes |
|---|---|---|
| `POLL_BASE_MS` | 5000 | Healthy polling cadence |
| `POLL_BACKOFF_MS` | `[5000, 10000, 20000, 30000]` | Indexed by `consecutiveFailures` |
| `FETCH_TIMEOUT_MS` | 8000 | AbortController kicks in past this |
| `TRAIL_MAX_POINTS` | 20 | Cap on trail length |
| `TRAIL_GAP_THRESHOLD_MS` | 8000 | Segments with longer gap aren't drawn |
| `STALE_THRESHOLD_MS` | 30000 | When `Last updated` turns amber + "— stale" |
| `BREAKPOINT_MOBILE_PX` | 768 | Mobile bottom sheet below this |

Tile source is also in this file (`TILE_URL` — CartoDB Dark Matter). Swap to another OSM-based dark tile source if needed; remember to update `TILE_ATTRIBUTION` per their terms.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Map tiles don't load | CartoDB CDN blocked / offline | Check Network tab. Substitute a different OSM tile URL in `src/constants.ts` |
| Marker never appears | `wheretheiss.at` blocked / down | Network tab → look for failed requests. Check [https://wheretheiss.at](https://wheretheiss.at) status |
| Console error about `iconUrl` from Leaflet | Default marker assets missing (Vite issue) | We use `L.divIcon` for the ISS marker so this should not occur. If it does, the offender is a `<Marker>` somewhere — find and replace |
| `Last updated` always shows "stale" | System clock drift or API timestamp issue | The relative time uses `state.nowMs - current.receivedAtMs`, both wall-clock. Check `Date.now()` in console |
| Bottom sheet doesn't appear on mobile | Viewport > 767px | The split is at `BREAKPOINT_MOBILE_PX = 768`. Resize below 768 in DevTools device toolbar |
| Follow toggle keeps flipping itself off | Should be fixed by counter-based `programmaticPendingRef` ([MapView.tsx:40](../src/components/MapView.tsx#L40)). If reproducible, file a bug with timeline |

## Reference

- PRD: [docs/prd/prd-001-iss-live-tracker.md](./prd/prd-001-iss-live-tracker.md)
- Architecture: [docs/design/system.md](./design/system.md)
- Component design: [docs/design/design-iss-tracker.md](./design/design-iss-tracker.md)
- Mocks: [docs/ux/prd-001-iss-live-tracker-mockups/](./ux/prd-001-iss-live-tracker-mockups/)
- QA report: [docs/qa-report.md](./qa-report.md)
- API docs: [https://wheretheiss.at/w/developer](https://wheretheiss.at/w/developer) (rate limit ~1 req/s; we poll at 0.2 req/s)
