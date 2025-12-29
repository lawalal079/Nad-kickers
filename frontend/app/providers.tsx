"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { monadTestnet } from "@/constants/networks";
import { injected } from "wagmi/connectors";

const config = createConfig({
    chains: [monadTestnet],
    connectors: [injected()],
    transports: {
        [monadTestnet.id]: http(),
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
