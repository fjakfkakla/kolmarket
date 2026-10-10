import type { CSSProperties, ReactNode } from "react";

/** La pièce imprimée (DA §11.1) : un disque à la couleur de ce qu'il porte, le signe en blanc. */
export function Coin({
  tint,
  size = 36,
  children,
  ring = false,
  className = "",
  style,
}: {
  tint: [string, string, string];
  size?: number;
  children?: ReactNode;
  /** Cerclée de blanc : pour une pièce posée sur une planche ou une photo. */
  ring?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [a, b, c] = tint;
  return (
    <span
      className={`coin ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        ["--coin" as string]: `linear-gradient(150deg, ${a} 0%, ${b} 50%, ${c} 100%)`,
        ["--coin-shadow" as string]: `${c}b0`,
        ...(ring
          ? {
              boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.45), inset 0 -2.5px 0 rgba(0,0,0,.16), 0 0 0 ${Math.max(2, size * 0.05)}px #fff, 0 12px 24px -12px rgba(5,18,60,.6)`,
            }
          : null),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Le glyphe du résultat « Aucun » : le calendrier qui se ferme. */
export function CalendarGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M7 2.5a1.5 1.5 0 0 1 3 0V4h4V2.5a1.5 1.5 0 0 1 3 0V4h.5A3.5 3.5 0 0 1 21 7.5v11a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 18.5v-11A3.5 3.5 0 0 1 6.5 4H7V2.5ZM6 10v8.5c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5V10H6Zm3.3 2.3a1 1 0 0 1 1.4 0l1.3 1.29 1.3-1.3a1 1 0 1 1 1.4 1.42L13.42 15l1.3 1.3a1 1 0 0 1-1.42 1.4L12 16.42l-1.3 1.3a1 1 0 0 1-1.4-1.42L10.58 15l-1.3-1.3a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

/** La pièce d'un résultat de marché memecoin. */
export function OutcomeCoin({ outcome, size = 36, ring = false }: { outcome: { mark: string; tint: [string, string, string]; name: string }; size?: number; ring?: boolean }) {
  return (
    <Coin tint={outcome.tint} size={size} ring={ring}>
      {outcome.mark ? <span aria-label={outcome.name}>{outcome.mark}</span> : <CalendarGlyph size={size * 0.5} />}
    </Coin>
  );
}
