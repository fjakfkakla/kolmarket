import { NextResponse, type NextRequest } from "next/server";
import { allowedOrigins, managedHost } from "@/lib/auth";
import { CLUSTER } from "@/lib/cluster";
import { hotBalanceMicro, solanaConfig } from "@/lib/solana";
import { adminWallets } from "@/lib/admin";
import { readState } from "@/lib/app-state";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Diagnostic de configuration : dit ce qui est branché, sans jamais montrer de secret.
 * Ouvrir /api/health pour savoir pourquoi la connexion ou les dépôts ne marchent pas.
 */
async function solBalance(cfg: NonNullable<Awaited<ReturnType<typeof solanaConfig>>>) {
  try {
    const { value } = await cfg.rpc.getBalance(cfg.feePayer.address, { commitment: "confirmed" }).send();
    return Number(value) / 1e9;
  } catch {
    return "illisible";
  }
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const table = async (name: string) => {
    if (!db) return "pas de base";
    const { error } = await db.from(name).select("*", { head: true, count: "exact" }).limit(1);
    return error ? `manquante (${error.code ?? error.message})` : "ok";
  };
  const rpc = async () => {
    if (!db) return "pas de base";
    const { error } = await db.rpc("liabilities_micro");
    return error ? `manquante (${error.code ?? error.message})` : "ok";
  };
  const lastPnl = async () => {
    if (!db) return null;
    try {
      const s = await readState<{ at: string; ok: boolean }>(db, "pnl_sync");
      return s ? { le: s.at, reussie: s.ok } : "jamais";
    } catch {
      return "table app_state manquante (migration 0005)";
    }
  };
  const secret = process.env.SESSION_SECRET ?? "";
  const solana = await solanaConfig();

  const checks = {
    connexion: {
      SESSION_SECRET: secret.length >= 32 ? "ok" : secret ? "trop court (32 caractères minimum)" : "manquant",
      adresse_de_cette_page: req.headers.get("host"),
      origines_autorisees: allowedOrigins(),
      hebergeur: managedHost() ?? "inconnu (définir APP_URL)",
    },
    base: {
      supabase: db ? "ok" : "variables Supabase manquantes",
      table_accounts_0002: await table("accounts"),
      registre_0003: await rpc(),
    },
    defis: {
      migration_0005: await table("market_results"),
      SOLANATRACKER_API_KEY: process.env.SOLANATRACKER_API_KEY ? "ok" : "manquant (PnL des KOLs et résultats en pause)",
      planificateur:
        (process.env.SCHEDULER?.trim().toLowerCase() ?? (process.env.RAILWAY_ENVIRONMENT_ID ? "on" : "off")) === "on"
          ? "actif : toutes les 10 minutes"
          : "inactif (SCHEDULER=on pour l'activer, ou appeler /api/cron/sync)",
      derniere_synchro_pnl: await lastPnl(),
    },
    admin: {
      migration_0006: await table("admin_actions"),
      ADMIN_WALLETS: adminWallets().length ? `${adminWallets().length} wallet(s)` : "manquant (page /admin fermée)",
    },
    depots: {
      reseau: CLUSTER,
      ALCHEMY_API: process.env.ALCHEMY_API ? "ok" : "manquant",
      VAULT_ADDRESS: process.env.VAULT_ADDRESS ? "ok" : "manquant",
      FEE_PAYER_SECRET_KEY: process.env.FEE_PAYER_SECRET_KEY ? "ok" : "manquant",
      configuration_valide: solana ? "ok" : "non (voir les variables ci-dessus)",
      // Adresses publiques : le payeur doit avoir quelques SOL de test, le compte USDC du coffre va dans le webhook.
      payeur_des_frais: solana?.feePayer.address ?? null,
      solde_payeur_SOL: solana ? await solBalance(solana) : null,
      // La réserve des retraits est sur ce même wallet : y envoyer des USDC (depuis le coffre) pour payer les retraits.
      reserve_retraits_USDC: solana ? Number(await hotBalanceMicro(solana)) / 1e6 : null,
      compte_usdc_du_coffre: solana?.vaultAta ?? null,
      ALCHEMY_WEBHOOK_SIGNING_KEY: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY ? "ok" : "manquant (facultatif au début)",
      CRON_SECRET: process.env.CRON_SECRET ? "ok" : "manquant (facultatif : le planificateur intégré suffit sur Railway)",
    },
  };
  return NextResponse.json(checks, { headers: { "Cache-Control": "no-store" } });
}
