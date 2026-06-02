import type { ConnectionStatus as Status } from '../state';

type ConnectionStatusProps = {
  status: Status;
};

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const reconnecting = status === 'reconnecting';
  const idleOrConnecting = status === 'idle' || status === 'connecting';

  if (reconnecting) {
    return (
      <span
        aria-live="polite"
        aria-atomic="true"
        className="inline-flex items-center gap-1.5 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] font-medium text-amber-200"
      >
        <span className="reconnect-dot" /> Reconnecting
      </span>
    );
  }

  if (idleOrConnecting) {
    return (
      <span
        aria-live="polite"
        aria-atomic="true"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/40 bg-slate-700/20 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] font-medium text-text-muted"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted" />
        Connecting
      </span>
    );
  }

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="inline-flex items-center gap-1.5 rounded-full border border-accent-green/30 bg-accent-green/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] font-medium text-green-200"
    >
      <span className="live-dot" /> Live
    </span>
  );
}
