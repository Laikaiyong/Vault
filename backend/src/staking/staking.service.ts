import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StakingOption } from './entities/staking-option.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StakingOptionDto } from './dtos/staking-option.dto';
import { PoolInfoDto, UserStakeDto } from './dtos/pool-info.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StakingService {
  private readonly logger = new Logger(StakingService.name);

  constructor(
    @InjectRepository(StakingOption)
    private stakingOptionRepository: Repository<StakingOption>,
    private blockchainService: BlockchainService,
  ) {
    // Sync staking options on startup
    this.syncStakingOptions();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncStakingOptions() {
    try {
      this.logger.log('Syncing staking options from blockchain...');
      const blockchainOptions =
        await this.blockchainService.getStakingOptions();

      for (const option of blockchainOptions) {
        const existingOption = await this.stakingOptionRepository.findOne({
          where: { contractId: option.id },
        });

        if (existingOption) {
          // Update existing option
          await this.stakingOptionRepository.update(existingOption.id, {
            name: option.name,
            lockPeriodInDays: option.lockPeriodInDays,
            rewardRate: option.rewardRate,
            apy: option.apy,
            active: option.active,
          });
        } else {
          // Create new option
          await this.stakingOptionRepository.save({
            contractId: option.id,
            name: option.name,
            lockPeriodInDays: option.lockPeriodInDays,
            rewardRate: option.rewardRate,
            apy: option.apy,
            active: option.active,
          });
        }
      }
      this.logger.log('Staking options sync completed successfully');
    } catch (error) {
      this.logger.error('Error syncing staking options:', error);
    }
  }

  async getStakingOptions(): Promise<StakingOptionDto[]> {
    try {
      // Get cached options from database first
      let options = await this.stakingOptionRepository.find({
        where: { active: true },
        order: { lockPeriodInDays: 'ASC' },
      });

      // If no options in database, fetch from blockchain
      if (options.length === 0) {
        const blockchainOptions =
          await this.blockchainService.getStakingOptions();
        return blockchainOptions.filter((option) => option.active);
      }

      // Map database results to DTOs
      return options.map((option) => ({
        id: option.contractId,
        name: option.name,
        lockPeriodInDays: option.lockPeriodInDays,
        rewardRate: option.rewardRate,
        apy: option.apy,
        active: option.active,
      }));
    } catch (error) {
      this.logger.error('Error retrieving staking options:', error);
      throw error;
    }
  }

  async getPoolInfo(): Promise<PoolInfoDto> {
    try {
      const [
        totalStaked,
        minimumStake,
        tokensInfo,
        rewardsPaused,
        stakingOptions,
      ] = await Promise.all([
        this.blockchainService.getTotalStaked(),
        this.blockchainService.getMinimumStake(),
        this.blockchainService.getTokensInfo(),
        this.blockchainService.getRewardsPaused(),
        this.getStakingOptions(),
      ]);

      return {
        totalStaked,
        minimumStake,
        stakingToken: tokensInfo.stakingToken,
        rewardsToken: tokensInfo.rewardsToken,
        rewardsPaused,
        stakingOptions,
      };
    } catch (error) {
      this.logger.error('Error retrieving pool information:', error);
      throw error;
    }
  }

  async getUserStakes(address: string): Promise<UserStakeDto[]> {
    try {
      return await this.blockchainService.getUserStakes(address);
    } catch (error) {
      this.logger.error(`Error retrieving user stakes for ${address}:`, error);
      throw error;
    }
  }
}
