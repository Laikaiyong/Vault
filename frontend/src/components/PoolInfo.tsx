import { PoolInfo as PoolInfoType } from '@/services/api.service';

interface PoolInfoProps {
  poolInfo: PoolInfoType;
}

const PoolInfo = ({ poolInfo }: PoolInfoProps) => {
  return (
    <div className="minimalist-card p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-white/60">Total Staked</p>
          <p className="text-2xl font-bold">
            {poolInfo.totalStaked.formatted} {poolInfo.stakingToken.symbol}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-white/60">Minimum Stake</p>
          <p className="text-2xl font-bold">
            {poolInfo.minimumStake.formatted} {poolInfo.stakingToken.symbol}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-white/60">Rewards Status</p>
          <p className={`text-lg font-semibold ${poolInfo.rewardsPaused ? "text-red-400" : "text-green-400"}`}>
            {poolInfo.rewardsPaused ? "Paused" : "Active"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoolInfo;