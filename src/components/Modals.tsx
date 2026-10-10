"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, Mail, X } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { usd } from "@/lib/format";
import { Coin } from "./Coin";
import { CopyButton } from "./CopyButton";
import { LogoMark } from "./Logo";

const DEPOSIT_ADDRESS = "MCdep1ZxQp9vR4tLd8sH3rWcA1eB6yU5oP0jK2nM9xVq";

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,12,24,.62)] p-4 backdrop-blur-[6px]" onClick={onClose}>
      <div
        className="pop w-full max-w-[440px] rounded-[26px] bg-white p-6 shadow-[0_44px_90px_-42px_rgba(8,18,54,.62)]"
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

const PROVIDERS: { id: string; tint: [string, string, string]; letter: string }[] = [
  { id: "Phantom", tint: ["#c4b8ff", "#ab9ff2", "#8a7be0"], letter: "P" },
  { id: "Solflare", tint: ["#ffa25c", "#fc7227", "#e0560b"], letter: "S" },
  { id: "Backpack", tint: ["#ff7476", "#e33e3f", "#c22526"], letter: "B" },
];

function ConnectModal() {
  const w = useWallet();
  const [accepted, setAccepted] = useState(false);
  return (
    <Shell title="Se connecter" onClose={() => w.openModal(null)}>
      <div className="space-y-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            disabled={!accepted}
            onClick={() => w.connect(p.id)}
            className="group flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line bg-white p-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-blue disabled:opacity-45"
          >
            <Coin tint={p.tint} size={40}>
              <span>{p.letter}</span>
            </Coin>
            <span className="flex-1 text-[16px] font-bold">{p.id}</span>
            <span className="chip">Solana</span>
            <ArrowRight size={16} className="text-faint transition group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-blue" />
          </button>
        ))}
        <button
          disabled={!accepted}
          onClick={() => w.connect("Email")}
          className="group flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line bg-white p-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-blue disabled:opacity-45"
        >
          <Coin tint={["#5b80ff", "#2e5cff", "#1f45e0"]} size={40}>
            <Mail size={18} />
          </Coin>
          <span className="flex-1 text-[16px] font-bold">Continuer avec un email</span>
          <ArrowRight size={16} className="text-faint" />
        </button>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-paper-2 p-3 text-[14px] font-medium text-ink-2">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#2e5cff]" />
        <span>
          J&apos;ai plus de 18 ans et j&apos;accepte les{" "}
          <a href="/conditions" className="link">conditions d&apos;utilisation</a>.
        </span>
      </label>
    </Shell>
  );
}

function FakeQr() {
  return (
    <svg viewBox="0 0 21 21" className="h-[76px] w-[76px] shrink-0 rounded-xl bg-white p-1 shadow-[inset_0_0_0_1px_#e6e9f2]" fill="#0a0f1e" aria-hidden>
      {Array.from({ length: 441 }, (_, i) => {
        const x = i % 21, y = Math.floor(i / 21);
        const fx = x % 7, fy = y % 7;
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        const h = ((x * 73856093) ^ (y * 19349663) ^ 0x9e3779b9) >>> 0;
        const on = finder ? fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5) : h % 5 < 2;
        return on ? <rect key={i} x={x} y={y} width="1" height="1" /> : null;
      })}
    </svg>
  );
}

function DepositModal() {
  const w = useWallet();
  const [amount, setAmount] = useState(100);
  const [step, setStep] = useState<"form" | "pending" | "done">("form");
  const confirm = () => {
    setStep("pending");
    setTimeout(() => {
      w.deposit(amount);
      setStep("done");
    }, 1400);
  };
  return (
    <Shell title={step === "done" ? "Dépôt reçu" : "Déposer des USDC"} onClose={() => w.openModal(null)}>
      {step === "done" ? (
        <div className="pop text-center">
          <Coin tint={["#2fd36d", "#00a03c", "#007e26"]} size={64}>
            <Check size={30} strokeWidth={3} />
          </Coin>
          <div className="num mt-3 font-display text-[34px] font-extrabold tracking-[-0.03em] text-up">+{usd(amount)}</div>
          <button onClick={() => w.openModal(null)} className="plaque mt-5 h-[52px] w-full text-[16px]">
            Trader maintenant <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-3 shadow-[inset_0_0_0_1px_rgba(46,92,255,.22)]">
            <Coin tint={["#4b93e6", "#2775ca", "#1a5aa3"]} size={40}>
              <span>$</span>
            </Coin>
            <div className="flex-1">
              <div className="font-bold">USDC sur Solana</div>
              <div className="text-[13px] font-semibold text-muted">Crédité en 2 secondes</div>
            </div>
            <span className="chip-blue">0 % de frais</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-line p-2.5">
            <FakeQr />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-faint">Adresse de dépôt</div>
              <code className="num block break-all text-[13px] font-semibold text-ink-2">{DEPOSIT_ADDRESS}</code>
              <CopyButton value={DEPOSIT_ADDRESS} label="Copier" className="mt-1.5" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[14px] font-bold">Montant</div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                className="input num"
                aria-label="Montant du dépôt"
              />
              {[50, 100, 500].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className={`h-[46px] rounded-[14px] px-3.5 text-[14px] ${amount === v ? "plaque" : "ghost"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-2xl bg-down-soft px-3 py-2.5 text-[14px] font-semibold text-down-deep">
            Seulement des USDC, seulement sur Solana : un autre token est perdu.
          </p>
          <button onClick={confirm} disabled={step === "pending"} className="plaque h-[52px] w-full text-[16px]">
            <ArrowDownLeft size={17} strokeWidth={2.6} /> {step === "pending" ? "Confirmation on-chain" : `Simuler le dépôt de ${usd(amount)}`}
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
        <div className="flex items-center justify-between rounded-2xl bg-paper-2 p-3.5">
          <span className="text-[14px] font-bold text-muted">Cash disponible</span>
          <span className="num font-display text-[22px] font-extrabold">{usd(w.balance, { cents: true })}</span>
        </div>
        <div>
          <div className="mb-1.5 text-[14px] font-bold">Montant</div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={w.balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="input num"
              aria-label="Montant du retrait"
            />
            <button onClick={() => setAmount(w.balance)} className="ghost h-[46px] rounded-[14px] px-4">Max</button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[14px] font-bold">Vers ton wallet</div>
          <div className="num break-all rounded-[14px] border-[1.5px] border-line bg-paper-2 px-3.5 py-2.5 text-[13px] font-semibold text-ink-2">{w.address}</div>
        </div>
        {err && <p className="text-[14px] font-semibold text-down-deep">{err}</p>}
        <button
          onClick={() => {
            if (amount <= 0) return setErr("Montant invalide.");
            if (!w.withdraw(amount)) setErr("Solde insuffisant.");
          }}
          className="plaque plaque-ink h-[52px] w-full text-[16px]"
        >
          <ArrowUpRight size={17} strokeWidth={2.6} /> Retirer {usd(amount)}
        </button>
      </div>
    </Shell>
  );
}

export function Modals() {
  const w = useWallet();
  if (w.modal === "connect") return <ConnectModal />;
  if (w.modal === "deposit") return <DepositModal />;
  if (w.modal === "withdraw") return <WithdrawModal />;
  return null;
}
