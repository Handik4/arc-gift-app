"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Blockchain and Auth Providers
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Custom Chain Configuration for Arc Testnet
const arcTestnet = defineChain({
  id: 2024,
  name: "Arc Testnet",
  nativeCurrency: { name: "Arc", symbol: "ARC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer-testnet.arc.network" },
  },
});

const wagmiConfig = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#020617]">
        <PrivyProvider
          appId="cmo5i2nuc00f60cjr7xn9pmez"
          config={{
            appearance: {
              theme: "dark",
              accentColor: "#FFD700",
              showWalletLoginFirst: true,
            },
            embeddedWallets: {
              createOnLogin: "users-without-wallets",
            },
            // Fix: Add supportedChains to match defaultChain
            supportedChains: [arcTestnet],
            defaultChain: arcTestnet,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
              {children}
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}