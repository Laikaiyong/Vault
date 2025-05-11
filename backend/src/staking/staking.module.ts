import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StakingController } from './staking.controller';
import { StakingService } from './staking.service';
import { StakingOption } from './entities/staking-option.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [TypeOrmModule.forFeature([StakingOption]), BlockchainModule],
  controllers: [StakingController],
  providers: [StakingService],
})
export class StakingModule {}
