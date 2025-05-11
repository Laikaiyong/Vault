"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { VaultAbi } from "../abis/VaultAbi";
import { ERC20Abi } from "../abis/ERC20Abi";
import { ensureSepoliaNetwork, SEPOLIA_CHAIN_ID } from "../utils/network";

// Contract addresses on Sepolia
const VAULT_CONTRACT_ADDRESS = "0x2B8f94ceeA12A7806469A2A6bfb87F9D6ee66C6e";
const STAKING_TOKEN_ADDRESS = "0xa895600CF9b295bEf5a0ABce08C04d772360FBE6";
const REWARDS_TOKEN_ADDRESS = "0x6ed2641f4207F495B94B2F44b7CB972Cf2E21945";

export interface StakingOptionType {
  id: number;
  name: string;
  lockPeriodInDays: number;
  rewardRate: ethers.BigNumber;
  apy: string;
  active: boolean;
}

export interface UserStakeType {
  id: number;
  amount: ethers.BigNumber;
  startTime: ethers.BigNumber;
  lockPeriodInDays: ethers.BigNumber;
  lockEndTime: ethers.BigNumber;
  rewardRate: ethers.BigNumber;
  lastClaimTime: ethers.BigNumber;
  active: boolean;
  rewards?: ethers.BigNumber;
}

export const useContracts = (address: string | null) => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [vaultContract, setVaultContract] = useState<ethers.Contract | null>(null);
  const [stakingToken, setStakingToken] = useState<ethers.Contract | null>(null);
  const [rewardsToken, setRewardsToken] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakingOptions, setStakingOptions] = useState<StakingOptionType[]>([]);
  const [userStakes, setUserStakes] = useState<UserStakeType[]>([]);
  const [stakingTokenBalance, setStakingTokenBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [stakingTokenAllowance, setStakingTokenAllowance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [rewardsBalance, setRewardsBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [networkCorrect, setNetworkCorrect] = useState<boolean>(false);

  // Check and switch to Sepolia network
  const checkNetwork = useCallback(async () => {
    const isCorrectNetwork = await ensureSepoliaNetwork();
    setNetworkCorrect(isCorrectNetwork);
    return isCorrectNetwork;
  }, []);

  // Initialize contracts
  useEffect(() => {
    const initContracts = async () => {
      try {
        if (typeof window.ethereum === "undefined") {
          setError("Please install MetaMask");
          setLoading(false);
          return;
        }

        // Ensure we're on Sepolia
        const isCorrectNetwork = await checkNetwork();
        if (!isCorrectNetwork) {
          setError("Please switch to Sepolia network");
          setLoading(false);
          return;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== SEPOLIA_CHAIN_ID) {
          setError("Please switch to Sepolia network");
          setLoading(false);
          return;
        }

        setProvider(provider);

        const vault = new ethers.Contract(
          VAULT_CONTRACT_ADDRESS,
          VaultAbi,
          provider.getSigner()
        );
        setVaultContract(vault);

        const stakingTokenContract = new ethers.Contract(
          STAKING_TOKEN_ADDRESS,
          ERC20Abi,
          provider.getSigner()
        );
        setStakingToken(stakingTokenContract);

        const rewardsTokenContract = new ethers.Contract(
          REWARDS_TOKEN_ADDRESS,
          ERC20Abi,
          provider.getSigner()
        );
        setRewardsToken(rewardsTokenContract);

        setLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize contracts:", err);
        setError(err.message || "Failed to initialize contracts");
        setLoading(false);
      }
    };

    if (address) {
      initContracts();
    }
  }, [address, checkNetwork]);

  // Listen for network changes
  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Rest of your code is unchanged
  // Fetch staking options
  const fetchStakingOptions = useCallback(async () => {
    // ... existing code
    try {
      if (!vaultContract || !address) return;
      
      const options = await vaultContract.getStakingOptions();
      const formattedOptions: StakingOptionType[] = await Promise.all(
        options.map(async (option: any, index: number) => {
          // Get APY for each option
          const apyBasisPoints = await vaultContract.getAPY(option.id);
          const apy = (Number(apyBasisPoints) / 100).toFixed(2) + "%";
          
          return {
            id: option.id.toNumber(),
            name: option.name,
            lockPeriodInDays: option.lockPeriodInDays.toNumber(),
            rewardRate: option.rewardRate,
            apy,
            active: option.active
          };
        })
      );
      
      setStakingOptions(formattedOptions);
    } catch (err: any) {
      console.error("Error fetching staking options:", err);
      setError(err.message || "Error fetching staking options");
    }
  }, [vaultContract, address]);

  // Fetch user stakes
  const fetchUserStakes = useCallback(async () => {
    try {
      if (!vaultContract || !address) return;
      
      const stakes = await vaultContract.getUserStakes(address);
      
      const formattedStakes: UserStakeType[] = await Promise.all(
        stakes.map(async (stake: any, index: number) => {
          // Get current rewards for each stake
          const rewards = await vaultContract.calculateRewards(address, index);
          
          return {
            id: index,
            amount: stake.amount,
            startTime: stake.startTime,
            lockPeriodInDays: stake.lockPeriodInDays,
            lockEndTime: stake.lockEndTime,
            rewardRate: stake.rewardRate,
            lastClaimTime: stake.lastClaimTime,
            active: stake.active,
            rewards
          };
        })
      );
      
      setUserStakes(formattedStakes);
    } catch (err: any) {
      console.error("Error fetching user stakes:", err);
      setError(err.message || "Error fetching user stakes");
    }
  }, [vaultContract, address]);

  // Fetch token balances and allowances
  const fetchBalancesAndAllowances = useCallback(async () => {
    try {
      if (!stakingToken || !rewardsToken || !address) return;
      
      const [balance, allowance, rewardsBalance] = await Promise.all([
        stakingToken.balanceOf(address),
        stakingToken.allowance(address, VAULT_CONTRACT_ADDRESS),
        rewardsToken.balanceOf(address)
      ]);
      
      setStakingTokenBalance(balance);
      setStakingTokenAllowance(allowance);
      setRewardsBalance(rewardsBalance);
    } catch (err: any) {
      console.error("Error fetching balances:", err);
      setError(err.message || "Error fetching balances");
    }
  }, [stakingToken, rewardsToken, address]);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchStakingOptions();
    fetchUserStakes();
    fetchBalancesAndAllowances();
  }, [fetchStakingOptions, fetchUserStakes, fetchBalancesAndAllowances]);

  useEffect(() => {
    if (vaultContract && stakingToken && rewardsToken && address) {
      refreshData();
    }
  }, [vaultContract, stakingToken, rewardsToken, address, refreshData]);

  // Staking functions
  const approveStaking = async (amount: ethers.BigNumber) => {
    try {
      if (!stakingToken || !address) return;
      
      const tx = await stakingToken.approve(VAULT_CONTRACT_ADDRESS, amount);
      await tx.wait();
      
      await fetchBalancesAndAllowances();
      return true;
    } catch (err: any) {
      console.error("Error approving tokens:", err);
      setError(err.message || "Error approving tokens");
      return false;
    }
  };

  const stakeTokens = async (amount: ethers.BigNumber, optionId: number) => {
    try {
      if (!vaultContract || !address) return;
      
      const tx = await vaultContract.stake(amount, optionId);
      await tx.wait();
      
      refreshData();
      return true;
    } catch (err: any) {
      console.error("Error staking tokens:", err);
      setError(err.message || "Error staking tokens");
      return false;
    }
  };

  const unstakeTokens = async (stakeId: number) => {
    try {
      if (!vaultContract || !address) return;
      
      const tx = await vaultContract.unstake(stakeId);
      await tx.wait();
      
      refreshData();
      return true;
    } catch (err: any) {
      console.error("Error unstaking tokens:", err);
      setError(err.message || "Error unstaking tokens");
      return false;
    }
  };

  const claimRewards = async (stakeId: number) => {
    try {
      if (!vaultContract || !address) return;
      
      const tx = await vaultContract.claimRewards(stakeId);
      await tx.wait();
      
      refreshData();
      return true;
    } catch (err: any) {
      console.error("Error claiming rewards:", err);
      setError(err.message || "Error claiming rewards");
      return false;
    }
  };

  return {
    provider,
    vaultContract,
    stakingToken,
    rewardsToken,
    loading,
    error,
    stakingOptions,
    userStakes,
    stakingTokenBalance,
    stakingTokenAllowance,
    rewardsBalance,
    networkCorrect,
    checkNetwork,
    refreshData,
    approveStaking,
    stakeTokens,
    unstakeTokens,
    claimRewards
  };
};