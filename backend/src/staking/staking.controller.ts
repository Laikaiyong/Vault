import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { StakingService } from './staking.service';
import { StakingOptionDto } from './dtos/staking-option.dto';
import { PoolInfoDto, UserStakeDto } from './dtos/pool-info.dto';

@Controller('staking')
@UseInterceptors(CacheInterceptor)
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Get('options')
  @CacheTTL(60) // Cache results for 60 seconds
  async getStakingOptions(): Promise<StakingOptionDto[]> {
    return this.stakingService.getStakingOptions();
  }

  @Get('pool-info')
  @CacheTTL(60) // Cache results for 60 seconds
  async getPoolInfo(): Promise<PoolInfoDto> {
    return this.stakingService.getPoolInfo();
  }

  @Get('user/:address/stakes')
  async getUserStakes(
    @Param('address') address: string,
  ): Promise<UserStakeDto[]> {
    return this.stakingService.getUserStakes(address);
  }
}
