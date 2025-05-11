const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface StakingOptionAPI {
  id: number;
  name: string;
  lockPeriodInDays: number;
  rewardRate: string;
  apy: string;
  active: boolean;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface AmountInfo {
  amount: string;
  formatted: string;
}

export interface PoolInfo {
  totalStaked: AmountInfo;
  minimumStake: AmountInfo;
  stakingToken: TokenInfo;
  rewardsToken: TokenInfo;
  rewardsPaused: boolean;
  stakingOptions: StakingOptionAPI[];
}

export interface UserStake {
  id: number;
  amount: string;
  amountFormatted: string;
  startTime: number;
  lockPeriodInDays: number;
  lockEndTime: number;
  rewardRate: string;
  lastClaimTime: number;
  active: boolean;
  rewards: string;
  rewardsFormatted: string;
}

// Helper function for API requests with error handling
async function apiRequest<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  async getStakingOptions(): Promise<StakingOptionAPI[]> {
    return apiRequest<StakingOptionAPI[]>("/staking/options");
  },

  async getPoolInfo(): Promise<PoolInfo> {
    return apiRequest<PoolInfo>("/staking/pool-info");
  },

  async getUserStakes(address: string): Promise<UserStake[]> {
    return apiRequest<UserStake[]>(`/staking/user/${address}/stakes`);
  },
};
