"use client";

import { useState } from "react";
import { truncateAddress } from "@/utils/format";
import { ensureSepoliaNetwork } from "@/utils/network";
import { WalletIcon, ArrowRightCircleIcon } from "@/components/icons";

interface WalletConnectProps {
  onConnect: (address: string | null) => void;
  address: string | null;
}

const WalletConnect = ({ onConnect, address }: WalletConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== "undefined") {
        // First ensure we're on Sepolia
        const isCorrectNetwork = await ensureSepoliaNetwork();
        if (!isCorrectNetwork) {
          throw new Error("Please switch to Sepolia network");
        }
        
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        onConnect(accounts[0]);
      } else {
        alert("Please install MetaMask to use this application");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    onConnect(null);
  };

  return (
    <div className="flex justify-end mb-6">
      {address ? (
        <div className="flex items-center gap-4">
          <span className="bg-black border border-white text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            {truncateAddress(address)}
          </span>
          <button
            onClick={disconnectWallet}
            className="border border-white hover:bg-white hover:text-black px-4 py-2 rounded-lg transition-all flex items-center gap-2"
          >
            <ArrowRightCircleIcon className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="border border-white hover:bg-white hover:text-black px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-70 flex items-center gap-2"
        >
          <WalletIcon className="h-5 w-5" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
};

export default WalletConnect;