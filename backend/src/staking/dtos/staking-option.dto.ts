import { IsNumber, IsString, IsBoolean } from 'class-validator';

export class StakingOptionDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsNumber()
  lockPeriodInDays: number;

  @IsString()
  rewardRate: string;

  @IsString()
  apy: string;

  @IsBoolean()
  active: boolean;
}
