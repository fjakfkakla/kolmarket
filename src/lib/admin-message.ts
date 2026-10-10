/**
 * Actions de la page /admin et message que le wallet admin signe pour chacune.
 * Partagé navigateur / serveur : les deux construisent exactement le même texte.
 * Le message est en ASCII (comme la connexion) et contient l'empreinte SHA-256 de l'action :
 * la signature couvre donc chaque détail, même ceux qui ne s'affichent pas dans le wallet.
 */

export type AdminAction =
  | { action: "create_challenge"; title: string; start: string; end: string; kolIds: string[] }
  | { action: "add_kol"; name: string; handle: string; wallet: string; color: string }
  | { action: "set_kol_active"; kolId: string; active: boolean }
  | { action: "resolve_now"; marketId: string; slug: string }
  | { action: "propose_winner"; marketId: string; slug: string; kolId: string; note: string }
  | { action: "settle_now"; marketId: string; slug: string }
  | { action: "cancel_market"; marketId: string; slug: string; reason: string }
  | { action: "start_launch" }
  | { action: "reset_launch" };

export type AdminActionName = AdminAction["action"];

export const ACTION_LABEL: Record<AdminActionName, string> = {
  create_challenge: "Creer un defi",
  add_kol: "Ajouter un KOL",
  set_kol_active: "Activer ou retirer un KOL",
  resolve_now: "Lire le resultat maintenant",
  propose_winner: "Choisir le gagnant",
  settle_now: "Payer le pot maintenant",
  cancel_market: "Annuler le defi et rembourser",
  start_launch: "Lancer le chrono de 7 jours",
  reset_launch: "Arreter le chrono et refermer l'app",
};

const str = (v: unknown, max = 500) => (typeof v === "string" && v.length <= max ? v : null);

/** Relit une action reçue en JSON : champs attendus seulement, dans un ordre fixe. null si invalide. */
export function parseAdminAction(x: unknown): AdminAction | null {
  if (!x || typeof x !== "object") return null;
  const a = x as Record<string, unknown>;
  const s = (k: string, max?: number) => str(a[k], max);
  switch (a.action) {
    case "create_challenge": {
      const kolIds = Array.isArray(a.kolIds) && a.kolIds.length <= 50 && a.kolIds.every((k) => typeof k === "string" && k.length <= 40) ? (a.kolIds as string[]) : null;
      const [title, start, end] = [s("title", 160), s("start", 10), s("end", 10)];
      return title !== null && start !== null && end !== null && kolIds ? { action: a.action, title, start, end, kolIds } : null;
    }
    case "add_kol": {
      const [name, handle, wallet, color] = [s("name", 40), s("handle", 40), s("wallet", 64), s("color", 7)];
      return name !== null && handle !== null && wallet !== null && color !== null ? { action: a.action, name, handle, wallet, color } : null;
    }
    case "set_kol_active": {
      const kolId = s("kolId", 40);
      return kolId !== null && typeof a.active === "boolean" ? { action: a.action, kolId, active: a.active } : null;
    }
    case "resolve_now":
    case "settle_now": {
      const [marketId, slug] = [s("marketId", 40), s("slug", 120)];
      return marketId !== null && slug !== null ? { action: a.action, marketId, slug } : null;
    }
    case "propose_winner": {
      const [marketId, slug, kolId, note] = [s("marketId", 40), s("slug", 120), s("kolId", 40), s("note", 500)];
      return marketId !== null && slug !== null && kolId !== null && note !== null ? { action: a.action, marketId, slug, kolId, note } : null;
    }
    case "cancel_market": {
      const [marketId, slug, reason] = [s("marketId", 40), s("slug", 120), s("reason", 500)];
      return marketId !== null && slug !== null && reason !== null ? { action: a.action, marketId, slug, reason } : null;
    }
    case "start_launch":
    case "reset_launch":
      return { action: a.action };
    default:
      return null;
  }
}

/** Texte lisible dans le wallet, sans accents. */
export const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");

function details(a: AdminAction): string[] {
  switch (a.action) {
    case "create_challenge":
      return [`Titre: ${a.title}`, `Periode: ${a.start} -> ${a.end} (UTC)`, `KOLs: ${a.kolIds.join(", ")}`];
    case "add_kol":
      return [`KOL: ${a.name} (@${a.handle})`, `Wallet: ${a.wallet}`];
    case "set_kol_active":
      return [`KOL: ${a.kolId}`, `Etat: ${a.active ? "actif" : "retire des prochains defis"}`];
    case "resolve_now":
    case "settle_now":
      return [`Defi: ${a.slug}`];
    case "propose_winner":
      return [`Defi: ${a.slug}`, `Gagnant: ${a.kolId}`, `Note: ${a.note}`];
    case "cancel_market":
      return [`Defi: ${a.slug}`, `Raison: ${a.reason}`];
    case "start_launch":
    case "reset_launch":
      return [];
  }
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Message à signer pour une action : le serveur le reconstruit pour vérifier la signature. */
export async function adminMessage(a: AdminAction, nonce: string, issuedAt: string) {
  return [
    "Marketcoins - action admin",
    `Action: ${ACTION_LABEL[a.action]}`,
    ...details(a).map(ascii),
    `Empreinte: ${await sha256Hex(JSON.stringify(a))}`,
    `Nonce: ${nonce}`,
    `Date: ${issuedAt}`,
  ].join("\n");
}
