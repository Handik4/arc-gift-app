"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface SupportedChain {
  id: string;
  name: string;
  icon: string;
  color: string;
  accentColor: string;
  avgTime: string;
  fee: string;
  badge?: string;
  description: string;
}

/* ─────────────────────────────────────────────
   Chain definitions
───────────────────────────────────────────── */
export const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    id: "base",
    name: "Base",
    icon: "🔵",
    color: "#0052FF",
    accentColor: "rgba(0,82,255,0.15)",
    avgTime: "~2 sec",
    fee: "$0.001",
    badge: "Fastest",
    description: "Coinbase L2 · Near-instant finality",
  },
  {
    id: "solana",
    name: "Solana",
    icon: "◎",
    color: "#9945FF",
    accentColor: "rgba(153,69,255,0.15)",
    avgTime: "~1 sec",
    fee: "$0.0001",
    badge: "Lowest Fee",
    description: "High-throughput · Auto ATA creation",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "Ξ",
    color: "#627EEA",
    accentColor: "rgba(98,126,234,0.15)",
    avgTime: "~15 sec",
    fee: "$1–5",
    description: "Most secure · Widest support",
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: "⬡",
    color: "#8247E5",
    accentColor: "rgba(130,71,229,0.15)",
    avgTime: "~3 sec",
    fee: "$0.01",
    description: "EVM-compatible · Low cost",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    icon: "▲",
    color: "#E84142",
    accentColor: "rgba(232,65,66,0.15)",
    avgTime: "~2 sec",
    fee: "$0.05",
    description: "C-Chain · Fast finality",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    icon: "🔷",
    color: "#28A0F0",
    accentColor: "rgba(40,160,240,0.15)",
    avgTime: "~1 sec",
    fee: "$0.10",
    description: "Optimistic rollup · Ethereum-secured",
  },
];

/* ─────────────────────────────────────────────
   Chain card
───────────────────────────────────────────── */
function ChainCard({
  chain,
  selected,
  onClick,
  index,
}: {
  chain: SupportedChain;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative w-full text-left rounded-xl p-4 transition-all overflow-hidden"
      style={{
        backgroundColor: selected ? chain.accentColor : hovered ? "rgba(255,255,255,0.03)" : "transparent",
        border: `1px solid ${selected ? chain.color + "60" : "rgba(255,255,255,0.06)"}`,
        boxShadow: selected ? `0 0 20px ${chain.color}20` : "none",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selected indicator glow */}
      {selected && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${chain.color}18 0%, transparent 60%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      <div className="flex items-center gap-3 relative z-10">
        {/* Chain icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 font-bold"
          style={{
            backgroundColor: chain.accentColor,
            border: `1px solid ${chain.color}40`,
            color: chain.color,
            fontFamily: "monospace",
          }}
        >
          {chain.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{chain.name}</span>
            {chain.badge && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                style={{
                  backgroundColor: chain.color + "20",
                  color: chain.color,
                  border: `1px solid ${chain.color}30`,
                }}
              >
                {chain.badge}
              </span>
            )}
          </div>
          <p className="text-slate-600 text-xs mt-0.5 truncate">{chain.description}</p>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-mono text-slate-400">{chain.avgTime}</p>
          <p className="text-xs font-mono text-slate-600 mt-0.5">fee {chain.fee}</p>
        </div>

        {/* Checkmark */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: chain.color }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────
   Network Selector Modal
───────────────────────────────────────────── */
interface NetworkSelectorModalProps {
  onSelect: (chain: SupportedChain) => void;
  onBack?: () => void;
}

export function NetworkSelectorModal({ onSelect, onBack }: NetworkSelectorModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = SUPPORTED_CHAINS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === selected);
    if (chain) onSelect(chain);
  };

  return (
    <motion.div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#0A1628",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Modal header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mb-4">
          {onBack && (
            <motion.button
              onClick={onBack}
              className="text-slate-500 text-sm hover:text-white transition-colors"
              whileHover={{ x: -2 }}
            >
              ← Back
            </motion.button>
          )}
          <h3 className="text-white font-semibold text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Select Network
          </h3>
          <div className="w-10" />
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search networks..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
            style={{ backgroundColor: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>
      </div>

      {/* Chain list */}
      <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence>
          {filtered.map((chain, i) => (
            <ChainCard
              key={chain.id}
              chain={chain}
              selected={selected === chain.id}
              onClick={() => setSelected(selected === chain.id ? null : chain.id)}
              index={i}
            />
          ))}
          {filtered.length === 0 && (
            <motion.p
              key="empty"
              className="text-center text-slate-600 text-sm py-6 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No networks found
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <div className="px-5 pb-2">
        <p className="text-xs text-center font-mono text-slate-700">
          Arc Network enables gas-free claiming on all chains
        </p>
      </div>

      {/* CTA */}
      <div className="p-4 pt-2">
        <motion.button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all"
          style={{
            background: selected
              ? "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
              : "#1E293B",
            color: selected ? "#000" : "#475569",
            cursor: selected ? "pointer" : "not-allowed",
          }}
          animate={{ scale: selected ? 1 : 0.98, opacity: selected ? 1 : 0.6 }}
          whileHover={selected ? { scale: 1.02, filter: "brightness(1.05)" } : {}}
          whileTap={selected ? { scale: 0.98 } : {}}
          transition={{ duration: 0.2 }}
        >
          {selected
            ? `Continue with ${SUPPORTED_CHAINS.find((c) => c.id === selected)?.name} →`
            : "Select a Network"}
        </motion.button>
      </div>
    </motion.div>
  );
}
