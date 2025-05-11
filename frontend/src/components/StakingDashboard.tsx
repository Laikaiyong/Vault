"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import StakingOptions from "./StakingOptions";
import StakeForm from "./StakeForm";
import UserStakes from "./UserStakes";
import PoolInfo from "./PoolInfo";
import APYComparison from "./charts/APYComparison";
import FadeIn from "./animations/FadeIn";
import { useContracts, StakingOptionType } from "@/hooks/useContracts";
import { api, PoolInfo as PoolInfoType } from "@/services/api.service";
import { ethers } from "ethers";
import { CoinsIcon } from "./icons";

interface StakingDashboardProps {
  address: string;
}

const StakingDashboard = ({ address }: StakingDashboardProps) => {
  const [selectedOption, setSelectedOption] = useState<StakingOptionType | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfoType | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const {
    loading: contractLoading,
    error: contractError,
    stakingOptions,
    userStakes,
    stakingTokenBalance,
    stakingTokenAllowance,
    networkCorrect,
    checkNetwork,
    refreshData,
    approveStaking,
    stakeTokens,
    unstakeTokens,
    claimRewards
  } = useContracts(address);

  // Format balance for display
  const formattedBalance = ethers.utils.formatEther(stakingTokenBalance || ethers.BigNumber.from(0));

  // Fetch pool info from backend
  useEffect(() => {
    async function getPoolInfo() {
      try {
        setApiLoading(true);
        const info = await api.getPoolInfo();
        setPoolInfo(info);
        setApiError(null);
      } catch (error) {
        console.error("Failed to fetch pool info:", error);
        setApiError("Failed to fetch staking information from API");
      } finally {
        setApiLoading(false);
      }
    }

    if (address && networkCorrect) {
      getPoolInfo();
    }
  }, [address, networkCorrect]);
  
  const loading = contractLoading || apiLoading;
  const error = contractError || apiError;

  // If network is incorrect, show a message
  if (!networkCorrect) {
    return (
      <div className="space-y-8">
        <motion.div 
          className="minimalist-card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-4">Incorrect Network</h2>
          <p className="mb-6">Please connect to Sepolia testnet to use this application.</p>
          <motion.button 
            onClick={checkNetwork} 
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-black/80 transition-all"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Switch to Sepolia
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <motion.div 
          className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <p>Error: {error}</p>
        </motion.div>
      )}
      
      <FadeIn>
        {poolInfo && <PoolInfo poolInfo={poolInfo} />}
      </FadeIn>
      
      <motion.div 
        className="minimalist-card p-4 flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <CoinsIcon className="h-6 w-6" />
        <p className="text-lg">
          Your Balance: <span className="font-bold">{formattedBalance} {poolInfo?.stakingToken.symbol || 'TOKEN'}</span>
        </p>
      </motion.div>
      
      <FadeIn delay={0.1}>
        <section id="apy-comparison" className="mb-8">
          <APYComparison options={stakingOptions.filter(option => option.active)} />
        </section>
      </FadeIn>
      
      <section id="stake">
        <FadeIn delay={0.2}>
          <h2 className="text-2xl font-bold mb-4">Staking Options</h2>
          <StakingOptions 
            options={stakingOptions.filter(option => option.active)} 
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            loading={loading}
          />
        </FadeIn>
        
        {selectedOption && (
          <div className="mt-6">
            <StakeForm 
              option={selectedOption} 
              userAddress={address} 
              balance={stakingTokenBalance}
              allowance={stakingTokenAllowance}
              tokenSymbol={poolInfo?.stakingToken.symbol || 'TOKEN'}
              minimumStake={poolInfo?.minimumStake.amount ? ethers.BigNumber.from(poolInfo.minimumStake.amount) : undefined}
              onApprove={approveStaking}
              onStake={stakeTokens}
              onSuccess={() => {
                refreshData();
                // Also refresh pool info from API after staking
                api.getPoolInfo().then(setPoolInfo).catch(console.error);
              }}
            />
          </div>
        )}
      </section>
      
      <section id="your-stakes">
        <FadeIn delay={0.3}>
          <h2 className="text-2xl font-bold mb-4">Your Stakes</h2>
          <UserStakes 
            stakes={userStakes.filter(stake => stake.active)} 
            loading={loading}
            tokenSymbol={poolInfo?.stakingToken.symbol || 'TOKEN'}
            rewardSymbol={poolInfo?.rewardsToken.symbol || 'REWARD'}
            onClaimRewards={claimRewards}
            onUnstake={unstakeTokens}
            onSuccess={() => {
              refreshData();
              // Also refresh pool info from API after claiming/unstaking
              api.getPoolInfo().then(setPoolInfo).catch(console.error);
            }}
          />
        </FadeIn>
      </section>
    </div>
  );
};

export default StakingDashboard;