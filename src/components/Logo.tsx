import Link from "next/link";

/** Le symbole : une pièce Poly Blue, la courbe qui monte et finit sur le point volt. Un dessin, deux supports. */
export function LogoMark({ size = 30, on = "paper" }: { size?: number; on?: "paper" | "plank" }) {
  const plank = on === "plank";
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: plank ? "#fff" : "#2e5cff",
        color: plank ? "#2e5cff" : "#fff",
        boxShadow: `0 ${Math.max(2, Math.round(size / 12))}px 0 ${plank ? "rgba(11,12,16,.9)" : "#0b0c10"}`,
      }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M3 16.5 8.2 10.6l3.9 3.4 5.4-6.6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19.4" cy="5.6" r="3.1" fill="#d6ff3d" stroke={plank ? "#2e5cff" : "#0b0c10"} strokeWidth="1.4" />
      </svg>
    </span>
  );
}

export function Logo({ size = 24, on = "paper", href = "/app" }: { size?: number; on?: "paper" | "plank"; href?: string }) {
  const plank = on === "plank";
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2.5" aria-label="Marketcoins">
      <LogoMark size={Math.round(size * 1.3)} on={on} />
      <span className="leading-none" style={{ fontSize: size }}>
        <span className={`font-display font-extrabold tracking-[-0.035em] [font-stretch:112%] ${plank ? "text-white" : "text-ink"}`}>Market</span>
        <span className="accent" style={{ color: plank ? "#d6ff3d" : "#2e5cff" }}>coins</span>
      </span>
    </Link>
  );
}
