"use client";

import { useState } from "react";
import { Bookmark, Check, Link2 } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function ShareButtons() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        className="round"
        title={t.app.share.copyLink}
        aria-label={t.app.share.copyLink}
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
      <button className="round" title={t.app.share.save}
        aria-label={t.app.share.save} aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
        <Bookmark size={15} className={saved ? "fill-blue text-blue" : ""} />
      </button>
    </div>
  );
}
