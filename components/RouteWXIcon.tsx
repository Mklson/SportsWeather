export function RouteWXIcon({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cloud body — overlapping circles + base rect */}
      <circle cx="30" cy="19" r="12" fill="#3b82f6" />
      <circle cx="18" cy="25" r="9"  fill="#3b82f6" />
      <circle cx="44" cy="24" r="10" fill="#3b82f6" />
      <rect   x="9"  y="24"  width="46" height="13" fill="#3b82f6" rx="1" />

      {/* Wind lines — progressively shorter and lighter */}
      <path d="M7 44 Q32 40 57 44"  stroke="#1d4ed8" strokeWidth="3"   strokeLinecap="round" />
      <path d="M12 52 Q33 48 52 52" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 59 Q32 56 47 59" stroke="#60a5fa" strokeWidth="2"   strokeLinecap="round" />
    </svg>
  );
}
