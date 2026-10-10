"use client";

import Link from "next/link";
import { createContext, useContext } from "react";

/** Avant le lancement public, la landing ne mène nulle part : aucun lien vers l'app. */
const Locked = createContext(false);

export const LockProvider = ({ locked, children }: { locked: boolean; children: React.ReactNode }) => (
  <Locked.Provider value={locked}>{children}</Locked.Provider>
);

export const useLocked = () => useContext(Locked);

/**
 * Lien vers l'app. Verrouillé : `hide` le retire (boutons « Lancer l'application »),
 * sinon le contenu reste affiché sans lien (aperçus des marchés).
 */
export function AppLink({ hide = false, ...props }: React.ComponentProps<typeof Link> & { hide?: boolean }) {
  const locked = useLocked();
  if (!locked) return <Link {...props} />;
  if (hide) return null;
  return <div className={props.className}>{props.children}</div>;
}
