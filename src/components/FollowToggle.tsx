type FollowToggleProps = {
  follow: boolean;
  onToggle: () => void;
};

export default function FollowToggle({ follow, onToggle }: FollowToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={follow}
      aria-label="Follow ISS"
      onClick={onToggle}
      className={`glass absolute top-4 right-4 z-[600] flex items-center gap-2.5 rounded-full pl-2 pr-3 py-1.5 transition-colors whitespace-nowrap ${
        follow ? 'border-accent-cyan/40' : 'border-white/8'
      }`}
    >
      <span
        className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
          follow ? 'bg-cyan-950' : 'bg-slate-700'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
            follow
              ? 'left-3.5 bg-accent-cyan-soft shadow-[0_0_8px_rgba(125,211,252,0.7)]'
              : 'left-0.5 bg-slate-300'
          }`}
        />
      </span>
      <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Follow ISS</span>
      <span
        className={`ml-auto text-[9.5px] font-mono uppercase ${
          follow ? 'text-accent-cyan-soft' : 'text-text-dim'
        }`}
      >
        {follow ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
