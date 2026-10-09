import Link from "next/link";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span
        className="grid place-items-center rounded-xl text-ink"
        style={{
          width: size + 8,
          height: size + 8,
          background: "linear-gradient(135deg,#ffd34d,#f7b801)",
          boxShadow: "0 4px 12px -4px rgba(247,184,1,.8)",
        }}
      >
        <svg width={size - 6} height={size - 6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l5-6 4 4 5-8 4 3" />
          <circle cx="21" cy="10" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-[19px]">
        Market<span className="text-gold-3">coins</span>
      </span>
    </Link>
  );
}
