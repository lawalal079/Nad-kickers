"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Terminal as TerminalIcon } from "lucide-react";

interface VerificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    sequenceNumber?: string;
    userRandom?: string;
    goalieMove?: number;
    isGoal?: boolean;
}

export default function VerificationPanel({
    isOpen,
    onClose,
    sequenceNumber,
    userRandom,
    goalieMove,
    isGoal
}: VerificationPanelProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md glass-panel z-50 rounded-none border-y-0 border-r-0 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-glass-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-monad-purple/20 rounded-lg">
                                    <Shield className="w-5 h-5 text-monad-purple" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black italic tracking-tight uppercase">Audit Log</h3>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Verifiably Fair Engine</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 font-audit">
                            {/* Terminal Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-monad-purple mb-2">
                                    <TerminalIcon className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Entropy Stream</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-4 border border-glass-border space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-gray-500 text-[10px] uppercase">Sequence ID</span>
                                        <code className="text-monad-purple block break-all text-xs">
                                            {sequenceNumber || "waiting_for_request..."}
                                        </code>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-500 text-[10px] uppercase">Client Secret commitment</span>
                                        <code className="text-monad-berry block break-all text-[10px]">
                                            {userRandom || "*************** (hidden)"}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Math Section */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cryptographic Proof</h4>

                                <div className="grid gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-glass-border">
                                        <p className="text-[11px] leading-relaxed text-gray-300">
                                            The outcome is derived from the Pyth Entropy:
                                        </p>
                                        <div className="mt-3 bg-black/60 p-2 rounded text-[10px] text-white">
                                            goaliePos = uint256(entropy) % 3
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Calculated Move:</span>
                                            <span className="text-monad-purple font-bold">{goalieMove !== undefined ? goalieMove : "--"}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-xl border border-glass-border">
                                        <p className="text-[11px] leading-relaxed text-gray-300">
                                            Outcome Verification:
                                        </p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Goal Condition:</span>
                                            <span className="text-white font-mono text-[10px]">playerPos != goaliePos</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isGoal === undefined ? 'bg-gray-600' : isGoal ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            <span className={`text-xs font-bold ${isGoal === undefined ? 'text-gray-500' : isGoal ? 'text-green-400' : 'text-red-400'}`}>
                                                {isGoal === undefined ? 'PENDING' : isGoal ? 'VERIFIED GOAL' : 'VERIFIED SAVE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-glass-border bg-black/20">
                            <div className="flex items-center justify-between opacity-50 text-[10px] uppercase">
                                <span>Monad Testnet</span>
                                <a href="https://testnet.monadvision.com" target="_blank" rel="noopener noreferrer" className="hover:text-monad-purple">Explorer ↗</a>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
