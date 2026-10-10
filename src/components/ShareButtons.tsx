"use client";

import { useState } from "react";
import { Bookmark, Check, Link2 } from "lucide-react";

export function ShareButtons() {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        className="round"
        title="Copier le lien"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {}
        }}
      >
        {copied ? <Check size={15} className="text-up" strokeWidth={3} /> : <Link2 size={15} />}
      </button>
      <button className="round" title="Garder ce marché" aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
        <Bookmark size={15} className={saved ? "fill-blue text-blue" : ""} />
      </button>
    </div>
  );
}
