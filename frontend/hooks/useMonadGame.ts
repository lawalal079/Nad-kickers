import { useState, useCallback, useEffect, useRef } from "react";
import {
    useAccount,
    useWaitForTransactionReceipt,
    useReadContract,
    usePublicClient,
    useWalletClient
} from "wagmi";
import { parseEventLogs, encodeFunctionData, type Log } from "viem";

export const PENALTY_SHOOTOUT_ABI = [
    "function requestKick(uint8 playerMove) external payable",
    "function getEntropyFee() public view returns (uint256)",
    "function playerStats(address) public view returns (uint256 currentStreak, uint256 highestStreak, uint256 totalPoints, bool isOnFire)",
    "function rounds(uint64) public view returns (address player, uint8 playerMove, uint64 sequenceNumber, bool fulfilled, bool isGoal, uint8 goalieMove)",
    "event KickRequested(uint64 indexed sequenceNumber, address indexed player, uint8 playerMove)",
    "event KickFulfilled(uint64 indexed sequenceNumber, address indexed player, uint8 playerMove, uint8 actualPlayerMove, uint8 goalieMove, bool isGoal, uint256 pointsEarned, uint8 windStrength)"
] as const;

// Note: In a real project, we'd use the generated JSON ABI. 
// For this demo, we use a simplified human-readable-like structure or just the raw ABI.
// Since we are using Wagmi, we should provide the full ABI array.

const ABI = [
    {
        "inputs": [{ "internalType": "uint8", "name": "playerMove", "type": "uint8" }],
        "name": "requestKick",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getEntropyFee",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "playerStats",
        "outputs": [
            { "internalType": "uint256", "name": "currentStreak", "type": "uint256" },
            { "internalType": "uint256", "name": "highestStreak", "type": "uint256" },
            { "internalType": "uint256", "name": "totalPoints", "type": "uint256" },
            { "internalType": "bool", "name": "isOnFire", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }],
        "name": "rounds",
        "outputs": [
            { "internalType": "address", "name": "player", "type": "address" },
            { "internalType": "enum PenaltyShootout.ShotDirection", "name": "playerMove", "type": "uint8" },
            { "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" },
            { "internalType": "bool", "name": "fulfilled", "type": "bool" },
            { "internalType": "bool", "name": "isGoal", "type": "bool" },
            { "internalType": "enum PenaltyShootout.ShotDirection", "name": "goalieMove", "type": "uint8" },
            { "internalType": "uint8", "name": "windStrength", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" },
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "uint8", "name": "playerMove", "type": "uint8" }
        ],
        "name": "KickRequested",
        "type": "event"
    }
] as const;

export function useMonadGame(contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    // We remove useWriteContract to avoid simulation overhead issues
    const [writeError, setWriteError] = useState<Error | null>(null);

    // Polling State
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
    const [sequenceNumber, setSequenceNumber] = useState<bigint | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [gameState, setGameState] = useState<"idle" | "kicking" | "processing" | "result">("idle");
    const [lastResult, setLastResult] = useState<{ isGoal: boolean; goalieMove: number; windStrength: number; actualMove: number } | null>(null);
    const [level, setLevel] = useState(1);
    const [multiplier, setMultiplier] = useState(1.0);
    const [txState, setTxState] = useState<"idle" | "awaiting-signature" | "confirming" | "error">("idle");
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = useCallback((msg: string) => {
        console.log(msg);
        setDebugLogs(prev => [msg, ...prev].slice(0, 10)); // Keep last 10 logs
    }, []);

    const { data: fee } = useReadContract({
        address: contractAddress,
        abi: ABI,
        functionName: "getEntropyFee",
    });

    const { data: stats, refetch: refetchStats } = useReadContract({
        address: contractAddress,
        abi: ABI,
        functionName: "playerStats",
        args: [address!],
        query: { enabled: !!address },
    });

    // WaitForTransactionReceipt to get the sequence number
    const { data: receipt, isFetching: isReceiptFetching } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Polling function for the result
    const { data: roundResult, refetch: refetchRound } = useReadContract({
        address: contractAddress,
        abi: ABI,
        functionName: "rounds",
        args: sequenceNumber ? [sequenceNumber] : undefined,
        query: { enabled: !!sequenceNumber && isPolling },
    });

    // 1. When transaction is confirmed, extract sequenceNumber
    useEffect(() => {
        if (receipt) {
            console.log("Transaction confirmed, parsing logs...", receipt.transactionHash);
            const logs = parseEventLogs({
                abi: ABI,
                logs: receipt.logs as Log[],
                eventName: "KickRequested",
            });
            if (logs.length > 0) {
                const seq = (logs[0] as any).args.sequenceNumber;
                addLog(`KickRequested event found! Seq: ${seq.toString()}`);
                setSequenceNumber(seq);
                setIsPolling(true);
                setGameState("processing");
                setTxState("idle");
            } else {
                addLog("Error: No KickRequested event in receipt");
                setTxState("error");
            }
        }
    }, [receipt, addLog]);

    // 2. Poll for the result
    useEffect(() => {
        if (!isPolling || !sequenceNumber) return;

        pollIntervalRef.current = setInterval(() => {
            refetchRound();
        }, 2000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isPolling, sequenceNumber, refetchRound]);

    // 3. Handle the result once fulfilled
    useEffect(() => {
        if (roundResult && roundResult[3]) { // roundResult[3] is 'fulfilled'
            const [player, playerMove, seq, fulfilled, isGoal, goalieMove, windStrength] = roundResult;

            setIsPolling(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            setLastResult({
                isGoal,
                goalieMove: Number(goalieMove),
                windStrength: Number(windStrength),
                actualMove: Number(playerMove)
            });

            setGameState("result");
            refetchStats(); // stats update will trigger the sync useEffect
        }
    }, [roundResult, refetchStats]);

    // 4. Synchronization: Keep Level & Multiplier in sync with Stats
    // This handles both initialization (on refresh) and updates (on goal)
    useEffect(() => {
        if (stats) {
            const currentStreak = Number(stats[0]);
            const isGoalInResult = gameState === "result" && lastResult?.isGoal;

            // If we just scored, the streak in 'stats' might be OLD (blockchain lag)
            // But usually we refetch. Let's trust stats if idle, otherwise maybe use the +1 logic
            // However, it's safer to just sync with what's on-chain once it updates.
            const displayStreak = isGoalInResult ? currentStreak + 1 : currentStreak;

            const newLevel = Math.max(1, Math.min(displayStreak, 10));
            setLevel(newLevel);

            if (displayStreak >= 7) setMultiplier(2.5);
            else if (displayStreak >= 4) setMultiplier(1.5);
            else setMultiplier(1.0);
        }
    }, [stats, gameState, lastResult]);


    // 4. Auto-reset to idle after result
    useEffect(() => {
        if (gameState === "result") {
            const timer = setTimeout(() => {
                setGameState("idle");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    const kick = useCallback(async (playerMove: number) => {
        if (!address) throw new Error("Wallet not connected");
        if (!fee) throw new Error("Game fee not loaded. Check your network connection.");
        if (!walletClient) throw new Error("Wallet not accessible. Please reconnect.");

        addLog(`Init kick. Move: ${playerMove}, Fee: ${fee.toString()}`);
        setGameState("kicking");
        setLastResult(null);
        setSequenceNumber(null);
        setIsPolling(false);
        setTxState("awaiting-signature");
        setWriteError(null);

        try {
            // Plan A: Direct wallet usage via Viem
            addLog("Attempting Plan A: walletClient...");
            const hash = await walletClient.writeContract({
                address: contractAddress,
                abi: ABI,
                functionName: "requestKick",
                args: [playerMove],
                value: fee as bigint,
                gas: BigInt(500000),
                chain: walletClient.chain,
                account: address
            });

            addLog(`Plan A Success: ${hash}`);
            setTxHash(hash);
            setTxState("confirming");
        } catch (error: any) {
            addLog(`Plan A Failed: ${error.message}`);
            console.warn("Plan A failed, attempting Plan B (Raw Request)...", error);

            try {
                // Plan B: Raw window.ethereum request (Nuclear Option)
                if (typeof window !== "undefined" && (window as any).ethereum) {
                    addLog("Attempting Plan B: Raw eth_sendTransaction...");

                    const data = encodeFunctionData({
                        abi: ABI,
                        functionName: "requestKick",
                        args: [playerMove]
                    });

                    const rawHash = await (window as any).ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{
                            from: address,
                            to: contractAddress,
                            data: data,
                            value: "0x" + (fee as bigint).toString(16), // Hex value
                            gas: "0x7A120", // 500,000 in hex
                        }]
                    });

                    addLog(`Plan B Success: ${rawHash}`);
                    setTxHash(rawHash as `0x${string}`);
                    setTxState("confirming");
                } else {
                    throw new Error("No window.ethereum found for fallback");
                }
            } catch (fallbackError: any) {
                addLog(`All Plans Failed: ${fallbackError.message}`);
                console.error("Critical Failure:", fallbackError);
                setGameState("idle");
                setTxState("error");
                setWriteError(fallbackError);
                throw fallbackError;
            }
        }
    }, [address, fee, contractAddress, walletClient, addLog]);

    return {
        gameState,
        lastResult,
        stats,
        kick,
        fee,
        level,
        multiplier,
        sequenceNumber,
        writeError,
        txState,
        debugLogs,
        txHash
    };
}
