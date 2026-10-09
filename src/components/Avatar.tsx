import Image from "next/image";
import type { Kol } from "@/data/kols";

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
  const style = { width: size, height: size };
  const ringStyle = ring ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${kol.color}` } : undefined;
  if (kol.avatar) {
    return (
      <Image
        src={kol.avatar}
        alt={kol.name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ ...style, ...ringStyle }}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{ ...style, ...ringStyle, background: `linear-gradient(135deg, ${kol.color}, #1b1b1f)`, fontSize: size * 0.4 }}
      aria-label={kol.name}
    >
      {kol.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
