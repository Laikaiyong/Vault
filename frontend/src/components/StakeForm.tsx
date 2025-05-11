"use client";

import { useState } from "react";
import { StakingOptionType } from "@/hooks/useContracts";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import RewardsForecast from "./charts/RewardsForecast";

interface StakeFormProps {
  option: StakingOptionType;
  userAddress: string;
  balance: ethers.BigNumber;
  allowance: ethers.BigNumber;
  tokenSymbol: string;
  minimumStake?: ethers.BigNumber;
  onApprove: (amount: ethers.BigNumber) => Promise<boolean>;
  onStake: (amount: ethers.BigNumber, optionId: number) => Promise<boolean>;
  onSuccess: () => void;
}

const StakeForm = ({ 
  option, 
  userAddress, 
  balance,
  allowance,
  tokenSymbol,
  minimumStake,
  onApprove,
  onStake,
  onSuccess
}: StakeFormProps) => {
  const [amount, setAmount] = useState("");
  const [approving, setApproving] = useState(false);
  const [staking, setStaking] = useState(false);
  
  const parsedAmount = amount ? ethers.utils.parseEther(amount) : ethers.BigNumber.from(0);
  const needsApproval = parsedAmount.gt(allowance);
  const insufficientBalance = parsedAmount.gt(balance);
  const belowMinStake = minimumStake && parsedAmount.lt(minimumStake) && parsedAmount.gt(0);
  
  // Extract numerical APY value from option.apy string
  const apyValue = parseFloat(option.apy.replace('%', ''));
  
  const handleApprove = async () => {
    if (!parsedAmount.gt(0)) {
      alert("Please enter a valid amount");
      return;
    }
    
    try {
      setApproving(true);
      const success = await onApprove(parsedAmount);
      if (success) {
        // The allowance should be updated automatically through refreshData
      }
    } finally {
      setApproving(false);
    }
  };
  
  const handleStake = async () => {
    if (!parsedAmount.gt(0)) {
      alert("Please enter a valid amount");
      return;
    }
    
    try {
      setStaking(true);
      const success = await onStake(parsedAmount, option.id);
      if (success) {
        setAmount(""); // Reset the form
        onSuccess();
      }
    } finally {
      setStaking(false);
    }
  };
  
  return (
    <motion.div 
      className="minimalist-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-xl font-semibold mb-4">
        Stake with {option.name} ({option.apy} APY)
      </h3>
      
      <form onSubmit={(e) => {e.preventDefault(); needsApproval ? handleApprove() : handleStake();}} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block mb-2 text-sm font-medium">
            Amount to Stake
          </label>
          <div className="relative">
            <input
              id="amount"
              type="text"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/,/g, '.'))}
              placeholder="0.0"
              className="w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/50"
              disabled={approving || staking}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black text-white px-3 py-1 rounded text-sm hover:bg-black/80 transition-all"
              onClick={() => setAmount(ethers.utils.formatEther(balance))}
              disabled={approving || staking}
            >
              MAX
            </button>
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-black/60">
          <span>Lock period: {option.lockPeriodInDays === 0 ? "None" : `${option.lockPeriodInDays} days`}</span>
          <span>Your Balance: {ethers.utils.formatEther(balance)} {tokenSymbol}</span>
        </div>
        
        {insufficientBalance && (
          <div className="text-red-600 text-sm">Insufficient balance</div>
        )}
        
        {belowMinStake && (
          <div className="text-red-600 text-sm">
            Minimum stake amount is {ethers.utils.formatEther(minimumStake!)} {tokenSymbol}
          </div>
        )}
        
        <motion.button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition-all hover:bg-black/80"
          disabled={approving || staking || !amount || insufficientBalance || belowMinStake || parsedAmount.lte(0)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {approving 
            ? "Approving..." 
            : staking 
              ? "Staking..." 
              : needsApproval
                ? "Approve Tokens"
                : "Stake Tokens"}
        </motion.button>
      </form>
      
      {amount && parseFloat(amount) > 0 && (
        <RewardsForecast 
          stakingAmount={amount} 
          apy={apyValue} 
          lockPeriodInDays={option.lockPeriodInDays} 
        />
      )}
    </motion.div>
  );
};

export default StakeForm;