import Link from "next/link";

/** Le symbole : une pièce, son liseré, et la flèche qui monte. Un dessin, deux supports. */
export function LogoMark({ size = 30, on = "paper" }: { size?: number; on?: "paper" | "plank" }) {
  const plank = on === "plank";
  const edge = Math.max(2, Math.round(size / 11));
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: plank ? "#fff" : "#1652f0",
        color: plank ? "#1652f0" : "#fff",
        boxShadow: `0 ${edge}px 0 ${plank ? "rgba(8,24,90,.35)" : "#0b36b8"}`,
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12.6" stroke="currentColor" strokeOpacity=".38" strokeWidth="1.6" />
        <path d="M9.5 20.5 14 15.6l3 2.8 5.5-6.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.4 11.6h4.4V16" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ size = 24, on = "paper", href = "/app" }: { size?: number; on?: "paper" | "plank"; href?: string }) {
  const plank = on === "plank";
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2" aria-label="Marketcoins">
      <LogoMark size={Math.round(size * 1.3)} on={on} />
      <span className="font-display font-extrabold leading-none tracking-[-0.04em]" style={{ fontSize: size }}>
        <span className={plank ? "text-white" : "text-ink"}>market</span>
        <span style={{ color: plank ? "#a9c1ff" : "#1652f0" }}>coins</span>
      </span>
    </Link>
  );
}
