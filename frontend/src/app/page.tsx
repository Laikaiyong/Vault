"use client";

import { useState } from "react";
import StakingDashboard from "@/components/StakingDashboard";
import WalletConnect from "@/components/WalletConnect";
import Header from "@/components/Header";
import FadeIn from "@/components/animations/FadeIn";

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <FadeIn>
          <h1 className="text-5xl font-bold mb-8 text-center text-gradient">
            Stake NOW!
          </h1>
        </FadeIn>
        
        <div className="mb-8">
          <FadeIn delay={0.1}>
            <WalletConnect onConnect={setAddress} address={address} />
          </FadeIn>
        </div>
        
        {address ? (
          <FadeIn delay={0.2}>
            <StakingDashboard address={address} />
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="text-center p-12 minimalist-card">
              <h2 className="text-2xl font-medium mb-4">Connect your wallet to start staking</h2>
              <p className="text-black/70">
                Stake your tokens with flexible or locked options to earn rewards on Sepolia testnet
              </p>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  );
}