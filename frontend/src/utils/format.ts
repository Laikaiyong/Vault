import { ethers } from "ethers";

export const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTokenAmount = (amount: ethers.BigNumber | undefined, decimals = 18): string => {
  if (!amount) return "0";
  return ethers.utils.formatUnits(amount, decimals);
};