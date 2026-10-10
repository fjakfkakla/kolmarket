"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, ExternalLink, Info, Loader2, X } from "lucide-react";
import type { Wallet } from "@wallet-standard/base";
import { type DepositStep, type WithdrawStatus, useWallet } from "@/lib/wallet";
import { CLUSTER } from "@/lib/cluster";
import { DEPOSIT_CAP, MIN_DEPOSIT, MIN_WITHDRAWAL, depositRoom } from "@/lib/limits";
import { INSTALL_LINKS, openInWalletLinks, useSolanaWallets } from "@/lib/solana-wallets";
import { shortWallet, usd } from "@/lib/format";
import { Coin } from "./Coin";
import { LogoMark } from "./Logo";

const GREEN: [string, string, string] = ["#2fd36d", "#00a03c", "#007e26"];
const GOLD: [string, string, string] = ["#ffd45c", "#f0b429", "#dc9a06"];

/** La carte blanche sur voile d'encre : le logo et le ✕ sur une ligne, puis le titre. */
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
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(8,12,24,.62)] p-4 backdrop-blur-[6px]" onClick={onClose}>
      <div
        className="pop max-h-[92svh] w-full max-w-[440px] overflow-y-auto rounded-[26px] bg-white p-6 shadow-[0_44px_90px_-42px_rgba(8,18,54,.62)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="font-display text-[22px] leading-none tracking-[-0.035em]">
              <span className="font-extrabold">Market</span>
              <span className="font-medium text-blue">coins</span>
            </span>
          </span>
          <button onClick={onClose} className="round" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <h2 className="display mb-5 text-[27px]">{title}</h2>
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
      <p className="mb-4 text-[14px] font-medium leading-relaxed text-ink-2">
        Une signature gratuite crée ton compte : ce n&apos;est pas une transaction, aucun fonds ne bouge et ta clé ne quitte jamais ton wallet.
      </p>

      {wallets.length > 0 ? (
        <div className="space-y-2">
          {wallets.map((wl) => (
            <button
              key={wl.name}
              disabled={!accepted || busy !== null}
              onClick={() => go(wl)}
              className="group flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line bg-white p-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-blue disabled:opacity-45"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- icône fournie par le wallet (data URI) */}
              <img src={wl.icon} alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
              <span className="flex-1 text-[16px] font-bold">{wl.name}</span>
              {busy === wl.name ? (
                <span className="chip-blue">
                  <Loader2 size={12} className="animate-spin" /> Signature
                </span>
              ) : (
                <ArrowRight size={16} className="text-faint transition group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-blue" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-line p-4">
          <p className="font-display text-[17px] font-extrabold tracking-[-0.02em]">Aucun wallet Solana détecté</p>
          {isMobile() ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {openInWalletLinks(location.href, location.origin).map((l) => (
                <a key={l.name} href={l.href} className="ghost h-11 rounded-[14px]">
                  Ouvrir dans {l.name}
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {INSTALL_LINKS.map((l) => (
                <a key={l.name} href={l.href} target="_blank" rel="noreferrer" className="ghost h-11 rounded-[14px] text-[13px]">
                  {l.name} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-paper-2 p-3 text-[14px] font-medium text-ink-2">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1652f0]" />
        <span>
          J&apos;ai plus de 18 ans, j&apos;accepte les{" "}
          <a href="/conditions" className="link">
            conditions d&apos;utilisation
          </a>{" "}
          et je sais qu&apos;une mise peut être perdue.
        </span>
      </label>
      {err && <p className="mt-3 text-[14px] font-semibold text-down-deep">{err}</p>}
    </Shell>
  );
}

const STEP_LABEL: Record<DepositStep, string> = {
  prepare: "Préparation",
  sign: "Confirme dans ton wallet",
  send: "Envoi",
  confirm: "Confirmation sur Solana (~15 s)",
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
    <Shell title={step === "done" ? "Dépôt crédité" : "Déposer des USDC"} onClose={() => !busy && w.openModal(null)}>
      {step === "done" && done ? (
        <div className="pop text-center">
          <Coin tint={GREEN} size={64}>
            <Check size={30} strokeWidth={3} />
          </Coin>
          <div className="num mt-3 font-display text-[34px] font-extrabold tracking-[-0.03em] text-up">+{usd(done.credited)}</div>
          {done.excess > 0 && (
            <p className="mt-2 text-[14px] font-medium text-ink-2">
              {usd(done.excess)} dépassaient le plafond de {usd(DEPOSIT_CAP)} : ils sont mis de côté et restent retirables.
            </p>
          )}
          <button onClick={() => w.openModal(null)} className="plaque mt-5 h-[52px] w-full text-[16px]">
            Miser maintenant <ArrowRight size={17} />
          </button>
        </div>
      ) : !w.depositsEnabled ? (
        <p className="py-6 text-center font-display text-[19px] font-extrabold tracking-[-0.02em] text-muted">Dépôts bientôt ouverts</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-3 shadow-[inset_0_0_0_1px_rgba(22, 82, 240,.22)]">
            <Coin tint={["#4b93e6", "#2775ca", "#1a5aa3"]} size={40}>
              <span>$</span>
            </Coin>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold">
                USDC sur Solana {CLUSTER === "devnet" && <span className="chip h-6">devnet</span>}
              </div>
              <div className="text-[13px] font-semibold text-muted">On paie le réseau pour toi</div>
            </div>
            <span className="chip-blue">0 frais</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="font-semibold text-muted">Depuis</span>
            <span className="num font-bold">
              {w.provider ?? "Wallet"} · {shortWallet(w.address!)}
            </span>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-[14px]">
              <span className="font-bold">Montant</span>
              <span className="num font-semibold text-muted">encore {usd(room)} possibles</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={MIN_DEPOSIT}
                max={room}
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                className="input num"
                aria-label="Montant du dépôt"
              />
              {[50, 100].map((v) => (
                <button key={v} disabled={busy} onClick={() => setAmount(Math.min(v, room))} className={`h-[46px] rounded-[14px] px-3.5 text-[14px] ${amount === v ? "plaque" : "ghost"}`}>
                  {v}
                </button>
              ))}
              <button disabled={busy} onClick={() => setAmount(room)} className="ghost h-[46px] rounded-[14px] px-3.5 text-[14px]">
                Max
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">Plafond {usd(DEPOSIT_CAP)}, mises comprises</span>
            <span className="chip">Les gains au-delà se gardent</span>
          </div>
          {!w.live ? (
            <p className="flex items-center gap-2 rounded-2xl bg-[#fff6dc] px-3 py-2.5 text-[14px] font-semibold text-[#8a5a00]">
              <Info size={16} className="shrink-0" /> Démo : aucun USDC n&apos;est envoyé.
            </p>
          ) : CLUSTER === "devnet" ? (
            <p className="flex items-center gap-2 rounded-2xl bg-[#fff6dc] px-3 py-2.5 text-[14px] font-semibold text-[#8a5a00]">
              <Info size={16} className="shrink-0" /> Réseau de test : des USDC devnet (faucet.circle.com), pas de vrais USDC.
            </p>
          ) : (
            <p className="rounded-2xl bg-down-soft px-3 py-2.5 text-[14px] font-semibold text-down-deep">
              Seulement des USDC, seulement sur Solana : un autre token est perdu.
            </p>
          )}
          {err && <p className="text-[14px] font-semibold text-down-deep">{err}</p>}
          <button onClick={confirm} disabled={busy || room <= 0} className="plaque h-[52px] w-full text-[16px]">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowDownLeft size={17} strokeWidth={2.6} />}
            {room <= 0 ? "Plafond atteint" : busy ? STEP_LABEL[step as DepositStep] : w.live ? `Déposer ${usd(amount)}` : `Simuler le dépôt de ${usd(amount)}`}
          </button>
        </div>
      )}
    </Shell>
  );
}

const EXPLORER = (sig: string) => `https://explorer.solana.com/tx/${sig}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`;

function WithdrawModal() {
  const w = useWallet();
  const available = Math.floor((w.balance + w.excess) * 100) / 100;
  const [amount, setAmount] = useState(Math.min(50, Math.floor(available)));
  const [step, setStep] = useState<"form" | "request" | "sending" | "done">("form");
  const [result, setResult] = useState<{ status: WithdrawStatus; signature: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const busy = step === "request" || step === "sending";

  const submit = async () => {
    setErr(null);
    setStep("request");
    const r = await w.withdraw(amount, () => setStep("sending"));
    if ("error" in r) {
      setErr(r.error);
      setStep("form");
    } else {
      setResult(r);
      setStep("done");
    }
  };

  if (step === "done" && result) {
    const done = result.status === "CONFIRMED";
    return (
      <Shell
        title={done ? "Retrait arrivé" : result.status === "REVIEW" ? "Retrait en vérification" : result.status === "REFUNDED" ? "Retrait annulé" : "Retrait enregistré"}
        onClose={() => w.openModal(null)}
      >
        <div className="pop text-center">
          <Coin tint={done ? GREEN : GOLD} size={64}>
            {done ? <Check size={30} strokeWidth={3} /> : <Info size={28} strokeWidth={2.6} />}
          </Coin>
          <p className="mx-auto mt-4 max-w-xs text-[15px] font-medium leading-relaxed text-ink-2">
            {done
              ? `${usd(amount)} USDC sont dans ton wallet.`
              : result.status === "REVIEW"
                ? "Montant inhabituel : il part après une vérification manuelle, sous 24 h. Il est déjà réservé sur ton compte."
                : result.status === "REFUNDED"
                  ? "Le montant a été recrédité sur ton solde."
                  : result.status === "SENDING"
                    ? "Envoyé sur Solana, la confirmation arrive dans quelques instants."
                    : "Il partira automatiquement dès que possible. Il est déjà réservé sur ton compte."}
          </p>
          {result.signature && (
            <a href={EXPLORER(result.signature)} target="_blank" rel="noreferrer" className="link mt-3 inline-flex items-center gap-1 text-[14px]">
              Voir la transaction <ExternalLink size={13} />
            </a>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Retirer des USDC" onClose={() => !busy && w.openModal(null)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-paper-2 p-3.5">
          <span className="text-[14px] font-bold text-muted">Disponible</span>
          <span className="num font-display text-[22px] font-extrabold">{usd(available, { cents: true })}</span>
        </div>
        {w.excess > 0 && <span className="chip">Dont {usd(w.excess)} au-delà du plafond</span>}
        <div>
          <div className="mb-1.5 text-[14px] font-bold">Montant</div>
          <div className="flex gap-2">
            <input
              type="number"
              min={MIN_WITHDRAWAL}
              max={available}
              value={amount}
              disabled={busy}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="input num"
              aria-label="Montant du retrait"
            />
            <button disabled={busy} onClick={() => setAmount(available)} className="ghost h-[46px] rounded-[14px] px-4">
              Max
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip">Minimum {usd(MIN_WITHDRAWAL)}</span>
            <span className="chip-blue">0 frais</span>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[14px] font-bold">Vers ton wallet</div>
          <div className="num break-all rounded-[14px] border-[1.5px] border-line bg-paper-2 px-3.5 py-2.5 text-[13px] font-semibold text-ink-2">{w.address}</div>
        </div>
        {err && <p className="text-[14px] font-semibold text-down-deep">{err}</p>}
        <button onClick={submit} disabled={busy} className="plaque plaque-ink h-[52px] w-full text-[16px]">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowUpRight size={17} strokeWidth={2.6} />}
          {step === "request" ? "Demande" : step === "sending" ? "Envoi sur Solana (~15 s)" : `Retirer ${usd(amount)}${w.live ? "" : " (démo)"}`}
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
