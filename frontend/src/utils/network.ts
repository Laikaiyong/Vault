import { ethers } from "ethers";

export const SEPOLIA_CHAIN_ID = 11155111;

export type NetworkConfig = {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
};

export const SEPOLIA_CONFIG: NetworkConfig = {
  chainId: "0x" + SEPOLIA_CHAIN_ID.toString(16),
  chainName: "Sepolia",
  rpcUrls: ["https://rpc.sepolia.org"],
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export async function ensureSepoliaNetwork(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    // Check if already on Sepolia
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { chainId } = await provider.getNetwork();
    
    if (chainId === SEPOLIA_CHAIN_ID) {
      return true;
    }

    // Request network switch
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates the chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_CONFIG],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
          return false;
        }
      }
      console.error("Failed to switch to Sepolia network:", switchError);
      return false;
    }
  } catch (error) {
    console.error("Error ensuring Sepolia network:", error);
    return false;
  }
}