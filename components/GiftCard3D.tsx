"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface GiftCard3DProps {
  amount: number;
  sender: string;
  sealed?: boolean;
  onOpen?: () => void;
}

export function GiftCard3D({ amount, sender, sealed = true, onOpen }: GiftCard3DProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    const rotateY = (x - centerX) / 10;
    const rotateX = (centerY - y) / 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const formattedAmount = new Intl.NumberFormat('en-US').format(amount);

  return (
    <div
      className="w-full flex justify-center items-center py-6"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1500px" }}
    >
      <motion.div
        className="relative w-[350px] h-[210px] rounded-[24px] overflow-hidden shadow-2xl cursor-pointer"
        animate={{ rotateX: rotate.x, rotateY: rotate.y }}
        transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.5 }}
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(10,16,29,0.6) 100%)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,215,0,0.2)",
          transformStyle: "preserve-3d",
        }}
        onClick={() => sealed && onOpen?.()}
      >
        {/* Glow & Shine */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,215,0,0.15),transparent_70%)] pointer-events-none" />

        <div className="absolute inset-0 p-6 flex flex-col justify-between" style={{ transform: "translateZ(40px)" }}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-black text-sm shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                A
              </div>
              <span className="text-white font-mono text-[10px] tracking-widest uppercase opacity-80">Arc Network</span>
            </div>
            <div className="px-2 py-1 rounded-md border border-yellow-500/20 bg-yellow-500/5 text-[9px] text-yellow-500 font-mono tracking-tighter">
              PREMIUM GIFT
            </div>
          </div>

          {/* Chip & Icon */}
          <div className="flex justify-between items-center">
            <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-600/40 to-yellow-800/40 border border-yellow-500/20 relative overflow-hidden">
               <div className="absolute inset-0 opacity-20 grid grid-cols-3 gap-px bg-yellow-200" />
            </div>
            {sealed && <div className="text-2xl filter drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">🎁</div>}
          </div>

          {/* Bottom Info */}
          <div className="flex flex-col">
            <h3 className="text-white text-3xl font-bold tracking-tight">
              ${formattedAmount} <span className="text-yellow-500 text-lg">USDC</span>
            </h3>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Auth: {sender.slice(0, 10)}...
            </p>
          </div>
        </div>

        {/* Decorative corner text */}
        <div className="absolute bottom-2 right-4 opacity-20 font-mono text-[7px] text-white tracking-[0.3em] uppercase">
          ArcGift Protocol v1
        </div>
      </motion.div>
    </div>
  );
}