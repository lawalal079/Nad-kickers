"use client";

import React from "react";
import GameBoard from "@/components/GameBoard";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut, ShieldCheck, User, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  React.useEffect(() => {
    setMounted(true);
    toast("Gmonad!", {
      description: "Welcome to NAD-KICKERS",
      duration: 3000,
    });
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-midnight text-white flex flex-col items-center py-10 px-4">

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          {/* Landing Page UI */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-12"
          >
            <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(192,38,211,0.4)]">
              NAD-<span className="text-monad-purple">KICKERS</span>
            </h1>
            <p className="text-gray-500 font-mono text-[10px] tracking-[0.4em] mt-4 uppercase">Verifiably Fair • Monad Mission X</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="cyber-frame w-full max-w-md"
          >
            <div className="relative z-10 p-12 flex flex-col items-center gap-8">
              <div className="w-20 h-20 bg-monad-purple/10 rounded-3xl flex items-center justify-center border border-monad-purple/20">
                <Wallet className="w-10 h-10 text-monad-purple" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-tight">Access Game</h3>
                <p className="text-gray-400 text-xs leading-relaxed max-w-[240px]">
                  Connect your Monad wallet to start the high-stakes penalty shootout.
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    // Prefer the first available connector (MetaMask Target or Generic)
                    const connector = connectors[0];
                    connect({ connector });
                  } catch (err) {
                    console.error("Connection failed:", err);
                  }
                }}
                className="pill-button active w-full py-5 text-sm"
              >
                Connect Wallet
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center">

          {/* Top Bar Navigation (Matching Visual Reference) */}
          <div className="w-full flex justify-between items-center mb-12 px-2">

            {/* Left: User Pill */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/40 rounded-full"
            >
              <User className="w-3 h-3 text-green-500" />
              <span className="font-mono text-[10px] font-black text-green-500 uppercase tracking-widest">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </motion.div>

            {/* Right: Points & Exit */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >

              <button
                onClick={() => disconnect()}
                className="px-4 py-1.5 bg-monad-berry/10 border border-monad-berry/40 text-monad-berry text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-monad-berry hover:text-white transition-all"
              >
                Exit
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full flex justify-center"
          >
            <GameBoard />
          </motion.div>

          <footer className="mt-16 opacity-20 text-[8px] font-mono tracking-[0.5em] uppercase text-center w-full">
            Dev_Build_v1.0.9 // Monad_Mission_X // Pyth_Entropy_Verified
          </footer>
        </div>
      )}
    </main>
  );
}
