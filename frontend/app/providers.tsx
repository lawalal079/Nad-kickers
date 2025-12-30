"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { monadTestnet } from "@/constants/networks";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";

// 0. Setup QueryClient
const queryClient = new QueryClient();

// 1. Setup Wagmi Config via Privy-Wagmi
// This config is specialized for Privy and handles the connection flow
const wagmiConfig = createConfig({
    chains: [monadTestnet],
    transports: {
        [monadTestnet.id]: http("https://monad-testnet.drpc.org"),
    },
});

export function Providers({ children }: { children: ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
            config={{
                // Email-only login - all users get embedded wallets
                loginMethods: ["email"],
                appearance: {
                    theme: "dark",
                    logo: "/favicon.png",
                    landingHeader: "NAD-KICKERS",
                },
                supportedChains: [monadTestnet],
                defaultChain: monadTestnet,
                embeddedWallets: {
                    // Force embedded wallet for ALL users
                    ethereum: {
                        createOnLogin: "all-users",
                    },
                    // Auto-sign transactions without popups (Replaces noPromptOnSignature)
                    showWalletUIs: false,
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
