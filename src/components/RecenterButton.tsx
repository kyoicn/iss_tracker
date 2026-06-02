type RecenterButtonProps = {
  onRecenter: () => void;
  isMobile: boolean;
};

export default function RecenterButton({ onRecenter, isMobile }: RecenterButtonProps) {
  const baseStyle: React.CSSProperties = isMobile
    ? {
        right: 16,
        bottom: `calc(80px + env(safe-area-inset-bottom, 0px) + 16px)`,
        width: 44,
        height: 44,
      }
    : { right: 16, bottom: 38, width: 48, height: 48 };

  return (
    <button
      type="button"
      aria-label="Recenter map on ISS"
      onClick={onRecenter}
      className="absolute z-[600] flex items-center justify-center rounded-full bg-accent-cyan text-bg-app shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-opacity hover:brightness-110 toast-in"
      style={baseStyle}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}
