import { StakingOptionDto } from './staking-option.dto';

export class TokenInfoDto {
  address: string;
  symbol: string;
  decimals: number;
}

export class TotalStakedDto {
  amount: string;
  formatted: string;
}

export class PoolInfoDto {
  totalStaked: TotalStakedDto;
  minimumStake: TotalStakedDto;
  stakingToken: TokenInfoDto;
  rewardsToken: TokenInfoDto;
  rewardsPaused: boolean;
  stakingOptions: StakingOptionDto[];
}

export class UserStakeDto {
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
