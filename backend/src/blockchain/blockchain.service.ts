import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { VaultAbi } from './abi/vault.abi';
import { ERC20Abi } from './abi/erc20.abi';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.providers.Provider;
  private vaultContract: ethers.Contract;
  private stakingTokenContract: ethers.Contract;
  private rewardsTokenContract: ethers.Contract;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize provider using RPC URL from config
      const rpcUrl = this.configService.get<string>('blockchain.rpcUrl');
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Initialize contract instances using addresses from config
      const vaultAddress = this.configService.get<string>(
        'blockchain.vaultContractAddress',
      );
      const stakingTokenAddress = this.configService.get<string>(
        'blockchain.stakingTokenAddress',
      );
      const rewardsTokenAddress = this.configService.get<string>(
        'blockchain.rewardsTokenAddress',
      );

      this.vaultContract = new ethers.Contract(
        vaultAddress,
        VaultAbi,
        this.provider,
      );
      this.stakingTokenContract = new ethers.Contract(
        stakingTokenAddress,
        ERC20Abi,
        this.provider,
      );
      this.rewardsTokenContract = new ethers.Contract(
        rewardsTokenAddress,
        ERC20Abi,
        this.provider,
      );

      this.logger.log('Blockchain service initialized successfully');
      this.logger.log(`Vault contract address: ${vaultAddress}`);
    } catch (error) {
      this.logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async getStakingOptions() {
    try {
      const options = await this.vaultContract.getStakingOptions();
      return Promise.all(
        options.map(async (option: any) => {
          const apyBasisPoints = await this.vaultContract.getAPY(option.id);
          const apy = (Number(apyBasisPoints) / 100).toFixed(2);

          return {
            id: option.id.toNumber(),
            name: option.name,
            lockPeriodInDays: option.lockPeriodInDays.toNumber(),
            rewardRate: option.rewardRate.toString(),
            apy,
            active: option.active,
          };
        }),
      );
    } catch (error) {
      this.logger.error('Error fetching staking options:', error);
      throw error;
    }
  }

  async getTotalStaked() {
    try {
      const totalStaked = await this.vaultContract.totalStaked();
      return {
        amount: totalStaked.toString(),
        formatted: ethers.utils.formatEther(totalStaked),
      };
    } catch (error) {
      this.logger.error('Error fetching total staked amount:', error);
      throw error;
    }
  }

  async getMinimumStake() {
    try {
      const minimumStake = await this.vaultContract.minimumStake();
      return {
        amount: minimumStake.toString(),
        formatted: ethers.utils.formatEther(minimumStake),
      };
    } catch (error) {
      this.logger.error('Error fetching minimum stake amount:', error);
      throw error;
    }
  }

  async getRewardsPaused() {
    try {
      return await this.vaultContract.rewardsPaused();
    } catch (error) {
      this.logger.error('Error checking if rewards are paused:', error);
      throw error;
    }
  }

  async getTokensInfo() {
    try {
      const [stakingSymbol, rewardsSymbol, stakingDecimals, rewardsDecimals] =
        await Promise.all([
          this.stakingTokenContract.symbol(),
          this.rewardsTokenContract.symbol(),
          this.stakingTokenContract.decimals(),
          this.rewardsTokenContract.decimals(),
        ]);

      return {
        stakingToken: {
          address: this.stakingTokenContract.address,
          symbol: stakingSymbol,
          decimals: stakingDecimals,
        },
        rewardsToken: {
          address: this.rewardsTokenContract.address,
          symbol: rewardsSymbol,
          decimals: rewardsDecimals,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching token info:', error);
      throw error;
    }
  }

  async getUserStakes(address: string) {
    try {
      const stakes = await this.vaultContract.getUserStakes(address);

      return Promise.all(
        stakes.map(async (stake: any, index: number) => {
          const rewards = stake.active
            ? await this.vaultContract.calculateRewards(address, index)
            : ethers.BigNumber.from(0);

          return {
            id: index,
            amount: stake.amount.toString(),
            amountFormatted: ethers.utils.formatEther(stake.amount),
            startTime: stake.startTime.toNumber(),
            lockPeriodInDays: stake.lockPeriodInDays.toNumber(),
            lockEndTime: stake.lockEndTime.toNumber(),
            rewardRate: stake.rewardRate.toString(),
            lastClaimTime: stake.lastClaimTime.toNumber(),
            active: stake.active,
            rewards: rewards.toString(),
            rewardsFormatted: ethers.utils.formatEther(rewards),
          };
        }),
      );
    } catch (error) {
      this.logger.error(`Error fetching stakes for user ${address}:`, error);
      throw error;
    }
  }
}
