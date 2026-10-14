"use client";

import { CopyButton } from "./CopyButton";
import { shortWallet } from "@/lib/format";

/** Pilule « CA » du coin : un clic copie l'adresse complète. */
export function CaPill({ ca }: { ca: string }) {
  return (
    <span className="shrink-0" title={ca}>
      <CopyButton value={ca} label="CA" className="sm:hidden" />
      <CopyButton value={ca} label={`CA ${shortWallet(ca)}`} className="hidden sm:inline-flex" />
    </span>
  );
}
