"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  const { t } = useI18n();
  return (
    <button
      type="button"
      title={t.common.copy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {}
      }}
      className={`inline-grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-cream-2 hover:text-ink ${className}`}
    >
      {done ? <Check size={13} className="text-up" /> : <Copy size={13} />}
    </button>
  );
}
