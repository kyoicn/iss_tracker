import { formatKm, formatRelative } from '../state';
import type { State } from '../state';
import { PANEL_WIDTH_PX } from '../constants';
import ConnectionStatus from './ConnectionStatus';

type TelemetryPanelProps = { state: State };

function MetricCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.06] bg-bg-card px-[15px] py-[13px] transition-colors hover:border-accent-cyan-soft/20">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-muted">
          {icon}
          {label}
        </span>
        <span
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-400/30 font-mono text-[9px] text-text-muted"
          aria-hidden="true"
        >
          ?
        </span>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ValueWithUnit({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-[22px] font-medium text-text-primary">
      <span className="font-mono tabular-nums">{value}</span>
      <span className="font-mono text-xs text-text-dim">{unit}</span>
    </div>
  );
}

export default function TelemetryPanel({ state }: TelemetryPanelProps) {
  const c = state.current;
  const lastUpdated = c ? formatRelative(state.nowMs - c.receivedAtMs) : null;

  return (
    <aside
      className="relative z-[700] flex h-screen flex-col border-l border-white/[0.06] bg-bg-panel"
      style={{ width: PANEL_WIDTH_PX }}
      aria-label="ISS telemetry"
    >
      <div className="px-[22px] pt-[22px] pb-[18px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ConnectionStatus status={state.status} />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">
              Mission Live
            </span>
          </div>
        </div>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.015em] text-text-primary">
          ISS&nbsp;—&nbsp;Zarya
        </h1>
        <div className="mt-1 flex items-center justify-between text-[12.5px] leading-snug text-text-muted">
          <span>
            {c ? `Altitude · ${formatKm(c.altitudeKm)}` : 'Locating ISS…'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            Trail · {state.trail.length}
          </span>
        </div>
      </div>

      <div className="px-[22px]">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-text-dim">
            Position
          </span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <MetricCard
            label="Latitude"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 12h18" />
                <path d="M5 8h14M5 16h14" opacity=".5" />
              </svg>
            }
          >
            {c ? (
              <ValueWithUnit value={Math.abs(c.lat).toFixed(1)} unit={c.lat >= 0 ? '° N' : '° S'} />
            ) : (
              <ValueWithUnit value="—" unit="°" />
            )}
          </MetricCard>
          <MetricCard
            label="Longitude"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3v18" />
                <path d="M8 5v14M16 5v14" opacity=".5" />
              </svg>
            }
          >
            {c ? (
              <ValueWithUnit value={Math.abs(c.lon).toFixed(1)} unit={c.lon >= 0 ? '° E' : '° W'} />
            ) : (
              <ValueWithUnit value="—" unit="°" />
            )}
          </MetricCard>
          <MetricCard
            label="Altitude"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3l4 6h-3v12h-2V9H8z" />
              </svg>
            }
          >
            {c ? (
              <ValueWithUnit value={Math.round(c.altitudeKm).toString()} unit="km" />
            ) : (
              <ValueWithUnit value="—" unit="km" />
            )}
          </MetricCard>
        </div>
      </div>

      <div className="mt-[18px] px-[22px]">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-text-dim">
            Telemetry
          </span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Velocity"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 12h13M11 7l5 5-5 5" />
              </svg>
            }
          >
            {c ? (
              <ValueWithUnit value={Math.round(c.velocityKmh).toLocaleString()} unit="km/h" />
            ) : (
              <ValueWithUnit value="—" unit="km/h" />
            )}
          </MetricCard>
          <MetricCard
            label="Visibility"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="4" />
              </svg>
            }
          >
            <div className="flex items-center gap-2 text-[20px] font-medium text-text-primary">
              {c?.visibility === 'daylight' ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.45))' }}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" fill="#f59e0b" stroke="none" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2 2M17.4 17.4l2 2M4.6 19.4l2-2M17.4 6.6l2-2" />
                  </svg>
                  <span>Daylight</span>
                </>
              ) : c?.visibility === 'eclipsed' ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#475569" />
                  </svg>
                  <span>Eclipsed</span>
                </>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
          </MetricCard>
        </div>
      </div>

      <div className="flex-1" />

      <div className="mx-[22px] mb-5 mt-4 rounded-[10px] border border-white/[0.06] bg-bg-card px-[15px] py-[13px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Last updated
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-dim">Polling · 5s</span>
        </div>
        <div
          className={`mt-1.5 font-mono text-[20px] tabular-nums ${
            lastUpdated?.isStale ? 'text-accent-amber' : 'text-text-primary'
          }`}
        >
          {lastUpdated ? lastUpdated.text : '—'}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-text-dim">
          {state.status === 'reconnecting' ? (
            <>
              <span className="reconnect-dot" />
              <span className="font-mono">Reconnecting…</span>
            </>
          ) : (
            <>
              <span className="live-dot" />
              <span className="font-mono">wheretheiss.at · {state.trail.length} fixes</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
