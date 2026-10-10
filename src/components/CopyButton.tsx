"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, className = "", label }: { value: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {}
  };
  if (label) {
    return (
      <button
        type="button"
        onClick={copy}
        className={`inline-flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-bold transition ${
          done ? "border-blue bg-blue text-white" : "border-blue/45 text-blue hover:border-blue"
        } ${className}`}
      >
        {done ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />} {done ? "Copié" : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      title="Copier"
      onClick={copy}
      className={`inline-grid h-6 w-6 place-items-center rounded-full text-faint transition hover:bg-relief hover:text-ink active:scale-90 ${className}`}
    >
      {done ? <Check size={13} className="text-up" strokeWidth={3} /> : <Copy size={13} />}
    </button>
  );
}
