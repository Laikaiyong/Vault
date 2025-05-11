import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staking_options')
export class StakingOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contractId: number;

  @Column()
  name: string;

  @Column()
  lockPeriodInDays: number;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  rewardRate: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  apy: string;

  @Column()
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
