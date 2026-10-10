import Link from "next/link";

/** Le symbole : la courbe qui monte et finit sur une pièce. Un dessin, deux supports. */
export function LogoMark({ size = 30, on = "paper" }: { size?: number; on?: "paper" | "plank" }) {
  const plank = on === "plank";
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: plank ? "#fff" : "linear-gradient(140deg,#5b80ff 0%,#2e5cff 46%,#1f45e0 100%)",
        color: plank ? "#2e5cff" : "#fff",
        boxShadow: plank
          ? "inset 0 -2px 0 rgba(8,24,90,.16), 0 6px 14px -8px rgba(5,18,60,.6)"
          : "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 0 rgba(0,0,0,.18), 0 8px 16px -9px rgba(31,69,224,.75)",
      }}
      aria-hidden
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
        <path d="M3.5 17.5 8.6 11l3.9 3.6 5.2-7.1" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19.6" cy="5.4" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ size = 24, on = "paper", href = "/app" }: { size?: number; on?: "paper" | "plank"; href?: string }) {
  const plank = on === "plank";
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2" aria-label="Marketcoins">
      <LogoMark size={Math.round(size * 1.28)} on={on} />
      <span className="font-display leading-none tracking-[-0.035em]" style={{ fontSize: size }}>
        <span className={`font-extrabold ${plank ? "text-white" : "text-ink"}`}>Market</span>
        <span className="font-medium" style={{ color: plank ? "#a9c1ff" : "#2e5cff" }}>coins</span>
      </span>
    </Link>
  );
}
