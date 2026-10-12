"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
import { LaunchCountdown } from "../LaunchCountdown";
import { Logo } from "../Logo";
import { useI18n } from "@/i18n/client";

/**
 * Avant le lancement public, les liens de la landing vers l'app n'y mènent pas :
 * un clic ouvre le chrono en plein écran, sur la landing même (aucune autre adresse).
 */
type Lock = { locked: boolean; show: () => void };
const LockContext = createContext<Lock>({ locked: false, show: () => {} });

export function LockProvider({ locked, at, serverNow, children }: { locked: boolean; at: number | null; serverNow: number; children: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <LockContext.Provider value={{ locked, show: () => setOpen(true) }}>
      {children}
      {locked && open && (
        <div className="fade-up fixed inset-0 z-[100] flex flex-col items-center justify-center gap-12 bg-white px-4" role="dialog" aria-modal="true">
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink md:right-8 md:top-6" aria-label={t.landing.countdown.close}>
            <X size={22} />
          </button>
          <Logo size={26} href="/" />
          <LaunchCountdown at={at} serverNow={serverNow} />
        </div>
      )}
    </LockContext.Provider>
  );
}

/** Lien vers l'app : verrouillé, il garde son apparence mais ouvre le chrono. */
export function AppLink(props: React.ComponentProps<typeof Link>) {
  const { locked, show } = useContext(LockContext);
  if (!locked || props.href === "/") return <Link {...props} />;
  const { className, children } = props;
  return (
    <button type="button" onClick={show} className={`${className ?? ""} cursor-pointer text-left`} aria-label={props["aria-label"]}>
      {children}
    </button>
  );
}
