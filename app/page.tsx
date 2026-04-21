"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   Blockchain & Auth Hooks
───────────────────────────────────────────────────────────────────────────── */
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useBalance } from "wagmi";
import { GiftCard3D } from "@/components/GiftCard3D";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
type CreateStep = "compose" | "signing" | "success";

interface GiftPayload {
  amount: number;
  message: string;
  giftId: string;
  shareUrl: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 250];

const SIGNING_MESSAGES = [
  "Connecting to Arc Network…",
  "Approving USDC transfer…",
  "Securing funds on-chain…",
  "Generating your gift link…",
];

/* ─────────────────────────────────────────────────────────────────────────────
   Utility Functions
───────────────────────────────────────────────────────────────────────────── */
function generateGiftId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment(4)}-${segment(4)}-${segment(4)}`;
}

function hapticFeedback(style: "light" | "medium" | "heavy" = "medium") {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch (e) {
    console.log("Haptic not supported outside Telegram");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Components (StepDots, AmountInput, MessageInput, SigningScreen, SuccessScreen)
───────────────────────────────────────────────────────────────────────────── */

function StepDots({ current }: { current: number }) {
  const labels = ["Compose", "Sign", "Share"];
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {labels.map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: i < current ? "#FFD700" : i === current ? "#FFD700" : "#1E293B",
              scale: i === current ? 1.5 : 1,
              boxShadow: i === current ? "0 0 8px rgba(255,215,0,0.6)" : "none",
            }}
            transition={{ duration: 0.3 }}
          />
          {i < labels.length - 1 && (
            <motion.div
              className="w-8 h-px"
              animate={{ backgroundColor: i < current ? "#FFD700" : "#1E293B" }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AmountInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const numericValue = parseFloat(value) || 0;
  return (
    <div className="space-y-3">
      <div
        className="relative flex items-center rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          background: "#0A1628",
          border: "1px solid rgba(255,215,0,0.15)",
          boxShadow: numericValue > 0 ? "0 0 0 1px rgba(255,215,0,0.12), 0 0 24px rgba(255,215,0,0.05)" : "none",
        }}
      >
        <div className="pl-5 pr-1 flex items-center self-stretch" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="font-mono font-semibold select-none transition-colors duration-200" style={{ fontSize: "1.5rem", color: numericValue > 0 ? "#FFD700" : "#334155" }}>$</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^\d.]/g, "");
            const parts = cleaned.split(".");
            if (parts.length <= 2 && (!parts[1] || parts[1].length <= 2)) onChange(cleaned);
          }}
          className="flex-1 bg-transparent outline-none px-4 py-5 text-white placeholder-slate-700 font-mono font-bold text-[2rem]"
        />
        <div className="pr-5">
          <span className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold" style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.18)", color: "#22D3EE" }}>USDC</span>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {PRESET_AMOUNTS.map((preset) => {
          const isActive = numericValue === preset;
          return (
            <motion.button
              key={preset}
              onClick={() => { hapticFeedback("light"); onChange(String(preset)); }}
              className="py-2 rounded-xl text-xs font-mono font-semibold"
              style={{ background: isActive ? "linear-gradient(135deg, #FFD700, #FFA500)" : "#0A1628", color: isActive ? "#000" : "#475569", border: isActive ? "none" : "1px solid #1E293B" }}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            >
              ${preset}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function MessageInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const remaining = 120 - value.length;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Personal Message (optional)</label>
      <div className="relative rounded-2xl overflow-hidden bg-[#0A1628] border border-[#1E293B]">
        <textarea
          rows={3}
          maxLength={120}
          placeholder="Write something kind…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none resize-none px-5 py-4 text-sm text-white placeholder-slate-700"
        />
        <div className="absolute bottom-3 right-4 font-mono text-xs" style={{ color: remaining < 20 ? "#F87171" : "#334155" }}>{remaining}</div>
      </div>
    </div>
  );
}

function SigningScreen({ amount }: { amount: number }) {
  const [signingStep, setSigningStep] = useState(0);
  useEffect(() => {
    const timers = [0, 800, 1600, 2400].map((delay, i) => setTimeout(() => setSigningStep(i), delay));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <motion.div className="flex flex-col items-center gap-8 py-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div className="absolute inset-0 rounded-full border border-yellow-500/20" animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-yellow-500/10 border border-yellow-500/20">🔐</div>
      </div>
      <div className="text-center">
        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Locking</p>
        <p className="font-bold text-white text-[2.5rem]">${amount} <span className="text-yellow-400 font-mono text-xl">USDC</span></p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {SIGNING_MESSAGES.map((msg, i) => (
          <div key={i} className="flex items-center gap-3" style={{ opacity: i <= signingStep ? 1 : 0.25 }}>
             <div className="w-6 h-6 rounded-full border border-yellow-500/40 flex items-center justify-center">
               {i < signingStep ? "✓" : i === signingStep ? "●" : ""}
             </div>
             <span className="text-sm font-mono text-white">{msg}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SuccessScreen({ gift, onCreateAnother }: { gift: GiftPayload; onCreateAnother: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    hapticFeedback("light");
    navigator.clipboard.writeText(gift.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div className="flex flex-col items-center gap-6 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-7xl">🎊</div>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">$<span className="text-yellow-400">{gift.amount}</span> USDC</h2>
        <p className="text-slate-500 text-sm">Your gift is live on Arc Network</p>
      </div>
      <div className="w-full bg-[#0A1628] border border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between">
        <p className="text-cyan-400 font-mono text-xs truncate mr-4">{gift.shareUrl}</p>
        <button onClick={handleCopy} className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-bold">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={() => { hapticFeedback("heavy"); }} className="w-full py-4 rounded-2xl font-bold bg-yellow-500 text-black">📤 Share Gift</button>
      <button onClick={onCreateAnother} className="w-full py-4 rounded-2xl text-slate-400 border border-slate-800">+ New Gift</button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Export
───────────────────────────────────────────────────────────────────────────── */
export default function CreateGiftPage() {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  
  const [step, setStep] = useState<CreateStep>("compose");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [createdGift, setCreatedGift] = useState<GiftPayload | null>(null);
  const [validationError, setValidationError] = useState("");

  const numericAmount = parseFloat(amount) || 0;
  const isAmountValid = numericAmount >= 1 && numericAmount <= 10000;

  const handleAction = async () => {
    hapticFeedback("medium");
    
    // Step 1: Ensure wallet is connected
    if (!authenticated) {
      login();
      return;
    }

    // Step 2: Validate Amount
    if (!isAmountValid) {
      setValidationError(numericAmount < 1 ? "Minimum $1 USDC" : "Maximum $10,000 USDC");
      return;
    }

    // Step 3: Trigger On-Chain Flow
    setStep("signing");
    try {
      // Logic for real contract call goes here later
      await new Promise(r => setTimeout(r, 3200)); 
      
      const giftId = generateGiftId();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCreatedGift({
        amount: numericAmount,
        message,
        giftId,
        shareUrl: `${origin}/?amount=${numericAmount}&id=${giftId}&sender=${address?.slice(0,6) || "User"}`
      });
      setStep("success");
    } catch (err) {
      setStep("compose");
      setValidationError("Transaction failed. Try again.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-hidden bg-[#020617]">
      {/* Visual Overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,229,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.04)_1px,transparent_1px)] bg-[length:48px_48px]" />
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-yellow-500/10 blur-[80px]" />

      <header className="mb-10 text-center z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-yellow-500 shadow-[0_0_12px_rgba(255,215,0,0.5)]" />
          <span className="text-white font-bold tracking-widest text-sm font-mono uppercase">ArcGift</span>
        </div>
        <p className="text-xs text-slate-600 font-mono">ON-CHAIN GIFTING · ARC NETWORK</p>
      </header>

      <StepDots current={step === "compose" ? 0 : step === "signing" ? 1 : 2} />

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "compose" && (
            <motion.div key="compose" className="flex flex-col gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Send a <span className="text-yellow-400">Gift</span></h1>
                <p className="text-slate-500 text-sm">Gas-free. Instant. Secured by Arc.</p>
              </div>

              <GiftCard3D amount={numericAmount} sender="You" sealed={true} />

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-500">Gift Amount</label>
                <AmountInput value={amount} onChange={setAmount} />
                {validationError && <p className="text-red-400 text-xs font-mono mt-1">⚠ {validationError}</p>}
              </div>

              <MessageInput value={message} onChange={setMessage} />

              <motion.button
                onClick={handleAction}
                className="w-full py-5 rounded-2xl font-bold text-black bg-yellow-500 shadow-xl"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {!authenticated ? "🔗 Connect Wallet" : numericAmount > 0 ? `🎁 Create $${numericAmount} Gift` : "🎁 Create Gift"}
              </motion.button>
            </motion.div>
          )}

          {step === "signing" && <SigningScreen amount={numericAmount} />}
          {step === "success" && createdGift && <SuccessScreen gift={createdGift} onCreateAnother={() => setStep("compose")} />}
        </AnimatePresence>
      </div>
    </main>
  );
}
