"use client";

import React from "react";
import GameBoard from "@/components/GameBoard";
import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Wallet, LogOut, ShieldCheck, User, Sparkles, Mail, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const { login, logout, ready, authenticated, user, createWallet } = usePrivy();
  const { wallets } = useWallets();

  // 1. Get embedded wallet from Privy wallets array
  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");

  // 2. Resolve the most reliable address:
  //    a) user?.wallet?.address (Primary Privy wallet)
  //    b) embeddedWallet?.address (From discovery)
  const walletAddress = user?.wallet?.address || embeddedWallet?.address;

  const isEmbeddedWallet = !!embeddedWallet || user?.wallet?.walletClientType === "privy";

  // Get balance using the resolved address
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
  });

  // "isConnected" from Wagmi will sync with Privy eventually, 
  // but "authenticated" is the immediate source of truth for UI
  const isUserLoggedIn = ready && authenticated;

  // Copy address to clipboard
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  React.useEffect(() => {
    setMounted(true);
    // If logged in but no embedded wallet, try to create one or notify
    if (ready && authenticated && !isEmbeddedWallet && !isEmbeddedWalletLoading) {
      console.log("User logged in but no embedded wallet found.");
    }
  }, [ready, authenticated, isEmbeddedWallet]);

  // Track loading state for wallet creation
  const [isCreatingWallet, setIsCreatingWallet] = React.useState(false);
  const isEmbeddedWalletLoading = !ready || (authenticated && wallets.length === 0 && !isEmbeddedWallet);

  const handleCreateWallet = async () => {
    try {
      setIsCreatingWallet(true);
      await createWallet();
      toast.success("Embedded wallet created!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-midnight text-white flex flex-col items-center py-10 px-4">

      {!isUserLoggedIn ? (
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
                <Mail className="w-10 h-10 text-monad-purple" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-tight">Enter the Arena</h3>
                <p className="text-gray-400 text-xs leading-relaxed max-w-[260px]">
                  Sign in with your email. A secure wallet will be created for you automatically.
                </p>
              </div>

              <button
                onClick={login}
                className="pill-button active w-full py-5 text-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Sign in with Email
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center">

          {/* Top Bar Navigation (Matching Visual Reference) */}
          <div className="w-full flex justify-between items-center mb-12 px-2">

            {/* Left: Wallet Info Panel */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >
              {/* Wallet Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-monad-purple/10 border border-green-500/30 rounded-2xl">
                {isEmbeddedWallet ? (
                  <ShieldCheck className="w-4 h-4 text-monad-purple" />
                ) : (
                  <Wallet className="w-4 h-4 text-monad-berry" />
                )}
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] font-black text-white tracking-wide">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "CONNECTING..."}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                    {isEmbeddedWallet ? "Privy Smart Wallet" : "Unlinked Wallet"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {walletAddress && (
                  <button
                    onClick={copyAddress}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}

                {authenticated && !isEmbeddedWallet && (
                  <button
                    onClick={handleCreateWallet}
                    disabled={isCreatingWallet}
                    className="px-3 py-2 bg-monad-purple/20 border border-monad-purple/40 text-monad-purple text-[10px] font-bold uppercase rounded-xl hover:bg-monad-purple hover:text-white transition-all disabled:opacity-50"
                  >
                    {isCreatingWallet ? "Creating..." : "Link Privy Wallet"}
                  </button>
                )}
              </div>

              {/* Balance Display */}
              {walletAddress && (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-monad-purple/10 border border-monad-purple/30 rounded-xl flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-monad-neon">
                      {balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} MON` : "0.0000 MON"}
                    </span>
                    <button
                      onClick={() => {
                        refetchBalance();
                        toast.success("Balance updated");
                      }}
                      className="p-1 hover:bg-white/10 rounded-md transition-all"
                      title="Refresh Balance"
                    >
                      <RefreshCw className="w-3 h-3 text-monad-purple" />
                    </button>
                  </div>

                  {/* Faucet/Funding Link */}
                  <a
                    href={`https://testnet.monadvision.com/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-monad-purple/10 border border-monad-purple/30 rounded-xl hover:bg-monad-purple/20 transition-all flex items-center gap-1"
                    title="View on Explorer"
                  >
                    <ExternalLink className="w-3 h-3 text-monad-purple" />
                  </a>
                </div>
              )}
            </motion.div>

            {/* Right: Points & Exit */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >

              <button
                onClick={logout}
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
            Dev_Build_v1.1.0 // Monad_Mission_X // Pyth_Entropy_Verified // Embedded_Only
          </footer>
        </div>
      )}
    </main>
  );
}
