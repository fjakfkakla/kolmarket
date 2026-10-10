"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, ExternalLink, Info, Loader2, X } from "lucide-react";
import type { Wallet } from "@wallet-standard/base";
import { type DepositStep, useWallet } from "@/lib/wallet";
import { CLUSTER } from "@/lib/cluster";
import { DEPOSIT_CAP, MIN_DEPOSIT, MIN_WITHDRAWAL, depositRoom } from "@/lib/limits";
import { INSTALL_LINKS, openInWalletLinks, useSolanaWallets } from "@/lib/solana-wallets";
import { shortWallet, usd } from "@/lib/format";

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6 pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-cream-2 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);

function ConnectModal() {
  const w = useWallet();
  const wallets = useSolanaWallets();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const go = async (wallet: Wallet) => {
    setErr(null);
    setBusy(wallet.name);
    try {
      await w.signIn(wallet);
    } catch (e) {
      setErr((e as Error).message || "Connexion impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell title="Se connecter" onClose={() => w.openModal(null)}>
      <p className="mb-4 text-sm text-muted">
        Choisis ton wallet Solana. Une signature gratuite suffit pour créer ton compte : ce n&apos;est pas une transaction,
        aucun fonds ne bouge et ta clé privée ne quitte jamais ton wallet.
      </p>

      {wallets.length > 0 ? (
        <div className="space-y-2">
          {wallets.map((wl) => (
            <button
              key={wl.name}
              disabled={!accepted || busy !== null}
              onClick={() => go(wl)}
              className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-gold hover:bg-gold-soft/40 disabled:opacity-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- icône fournie par le wallet (data URI) */}
              <img src={wl.icon} alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <span className="flex-1 font-semibold">{wl.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                {busy === wl.name ? <><Loader2 size={12} className="animate-spin" /> Signature…</> : "Détecté"}
              </span>
            </button>
          ))}
          <p className="pt-1 text-xs text-muted">Tous les wallets Solana installés apparaissent ici automatiquement.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-line p-4 text-sm">
          <p className="font-semibold">Aucun wallet Solana détecté.</p>
          {isMobile() ? (
            <>
              <p className="mt-1 text-muted">Sur téléphone, ouvre le site dans l&apos;application de ton wallet :</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {openInWalletLinks(location.href, location.origin).map((l) => (
                  <a key={l.name} href={l.href} className="btn-ghost py-2">Ouvrir dans {l.name}</a>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-muted">Installe un wallet puis recharge la page :</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {INSTALL_LINKS.map((l) => (
                  <a key={l.name} href={l.href} target="_blank" rel="noreferrer" className="btn-ghost py-2 text-xs">
                    {l.name} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-gold" />
        <span>
          J&apos;ai plus de 18 ans et j&apos;accepte les{" "}
          <a href="/conditions" className="font-semibold text-ink underline">conditions d&apos;utilisation</a>. Je comprends que les
          paris comportent un risque de perte.
        </span>
      </label>
      {err && <p className="mt-3 text-sm text-down">{err}</p>}
    </Shell>
  );
}

const STEP_LABEL: Record<DepositStep, string> = {
  prepare: "Préparation…",
  sign: "Confirme dans ton wallet…",
  send: "Envoi…",
  confirm: "Confirmation sur Solana (~15 s)…",
};

function DepositModal() {
  const w = useWallet();
  const room = depositRoom(w.balance, w.inPlay);
  const [amount, setAmount] = useState(Math.min(100, Math.floor(room)));
  const [step, setStep] = useState<DepositStep | "form" | "done">("form");
  const [done, setDone] = useState<{ credited: number; excess: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const busy = step !== "form" && step !== "done";

  const confirm = async () => {
    setErr(null);
    setStep("prepare");
    const r = await w.deposit(amount, setStep);
    if ("error" in r) {
      setErr(r.error);
      setStep("form");
    } else {
      setDone(r);
      setStep("done");
    }
  };

  return (
    <Shell title="Déposer des USDC" onClose={() => !busy && w.openModal(null)}>
      {step === "done" && done ? (
        <div className="py-6 text-center pop">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-up-soft text-up"><Check size={28} /></div>
          <div className="text-lg font-bold">Dépôt crédité</div>
          <div className="mono mt-1 text-muted">+{usd(done.credited)} sur ton solde</div>
          {done.excess > 0 && (
            <p className="mt-2 text-xs text-muted">
              {usd(done.excess)} dépassaient le plafond de {usd(DEPOSIT_CAP)} : ils sont mis de côté, tu peux les retirer.
            </p>
          )}
        </div>
      ) : !w.depositsEnabled ? (
        <p className="text-sm text-muted">Les dépôts ne sont pas encore ouverts. Reviens très bientôt.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-cream-2 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2775ca] font-bold text-white">$</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                USDC · réseau Solana {CLUSTER === "devnet" && <span className="pill-gold py-0 text-[10px]">devnet</span>}
              </div>
              <div className="text-xs text-muted">0 frais : on paie le réseau pour toi.</div>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Depuis</span>
            <span className="mono">{w.provider ?? "Wallet"} · {shortWallet(w.address!)}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted">
              <span>Montant</span>
              <span className="mono normal-case tracking-normal">encore {usd(room)} possibles</span>
            </div>
            <div className="flex gap-2">
              <input type="number" min={MIN_DEPOSIT} max={room} value={amount} disabled={busy} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className="input mono" />
              {[50, 100].map((v) => (
                <button key={v} disabled={busy} onClick={() => setAmount(Math.min(v, room))} className="btn-ghost px-3">{v}</button>
              ))}
              <button disabled={busy} onClick={() => setAmount(room)} className="btn-ghost px-3">Max</button>
            </div>
          </div>
          <p className="text-xs text-muted">
            Plafond : {usd(DEPOSIT_CAP)} sur ton compte, mises en cours comprises. Les gains au-delà se gardent, mais tu ne peux plus
            déposer tant que tu es au-dessus.
          </p>
          {!w.live ? (
            <div className="flex items-start gap-2 rounded-xl bg-gold-soft p-3 text-xs text-ink">
              <Info size={16} className="mt-0.5 shrink-0 text-gold-3" />
              Démo : aucun USDC n&apos;est envoyé.
            </div>
          ) : CLUSTER === "devnet" ? (
            <div className="flex items-start gap-2 rounded-xl bg-gold-soft p-3 text-xs text-ink">
              <Info size={16} className="mt-0.5 shrink-0 text-gold-3" />
              Réseau de test : utilise des USDC devnet (faucet.circle.com), pas de vrais USDC.
            </div>
          ) : null}
          {err && <p className="text-sm text-down">{err}</p>}
          <button onClick={confirm} disabled={busy || room <= 0} className="btn-gold w-full py-3 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}{" "}
            {room <= 0 ? "Plafond atteint" : busy ? STEP_LABEL[step as DepositStep] : w.live ? `Déposer ${usd(amount)}` : `Simuler le dépôt de ${usd(amount)}`}
          </button>
        </div>
      )}
    </Shell>
  );
}

function WithdrawModal() {
  const w = useWallet();
  const [amount, setAmount] = useState(Math.min(50, Math.floor(w.balance)));
  const [err, setErr] = useState<string | null>(null);
  return (
    <Shell title="Retirer des USDC" onClose={() => w.openModal(null)}>
      <div className="space-y-4">
        <div className="rounded-xl bg-cream-2 p-3 text-sm">
          Disponible : <span className="mono font-bold">{usd(w.balance + w.excess)}</span>
          {w.excess > 0 && <span className="text-muted"> (dont {usd(w.excess)} au-delà du plafond)</span>}
        </div>
        {w.live && (
          <div className="flex items-start gap-2 rounded-xl bg-gold-soft p-3 text-xs text-ink">
            <Info size={16} className="mt-0.5 shrink-0 text-gold-3" />
            Les retraits arrivent à la prochaine étape.
          </div>
        )}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Montant</div>
          <div className="flex gap-2">
            <input type="number" min={MIN_WITHDRAWAL} max={w.balance} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="input mono" />
            <button onClick={() => setAmount(w.balance)} className="btn-ghost px-3">Max</button>
          </div>
          <div className="mt-1 text-xs text-muted">Minimum {usd(MIN_WITHDRAWAL)} · 0 frais</div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Vers ton wallet</div>
          <div className="input mono break-all text-xs text-muted">{w.address}</div>
          <div className="mt-1 text-xs text-muted">Les retraits partent uniquement vers le wallet connecté.</div>
        </div>
        {err && <p className="text-sm text-down">{err}</p>}
        <button
          onClick={() => {
            const e = w.withdraw(amount);
            if (e) setErr(e);
            else w.openModal(null);
          }}
          disabled={w.live}
          className="btn-dark w-full py-3 disabled:opacity-50"
        >
          <ArrowUpFromLine size={16} /> Retirer {usd(amount)}{w.live ? "" : " (démo)"}
        </button>
      </div>
    </Shell>
  );
}

export function Modals() {
  const w = useWallet();
  if (w.modal === "connect") return <ConnectModal />;
  if (w.modal === "deposit" && w.connected) return <DepositModal />;
  if (w.modal === "withdraw" && w.connected) return <WithdrawModal />;
  return null;
}
