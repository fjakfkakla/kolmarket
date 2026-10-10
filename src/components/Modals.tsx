"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check, Mail, X } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { usd } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const DEPOSIT_ADDRESS = "MCdep1ZxQp9vR4tLd8sH3rWcA1eB6yU5oP0jK2nM9xVq";

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

const PROVIDERS = [
  { id: "Phantom", color: "#ab9ff2", letter: "P" },
  { id: "Solflare", color: "#fc7227", letter: "S" },
  { id: "Backpack", color: "#e33e3f", letter: "B" },
];

function ConnectModal() {
  const w = useWallet();
  const { t } = useI18n();
  const tm = t.modals;
  const [accepted, setAccepted] = useState(false);
  return (
    <Shell title={tm.connectTitle} onClose={() => w.openModal(null)}>
      <p className="mb-4 text-sm text-muted">{tm.connectText}</p>
      <div className="space-y-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            disabled={!accepted}
            onClick={() => w.connect(p.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-gold hover:bg-gold-soft/40 disabled:opacity-40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg font-bold text-white" style={{ background: p.color }}>
              {p.letter}
            </span>
            <span className="flex-1 font-semibold">{p.id}</span>
            <span className="text-xs text-muted">Solana</span>
          </button>
        ))}
        <button
          disabled={!accepted}
          onClick={() => w.connect("Email")}
          className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-gold hover:bg-gold-soft/40 disabled:opacity-40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white"><Mail size={16} /></span>
          <span className="flex-1 font-semibold">{tm.email}</span>
          <span className="text-xs text-muted">{tm.embedded}</span>
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-gold" />
        <span>
          {tm.ageA}<a href="/conditions" className="font-semibold text-ink underline">{t.common.terms}</a>{tm.ageB}
        </span>
      </label>
    </Shell>
  );
}

function DepositModal() {
  const w = useWallet();
  const { t } = useI18n();
  const tm = t.modals;
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
    <Shell title={tm.depositTitle} onClose={() => w.openModal(null)}>
      {step === "done" ? (
        <div className="py-6 text-center pop">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-up-soft text-up"><Check size={28} /></div>
          <div className="text-lg font-bold">{tm.depositReceived}</div>
          <div className="mono mt-1 text-muted">{fmt(tm.credited, { amount: usd(amount) })}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-cream-2 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2775ca] font-bold text-white">$</span>
            <div className="flex-1">
              <div className="font-semibold">{tm.network}</div>
              <div className="text-xs text-muted">{tm.networkHint}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{tm.depositAddress}</div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-ink">
                <svg viewBox="0 0 21 21" className="h-14 w-14" fill="#fff">
                  {Array.from({ length: 441 }, (_, i) => {
                    const x = i % 21, y = Math.floor(i / 21);
                    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
                    const h = ((x * 73856093) ^ (y * 19349663) ^ 0x9e3779b9) >>> 0;
                    const on = finder ? ((x % 7 === 0 || x % 7 === 6 || y % 7 === 0 || y % 7 === 6 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5)) && x % 7 !== 7) : h % 5 < 2;
                    return on ? <rect key={i} x={x} y={y} width="1" height="1" /> : null;
                  })}
                </svg>
              </div>
              <code className="mono flex-1 break-all text-xs">{DEPOSIT_ADDRESS}</code>
              <CopyButton value={DEPOSIT_ADDRESS} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{tm.demoAmount}</div>
            <div className="flex gap-2">
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))} className="input mono" />
              {[50, 100, 500].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className="btn-ghost px-3">{v}</button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-down-soft p-3 text-xs text-down">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {tm.warning}
          </div>
          <button onClick={confirm} disabled={step === "pending"} className="btn-gold w-full py-3">
            <ArrowDownToLine size={16} /> {step === "pending" ? tm.confirming : fmt(tm.simulate, { amount: usd(amount) })}
          </button>
        </div>
      )}
    </Shell>
  );
}

function WithdrawModal() {
  const w = useWallet();
  const { t } = useI18n();
  const tm = t.modals;
  const [amount, setAmount] = useState(Math.min(50, Math.floor(w.balance)));
  const [err, setErr] = useState<string | null>(null);
  return (
    <Shell title={tm.withdrawTitle} onClose={() => w.openModal(null)}>
      <div className="space-y-4">
        <div className="rounded-xl bg-cream-2 p-3 text-sm">
          {tm.available} <span className="mono font-bold">{usd(w.balance)}</span>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{tm.amount}</div>
          <div className="flex gap-2">
            <input type="number" min={1} max={w.balance} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="input mono" />
            <button onClick={() => setAmount(w.balance)} className="btn-ghost px-3">{t.common.max}</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{tm.to}</div>
          <div className="input mono text-muted">{w.address}</div>
        </div>
        {err && <p className="text-sm text-down">{err}</p>}
        <button
          onClick={() => {
            if (amount <= 0) return setErr(tm.invalid);
            if (!w.withdraw(amount)) setErr(tm.insufficient);
          }}
          className="btn-dark w-full py-3"
        >
          <ArrowUpFromLine size={16} /> {fmt(tm.withdrawBtn, { amount: usd(amount) })}
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
