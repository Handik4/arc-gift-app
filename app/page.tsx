"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GiftCard3D } from "@/components/GiftCard3D";
import { NetworkSelectorModal } from "@/components/NetworkSelectorModal";
import { initiateCircleTransfer, type TransferParams } from "@/lib/circleTransfer";
import type { SupportedChain } from "@/components/NetworkSelectorModal";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type ClaimState = "idle" | "unboxing" | "network" | "claiming" | "success" | "error";

interface GiftData {
  id: string;
  amount: number;
  sender: string;
  message?: string;
  token: string;
}

/* ─────────────────────────────────────────────
   Particle burst component
───────────────────────────────────────────── */
function ParticleBurst({ active }: { active: boolean }) {
  const particles = Array.from({ length: 24 });
  return (
    <AnimatePresence>
      {active &&
        particles.map((_, i) => {
          const angle = (i / particles.length) * 360;
          const radius = 120 + Math.random() * 80;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          const colors = ["#FFD700", "#00E5FF", "#FF6B9D", "#A8FF78", "#FFD700"];
          const color = colors[i % colors.length];
          return (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full pointer-events-none z-50"
              style={{ backgroundColor: color, marginLeft: -4, marginTop: -4 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x, y, opacity: 0, scale: 0 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.015 }}
            />
          );
        })}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   Step indicator
───────────────────────────────────────────── */
function StepDots({ current }: { current: number }) {
  const steps = ["Open", "Choose Chain", "Claim"];
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: i <= current ? "#FFD700" : "#334155",
              scale: i === current ? 1.4 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
          {i < steps.length - 1 && (
            <motion.div
              className="w-8 h-px"
              animate={{ backgroundColor: i < current ? "#FFD700" : "#334155" }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Success screen
───────────────────────────────────────────── */
function SuccessScreen({ amount, chain }: { amount: number; chain: string }) {
  return (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 16 }}
    >
      <motion.div
        className="text-8xl"
        animate={{ rotate: [0, -10, 10, -5, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        🎊
      </motion.div>
      <div>
        <p className="text-slate-400 text-sm uppercase tracking-widest font-mono mb-1">Claimed Successfully</p>
        <h2 className="text-5xl font-bold text-white">
          ${amount}{" "}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #FFD700, #FFA500)" }}>
            USDC
          </span>
        </h2>
        <p className="text-slate-400 mt-2 text-sm">
          Sent to your wallet on <span className="text-cyan-400 font-semibold">{chain}</span>
        </p>
      </div>
      <motion.div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono text-slate-400"
        style={{ backgroundColor: "#0F172A", border: "1px solid #1E293B" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Transaction confirmed on-chain
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Content Wrapper (Logic)
───────────────────────────────────────────── */
function ClaimContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ClaimState>("idle");
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [showParticles, setShowParticles] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Gift Data from URL with Fallbacks
  const amount = Number(searchParams.get("amount")) || 42;
  const sender = searchParams.get("sender") || "alex.eth";
  const giftId = searchParams.get("id") || "gift_01jxk8mn2";
  const token = "USDC";

  useEffect(() => {
    if (state === "idle" || state === "unboxing") setStepIndex(0);
    else if (state === "network") setStepIndex(1);
    else setStepIndex(2);
  }, [state]);

  const handleUnbox = () => {
    setState("unboxing");
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1200);
    setTimeout(() => setState("network"), 1600);
  };

  const handleNetworkSelect = (chain: SupportedChain) => {
    setSelectedChain(chain);
    setRecipientAddress("");
    setAddressError("");
    setState("claiming");
  };

  const validateAddress = (addr: string, chain: SupportedChain): boolean => {
    if (!addr.trim()) return false;
    if (chain.id === "solana") return addr.length >= 32 && addr.length <= 44;
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleClaim = async () => {
    if (!selectedChain) return;
    if (!validateAddress(recipientAddress, selectedChain)) {
      setAddressError(`Enter a valid ${selectedChain.name} address`);
      return;
    }
    
    setAddressError("");
    setIsLoading(true);

    try {
      await initiateCircleTransfer({
        giftId: giftId,
        amountUsdc: amount,
        destinationChain: selectedChain.id,
        recipientAddress,
        enableForwarder: true,
      });
      setState("success");
    } catch (error) {
      console.error(error);
      setState("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0c1629 0%, #020617 60%)" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* Header */}
      <motion.div className="mb-10 text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full" style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }} />
          <span className="text-white font-semibold tracking-widest text-sm uppercase font-mono">ArcGift</span>
        </div>
        <p className="text-slate-500 text-xs tracking-widest uppercase font-mono">Powered by Arc Network · Circle USDC</p>
      </motion.div>

      <AnimatePresence>
        {state !== "idle" && state !== "success" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StepDots current={stepIndex} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center w-full max-w-md">
        <ParticleBurst active={showParticles} />

        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div key="idle" className="flex flex-col items-center gap-8" exit={{ opacity: 0, scale: 0.9 }}>
              <GiftCard3D amount={amount} sender={sender} token={token} sealed={true} />
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">You received a gift from</p>
                <p className="text-white font-bold text-lg">{sender}</p>
              </div>
              <motion.button 
                onClick={handleUnbox} 
                className="px-10 py-4 rounded-2xl font-bold text-black bg-gradient-to-r from-yellow-400 to-orange-500"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🎁 Open Gift
              </motion.button>
            </motion.div>
          )}

          {state === "unboxing" && (
            <motion.div key="unboxing" className="flex flex-col items-center" exit={{ opacity: 0 }}>
              <GiftCard3D amount={amount} sender={sender} token={token} sealed={false} animating={true} />
            </motion.div>
          )}

          {state === "network" && (
            <motion.div key="network" className="w-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
               <div className="text-center mb-6">
                <GiftCard3D amount={amount} sender={sender} token={token} sealed={false} compact={true} />
                <h2 className="text-2xl font-bold text-white mt-6">Where to send your <span className="text-yellow-400">${amount} USDC</span>?</h2>
              </div>
              <NetworkSelectorModal onSelect={handleNetworkSelect} onBack={() => setState("idle")} />
            </motion.div>
          )}

          {state === "claiming" && selectedChain && (
            <motion.div key="claiming" className="w-full space-y-6" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Wallet Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => { setRecipientAddress(e.target.value); setAddressError(""); }}
                  className="w-full px-4 py-4 rounded-xl text-sm font-mono text-white bg-slate-900 border border-slate-800 outline-none focus:border-yellow-500"
                  placeholder={selectedChain.id === "solana" ? "Solana address" : "0x..."}
                />
                {addressError && <p className="text-red-400 text-xs font-mono">{addressError}</p>}
              </div>

              {/* Fee breakdown maintained from original design */}
              <div className="rounded-xl p-4 space-y-2 bg-slate-900 border border-slate-800">
                <div className="flex justify-between text-xs font-mono text-slate-500 italic">
                   <span>Gas Fee (covered)</span>
                   <span>~$0.001</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Forwarding Fee</span>
                  <span>$0.20</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-yellow-400 font-bold">
                  <span>Net Amount</span>
                  <span>${(amount - 0.20).toFixed(2)} USDC</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setState("network")} className="flex-1 py-3.5 rounded-xl text-sm text-slate-400 border border-slate-800">Back</button>
                <button 
                  onClick={handleClaim} 
                  disabled={isLoading}
                  className="flex-[2] py-3.5 rounded-xl font-bold text-black bg-gradient-to-r from-yellow-400 to-orange-500 disabled:opacity-50"
                >
                  {isLoading ? "Processing..." : `Claim Now →`}
                </button>
              </div>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SuccessScreen amount={amount} chain={selectedChain?.name ?? ""} />
            </motion.div>
          )}

          {state === "error" && (
            <motion.div key="error" className="text-center space-y-4">
              <h2 className="text-white text-xl font-bold">Transfer Failed</h2>
              <button onClick={() => setState("claiming")} className="px-8 py-3 rounded-xl font-bold text-black bg-yellow-400">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────
   Main Export with Suspense
───────────────────────────────────────────── */
export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Loading...</div>}>
      <ClaimContent />
    </Suspense>
  );
}