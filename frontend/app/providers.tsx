"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { monadTestnet } from "@/constants/networks";
import { injected } from "wagmi/connectors";

const config = createConfig({
    chains: [monadTestnet],
    connectors: [injected({ target: "metaMask" })],
    ssr: true,
    transports: {
        [monadTestnet.id]: http("https://monad-testnet.drpc.org"),
    },
});

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = React.useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
