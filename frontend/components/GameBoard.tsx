"use client";

import React, { useState, useEffect } from "react";
import { useMonadGame } from "@/hooks/useMonadGame";
import { useSwitchChain } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { toast } from "sonner";
import { monadTestnet } from "@/constants/networks";
import { motion, AnimatePresence } from "framer-motion";
import RoadThree from "./RoadThree";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import confetti from "canvas-confetti";
import { Shield, Zap, Terminal, RefreshCcw, Flame, Trophy, Wind as WindIcon, AlertTriangle } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;

export default function GameBoard() {
    const { gameState, lastResult, stats, kick, fee, level, multiplier, sequenceNumber, writeError, txState, debugLogs, txHash } = useMonadGame(CONTRACT_ADDRESS);
    const { user, authenticated, ready } = usePrivy();
    const { wallets } = useWallets();
    const { switchChain, isPending: isSwitching } = useSwitchChain();

    // 1. Find the connected Privy wallet to get the chainId
    const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
    const activeWallet = embeddedWallet || wallets[0];
    const isConnected = ready && authenticated;
    const isSyncing = authenticated && !embeddedWallet; // Logged in but wallet not yet synced to array

    const [goaliePos, setGoaliePos] = useState<"left" | "center" | "right">("center");
    const [hoveredZone, setHoveredZone] = useState<number | null>(1); // Default to center
    const [lastPlayerMove, setLastPlayerMove] = useState<number | null>(null);

    const isOnFire = stats?.[3];

    // Robust chain check: handles both "eip155:10143" and "10143"
    // Only show "Wrong Network" if we actually HAVE a wallet to check against
    const isWrongChain = isConnected && !isSyncing && activeWallet &&
        activeWallet.chainId !== `eip155:${monadTestnet.id}` &&
        activeWallet.chainId !== String(monadTestnet.id);

    // Level Tiers
    const levelTier = level >= 7 ? "Legend" : level >= 4 ? "Pro" : "Rookie";
    const tierColor = level >= 7 ? "text-yellow-400" : level >= 4 ? "text-blue-400" : "text-green-400";

    // Auto-prompt to switch chain
    const handleSwitchChain = async () => {
        if (activeWallet && activeWallet.switchChain) {
            try {
                await activeWallet.switchChain(monadTestnet.id);
            } catch (e) {
                console.error("Failed to switch chain via Privy:", e);
                // Fallback to Wagmi switch if needed
                switchChain({ chainId: monadTestnet.id });
            }
        } else {
            switchChain({ chainId: monadTestnet.id });
        }
    };

    const handleKick = async (move: number) => {
        if (isSyncing) {
            toast.error("Finishing wallet setup...", {
                description: "Just a second while we sync your Privy wallet."
            });
            return;
        }
        try {
            setLastPlayerMove(move);
            await kick(move);
        } catch (err: any) {
            // Toast is handled in useMonadGame logic via useEffect checks if needed, 
            // but we can also catch immediate throw errors here.
            toast.error("Transaction Failed", {
                description: err.shortMessage || err.message || "Failed to request kick on-chain.",
            });
        }
    };

    // Transaction State Feedback
    useEffect(() => {
        if (txState === "awaiting-signature") {
            toast.loading("Waiting for Wallet...", {
                id: "tx-status",
                description: "Please confirm the transaction in your wallet.",
                duration: 10000,
            });
        } else if (txState === "confirming") {
            toast.loading("Confirming on Monad...", {
                id: "tx-status",
                description: (
                    <div className="flex flex-col gap-1">
                        <span>Transaction submitted. Waiting for block inclusion...</span>
                        {txHash && (
                            <a
                                href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-monad-neon underline text-xs hover:text-white"
                            >
                                View Transaction ↗
                            </a>
                        )}
                    </div>
                ),
                duration: 20000,
            });
        } else if (txState === "idle" && gameState === "processing") {
            toast.success("Kick Confirmed!", {
                id: "tx-status",
                description: "Verifying entropy with Pyth...",
                duration: 3000,
            });
        } else if (txState === "error") {
            toast.dismiss("tx-status");
        }
    }, [txState, gameState]);

    // Handle Confetti on Goal
    useEffect(() => {
        if (gameState === "result" && lastResult?.isGoal) {
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.5 },
                colors: ["#ff00ff", "#00ffff", "#ffffff"]
            });
        }
    }, [gameState, lastResult]);

    // Reset lastPlayerMove when game returns to idle
    useEffect(() => {
        if (gameState === "idle") {
            setLastPlayerMove(null);
        }
    }, [gameState]);

    // Goalie Shuffle Logic
    useEffect(() => {
        if (gameState === "processing") {
            const interval = setInterval(() => {
                const positions: ("left" | "center" | "right")[] = ["left", "center", "right"];
                setGoaliePos(positions[Math.floor(Math.random() * 3)]);
            }, 120);
            return () => clearInterval(interval);
        } else if (gameState === "result" && lastResult) {
            const posMap: Record<number, "left" | "center" | "right"> = { 0: "left", 1: "center", 2: "right" };
            setGoaliePos(posMap[lastResult.goalieMove]);
        } else if (gameState === "idle") {
            setGoaliePos("center");
        }
    }, [gameState, lastResult]);

    return (
        <div className="cyber-frame w-full max-w-5xl">
            <div className="relative z-10 p-10 flex flex-col items-center">

                {/* Wrong Chain Warning Banner */}
                {isWrongChain && (
                    <div className="w-full mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 font-medium">
                                Wrong network! Please switch to Monad Testnet
                            </span>
                        </div>
                        <button
                            onClick={handleSwitchChain}
                            disabled={isSwitching}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSwitching ? "Switching..." : "Switch Network"}
                        </button>
                    </div>
                )}

                {/* HUD: Main Title */}
                <div className="text-center mb-12 w-full">
                    <h1 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(232,121,249,0.7)] uppercase">
                        NAD-KICKERS
                    </h1>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-monad-neon" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">Tournament Arena</p>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-monad-neon" />
                    </div>
                </div>

                {/* Sub HUD: Stats */}
                <div className="w-full flex justify-between mb-4 px-6">
                    <div className="space-y-1">
                        <span className="text-3xl font-black italic text-white uppercase tracking-tighter">STREAK: {stats?.[0]?.toString() || "0"}</span>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">BEST: {stats?.[1]?.toString() || "0"}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">ACCUMULATED POINTS:</span>
                        <span className="text-6xl font-black italic text-white leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {stats?.[2]?.toString() || "0"}
                        </span>
                    </div>
                </div>

                {/* Level / Multiplier / Wind HUD */}
                <div className="w-full flex justify-center items-center gap-8 mb-6 px-6">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10">
                        <Zap className={cn("w-4 h-4", tierColor)} />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                            LVL {level} · <span className={tierColor}>{levelTier}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                            {multiplier.toFixed(1)}x MULTIPLIER
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10">
                        <WindIcon className={cn("w-4 h-4", lastResult?.windStrength && lastResult.windStrength > 3 ? "text-red-400" : "text-gray-400")} />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                            WIND: {lastResult?.windStrength !== undefined ? (lastResult.windStrength > 3 ? "Strong" : "Calm") : "---"}
                        </span>
                    </div>
                </div>

                {/* Pitch Area - Tightened aspect ratio to remove dead space */}
                <div className="relative w-full aspect-[16/7] glass-panel overflow-hidden flex items-end justify-center mb-10 border-white/10 bg-[#0E0C15]">

                    {/* 3D Immersive Stadium Background */}
                    <RoadThree
                        gameState={gameState}
                        lastResult={lastResult}
                        playerMove={gameState === "idle" ? hoveredZone : lastPlayerMove}
                        isOnFire={stats ? stats[3] : false}
                    />

                    {/* Real Stadium Goal Post Structure - Massive Width (x2) & Extra Far Depth */}
                    <div className="absolute inset-x-[10%] top-[2%] bottom-[28%] flex items-center justify-center pointer-events-none z-10 transition-all">
                        <div className="w-full h-full relative scale-[0.25]">
                            {/* Main Goal Frame: Tubular Post Simulation */}
                            <div className="absolute inset-0 border-x-[8px] border-t-[8px] border-[#836EF9] shadow-[0_0_25px_rgba(131,110,249,0.4)] rounded-t-[4px] z-20">
                                {/* Inner shading for depth */}
                                <div className="absolute inset-0 border-x-[2px] border-t-[2px] border-white/20 rounded-t-[2px]" />
                            </div>

                            {/* Net Mesh - Physical Texture */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_0,transparent_8px),repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_0,transparent_8px)] opacity-20 z-10" />

                            {/* Net Shadow/Depth */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-0" />

                            {/* Base Anchors - Left and Right */}
                            <div className="absolute -bottom-1 -left-3 w-6 h-2 bg-[#836EF9] rounded-full blur-[2px] opacity-60 z-30" />
                            <div className="absolute -bottom-1 -right-3 w-6 h-2 bg-[#836EF9] rounded-full blur-[2px] opacity-60 z-30" />

                            {/* Post Grounding Glow */}
                            <div className="absolute -bottom-2 -left-4 w-8 h-4 bg-monad-neon/20 blur-lg rounded-full" />
                            <div className="absolute -bottom-2 -right-4 w-8 h-4 bg-monad-neon/20 blur-lg rounded-full" />
                        </div>
                    </div>

                    {/* On Fire UI Overlay */}
                    <AnimatePresence>
                        {isOnFire && (
                            <motion.div
                                initial={{ opacity: 0, y: -40 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-4 left-1/2 -translate-x-1/2 z-40"
                            >
                                <div className="px-5 py-1.5 bg-gradient-to-r from-orange-600/60 via-monad-berry/60 to-orange-600/60 border border-monad-neon rounded-full flex items-center gap-2 backdrop-blur-xl shadow-[0_0_30px_rgba(232,121,249,0.6)]">
                                    <Flame className="w-3 h-3 text-orange-400 animate-bounce" />
                                    <span className="text-[10px] font-black italic text-white uppercase tracking-[0.2em] text-fire">ON FIRE!</span>
                                    <Flame className="w-3 h-3 text-orange-400 animate-bounce" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Goalie: Larger Scale & Strictly on Goal Line */}
                    <motion.div
                        animate={{
                            x: goaliePos === "left" ? -110 : goaliePos === "right" ? 110 : 0,
                            scale: (gameState === "result" && !lastResult?.isGoal) ? 0.28 : 0.22,
                            y: [0, -1, 0]
                        }}
                        transition={{
                            x: { type: "spring", stiffness: 200, damping: 20 },
                            y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                        }}
                        className="absolute bottom-[38%] z-20"
                    >
                        <div className="relative flex flex-col items-center">
                            {/* Character Head */}
                            <div className={cn(
                                "w-10 h-10 rounded-xl border-2 mb-1.5 transition-colors duration-500 flex items-center justify-center",
                                isOnFire ? "bg-monad-berry border-monad-neon shadow-[0_0_30px_#E879F9]" : "bg-monad-purple border-white/20 shadow-[0_0_15px_#836EF9]"
                            )}>
                                <div className="w-6 h-0.5 bg-white/40 rounded-full" />
                            </div>

                            {/* Character Body with Monad 'M' */}
                            <div className={cn(
                                "relative w-24 h-14 rounded-t-2xl border-x-[3px] border-t-[3px] flex items-center justify-center transition-all duration-500",
                                isOnFire ? "bg-monad-berry border-monad-neon shadow-[0_0_50px_#E879F9]" : "bg-monad-purple border-white/30 shadow-[0_0_20px_#836EF9]"
                            )}>
                                <span className="text-2xl font-black text-white italic tracking-tighter drop-shadow-md">M</span>

                                {/* Arm Accents */}
                                <div className="absolute -left-3 top-2 w-3 h-8 bg-inherit border-l-[3px] border-t-[3px] border-inherit rounded-tl-lg" />
                                <div className="absolute -right-3 top-2 w-3 h-8 bg-inherit border-r-[3px] border-t-[3px] border-inherit rounded-tr-lg" />
                            </div>

                            {/* Base Ground Glow */}
                            <div className="absolute -bottom-1 w-32 h-3 bg-monad-neon/15 blur-lg rounded-full -z-10" />
                        </div>
                    </motion.div>

                    {/* Ball is now handled in 3D by RoadThree */}

                    {/* Integrated Audit Log Panel (Refined HUD) */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-8 w-56 glass-panel p-5 border-white/10 z-50 rounded-3xl backdrop-blur-2xl">
                        <div className="flex items-center gap-2 text-monad-neon mb-4 border-b border-white/10 pb-2">
                            <Terminal className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Fairness Feed</span>
                        </div>
                        <div className="audit-log-floating space-y-3 overflow-hidden text-[10px]">
                            <div className="flex flex-col gap-1">
                                <span className="opacity-40 font-bold text-[8px] uppercase">Sequence ID</span>
                                <span className="text-white font-mono break-all leading-tight">
                                    {sequenceNumber ? `#${sequenceNumber.toString().slice(-12)}` : "---"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="opacity-40 font-bold text-[8px] uppercase">Client Entropy</span>
                                <span className="text-white font-mono truncate">Pyth V2 Managed</span>
                            </div>
                            <div className="pt-2 space-y-2 border-t border-white/5">
                                <div className="flex justify-between">
                                    <span className="opacity-40 uppercase">Goalie Pos</span>
                                    <span className="text-monad-neon font-black lowercase">
                                        {(gameState === "result" && lastResult)
                                            ? (["LEFT", "CENTER", "RIGHT"][lastResult.goalieMove])
                                            : (gameState === "idle" ? "---" : "PENDING")}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-40 uppercase">User Logic</span>
                                    <span className="text-white font-black">
                                        {lastPlayerMove !== null
                                            ? (["LEFT", "CENTER", "RIGHT"][lastPlayerMove])
                                            : "---"}
                                    </span>
                                </div>
                                <div className="flex justify-between px-2 py-1 bg-white/5 rounded-md mt-2">
                                    <span className="opacity-40 uppercase">Internal Status</span>
                                    <span className={cn(
                                        "font-black text-[8px] tracking-tight uppercase",
                                        gameState === "processing" ? "text-yellow-400" : (gameState === "idle" ? "text-gray-500" : "text-green-400")
                                    )}>{gameState}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Overlay Text */}
                    <AnimatePresence>
                        {gameState === "result" && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none"
                            >
                                <motion.h2
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        rotate: [0, 3, -3, 0]
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className={cn(
                                        "text-8xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]",
                                        lastResult?.isGoal ? "text-monad-neon" : "text-white/40"
                                    )}
                                >
                                    {lastResult?.isGoal
                                        ? "GOAAAAAL!"
                                        : (lastResult && lastResult.goalieMove === lastResult.actualMove
                                            ? "SAVED!"
                                            : "MISSED!")}
                                </motion.h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls: Premium Pill Buttons */}
                <div className="w-full flex justify-center gap-8 px-8">
                    {[
                        { label: "LEFT", val: 0 },
                        { label: "CENTER", val: 1 },
                        { label: "RIGHT", val: 2 },
                    ].map((btn) => (
                        <button
                            key={btn.val}
                            onMouseEnter={() => setHoveredZone(btn.val)}
                            onMouseLeave={() => setHoveredZone(null)}
                            onClick={() => handleKick(btn.val)}
                            disabled={(gameState !== "idle" && gameState !== "result") || isSyncing || isWrongChain}
                            className={cn(
                                "pill-button flex-1 max-w-[180px] text-base transition-all py-5 border-2",
                                hoveredZone === btn.val ? "active scale-110" : "bg-black/60 border-white/10 opacity-60",
                                (gameState === "kicking" || gameState === "processing" || isSyncing) && "opacity-20 cursor-not-allowed"
                            )}
                        >
                            {isSyncing ? "SYNCING..." : btn.label}
                        </button>
                    ))}
                </div>

                {/* Footer Info (High Performance Look) */}
                <div className="w-full mt-12 flex justify-between items-center px-8">
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                        <RefreshCcw className={cn("w-4 h-4 text-monad-neon", (gameState === "processing" || gameState === "kicking" || txState === "confirming" || isSyncing) && "animate-spin")} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
                            {isSyncing ? "SYNCING WALLET..." : txState === "awaiting-signature" ? "SIGN TRANSACTION" :
                                txState === "confirming" ? "CONFIRMING on-chain" :
                                    gameState === "idle" ? "ARCADE READY" :
                                        gameState === "processing" ? "VERIFYING ENTROPY" : "SYNCING DATA"}
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="h-4 w-px bg-white/10" />
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="opacity-30">NETWORK FEE:</span>
                            <span className="text-monad-neon font-black">{fee ? `${(Number(fee) / 1e18).toFixed(4)} MON` : "WAIT..."}</span>
                        </div>
                    </div>
                </div>

                {/* Diagnostics Panel (Visible on hover of footer) */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity p-2 bg-black/80 rounded text-[8px] font-mono text-gray-500 pointer-events-auto">
                    <p>Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</p>
                    <p>Network: {activeWallet?.chainId || "Unknown"} ({isWrongChain ? "Wrong" : "OK"})</p>
                    <p>TxState: {txState}</p>
                    <div className="mt-2 border-t border-white/10 pt-1">
                        {debugLogs.map((log, i) => (
                            <div key={i} className="opacity-70">&gt; {log}</div>
                        ))}
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes road-wipe {
                        0% { transform: translateY(400%); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: translateY(-100%); opacity: 0; }
                    }
                    .animate-road-wipe {
                        animation: road-wipe 4s linear infinite;
                    }
                    .live-road-grid {
                        animation: grid-pulse 6s ease-in-out infinite alternate;
                    }
                    @keyframes grid-pulse {
                        from { filter: brightness(1) saturate(1); }
                        to { filter: brightness(1.3) saturate(1.5); color: #E879F9; }
                    }
                    .text-fire {
                        text-shadow: 0 0 10px #f97316, 0 0 20px #ea580c;
                        animation: fire-flicker 0.5s infinite alternate;
                    }
                    @keyframes fire-flicker {
                        from { opacity: 0.8; transform: scale(1); }
                        to { opacity: 1; transform: scale(1.05); }
                    }
                `}</style>
            </div>
        </div>
    );
}
