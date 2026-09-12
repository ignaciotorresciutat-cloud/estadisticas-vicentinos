export function CopaIcon({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M2 1h6v2.2A3 3 0 015 6.2a3 3 0 01-3-3V1z" fill={color} />
      <path
        d="M2 1.6H.9v.9c0 1 .5 1.6 1.4 1.8M8 1.6h1.1v.9c0 1-.5 1.6-1.4 1.8"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M5 6.2V8M3.2 10h3.6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
