import Image from "next/image";
import type { Kol } from "@/data/kols";
import { Coin } from "./Coin";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** La photo ronde d'un KOL ; sans photo, sa pièce à sa couleur avec ses initiales. */
export function Avatar({
  kol,
  size = 40,
  ring = false,
  className = "",
}: {
  kol: Pick<Kol, "name" | "avatar" | "color">;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const ringShadow = ring ? `0 0 0 2px #fff, 0 0 0 ${size > 44 ? 4.5 : 3.5}px ${kol.color}` : undefined;
  if (kol.avatar) {
    return (
      <Image
        src={kol.avatar}
        alt={kol.name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full bg-relief object-cover ${className}`}
        style={{ width: size, height: size, boxShadow: ringShadow }}
      />
    );
  }
  return (
    <Coin
      tint={[shade(kol.color, 0.14), kol.color, shade(kol.color, -0.16)]}
      size={size}
      className={className}
      style={ringShadow ? { boxShadow: ringShadow } : undefined}
    >
      <span aria-label={kol.name}>{kol.name.slice(0, 2).toUpperCase()}</span>
    </Coin>
  );
}
