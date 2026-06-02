import { formatRelative } from '../state';
import type { State } from '../state';
import { MOBILE_SHEET_COLLAPSED_PX } from '../constants';
import ConnectionStatus from './ConnectionStatus';

type BottomSheetProps = {
  state: State;
  onToggleSheet: () => void;
  onCollapse: () => void;
};

function MiniMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.06] bg-bg-card px-3 py-2.5">
      <div className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-text-muted">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1 text-[18px] font-medium text-text-primary">
        <span className="font-mono tabular-nums">{value}</span>
        {unit ? <span className="font-mono text-[11px] text-text-dim">{unit}</span> : null}
      </div>
    </div>
  );
}

export default function BottomSheet({ state, onToggleSheet, onCollapse }: BottomSheetProps) {
  const c = state.current;
  const lastUpdated = c ? formatRelative(state.nowMs - c.receivedAtMs) : null;
  const expanded = state.isSheetExpanded;

  const compactLat = c ? `${Math.abs(c.lat).toFixed(1)}°${c.lat >= 0 ? 'N' : 'S'}` : '—';
  const compactLon = c ? `${Math.abs(c.lon).toFixed(1)}°${c.lon >= 0 ? 'E' : 'W'}` : '—';

  return (
    <>
      {expanded ? (
        <div
          className="fixed inset-0 z-[750] bg-transparent"
          onClick={onCollapse}
          aria-hidden="true"
        />
      ) : null}

      <section
        aria-label="ISS telemetry"
        className="glass fixed bottom-0 left-0 right-0 z-[800] overflow-hidden rounded-t-2xl border-t border-white/[0.08] shadow-[0_-12px_28px_rgba(0,0,0,0.45)] transition-[height] duration-300 ease-out"
        style={{
          height: expanded
            ? 'min(50vh, 470px)'
            : `calc(${MOBILE_SHEET_COLLAPSED_PX}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <button
          type="button"
          onClick={onToggleSheet}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse telemetry' : 'Expand telemetry'}
          className="flex w-full items-center justify-center pt-2 pb-1"
        >
          <span className="block h-1 w-9 rounded-full bg-white/20" />
        </button>

        {!expanded ? (
          <button
            type="button"
            onClick={onToggleSheet}
            aria-label="Expand telemetry"
            className="flex w-full items-center justify-between gap-3 px-4 py-2"
          >
            <ConnectionStatus status={state.status} />
            <div className="flex items-baseline gap-2 font-mono text-[13px] tabular-nums text-text-primary">
              <span>{compactLat}</span>
              <span className="text-text-dim">·</span>
              <span>{compactLon}</span>
            </div>
            <div className="flex items-center gap-2">
              {c?.visibility === 'daylight' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" />
                </svg>
              ) : c?.visibility === 'eclipsed' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#475569" stroke="#94a3b8" strokeWidth="1.6" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : null}
              <span
                className={`font-mono text-[11px] ${
                  lastUpdated?.isStale ? 'text-accent-amber' : 'text-text-muted'
                }`}
              >
                {lastUpdated?.text ?? '—'}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex h-[calc(100%-1.5rem)] flex-col overflow-y-auto px-4 pb-4 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ConnectionStatus status={state.status} />
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">
                  Mission Live
                </span>
              </div>
              <span className="text-[10.5px] text-text-dim">Trail · {state.trail.length}</span>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-text-primary">
              ISS&nbsp;—&nbsp;Zarya
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniMetric
                label="Latitude"
                value={c ? Math.abs(c.lat).toFixed(1) : '—'}
                unit={c ? (c.lat >= 0 ? '° N' : '° S') : '°'}
              />
              <MiniMetric
                label="Longitude"
                value={c ? Math.abs(c.lon).toFixed(1) : '—'}
                unit={c ? (c.lon >= 0 ? '° E' : '° W') : '°'}
              />
              <MiniMetric
                label="Altitude"
                value={c ? Math.round(c.altitudeKm).toString() : '—'}
                unit="km"
              />
              <MiniMetric
                label="Velocity"
                value={c ? Math.round(c.velocityKmh).toLocaleString() : '—'}
                unit="km/h"
              />
              <MiniMetric
                label="Visibility"
                value={c ? (c.visibility === 'daylight' ? 'Daylight' : c.visibility === 'eclipsed' ? 'Eclipsed' : 'Unknown') : '—'}
              />
              <MiniMetric
                label="Last updated"
                value={lastUpdated?.text ?? '—'}
              />
            </div>
            {state.status === 'reconnecting' ? (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-accent-amber">
                <span className="reconnect-dot" />
                <span className="font-mono">Reconnecting…</span>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
