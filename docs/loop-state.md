# Dev Loop State

Last updated: 2026-06-05 19:39:11 (UTC+8)
Iteration: 3 (scoped to prd-001)
Status: **done**

## Last Cycle Summary
- Scope: refined CUJ-2 in prd-001 (zoom decoupled from Follow, zoom-preserving Recenter)
- Tasks executed: 1 surgical implementation in `src/components/MapView.tsx`
- Tasks passed QA: all
- Tasks rolled back by QA: 0
- Tests passing: 77 / 77 (1 skipped live-network smoke gated by env)
- Tests failing: 0
- QA inner loops used: 0
- CUJs completed this cycle: CUJ-2 (refined)
- CUJs remaining: 0 in scope for this iteration

## QA Gate
- Verdict: PASS
  - Acceptance criterion #3a (pan disables Follow): verified — drag-pan flipped Follow to OFF
  - Acceptance criterion #3b (zoom does NOT disable Follow): verified — 4 wheel-zoom-ins kept Follow ON
  - Acceptance criterion #8 (Recenter preserves current zoom): verified — re-enabling Follow at zoom 7 flew to ISS at zoom 7, not snap-back to ISS_LOCK_ZOOM=3
  - Acceptance criterion #10 (zoom-while-following re-anchors via 300ms flyTo): verified — marker landed within 4,6 px of map center after the zoom-anchored shift
- Static gates: typecheck PASS, 77/77 unit tests PASS, build PASS (97.56 KB gzipped)
- Fabrications found: none
- HIGH bugs found: 0
- Tasks rolled back: none

## Implementation Notes
- `MapView.tsx`: added `isZoomingRef` so `movestart` triggered by cursor-anchored zoom's incidental pan no longer fires `onMapInteract`. Added `handleZoomEnd` that schedules a `setTimeout(0)` re-anchor flyTo when Follow is ON and a sample exists — deferring to the next tick avoids event interleaving with the wheel-zoom's own `moveend`.
- Both the marker-tween jump path (non-first-fix only) and the standalone follow-recenter effect now use `map.getZoom()` instead of `ISS_LOCK_ZOOM` for their flyTo calls.
- First-fix still uses `ISS_LOCK_ZOOM` as the introductory lock-on (CUJ-1 step 2 behavior preserved).

## Next Focus
v1 MVP is functionally complete with this refinement. Remaining deferrals (CUJ-3 P1 tooltips, CUJ-4 drag-to-collapse, CUJ-6 1 hr memory soak) are unchanged from iter-2 and not blockers.
