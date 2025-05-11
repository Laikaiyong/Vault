import { formatDistance, formatDistanceToNow } from "date-fns";
import { UserStakeType } from "@/hooks/useContracts";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { ClaimIcon, UnstakeIcon } from "./icons";

interface UserStakesProps {
  stakes: UserStakeType[];
  loading: boolean;
  tokenSymbol: string;
  rewardSymbol: string;
  onClaimRewards: (stakeId: number) => Promise<boolean>;
  onUnstake: (stakeId: number) => Promise<boolean>;
  onSuccess: () => void;
}

const UserStakes = ({ 
  stakes, 
  loading, 
  tokenSymbol, 
  rewardSymbol,
  onClaimRewards, 
  onUnstake, 
  onSuccess 
}: UserStakesProps) => {
  const handleClaimRewards = async (stakeId: number) => {
    try {
      const success = await onClaimRewards(stakeId);
      if (success) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
    }
  };
  
  const handleUnstake = async (stakeId: number) => {
    try {
      const success = await onUnstake(stakeId);
      if (success) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error unstaking:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <motion.div 
          className="border-t-2 border-b-2 border-black h-12 w-12 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>
    );
  }

  if (stakes.length === 0) {
    return (
      <motion.div 
        className="minimalist-card p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p>You don't have any active stakes</p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto minimalist-card">
      <table className="min-w-full overflow-hidden">
        <thead className="bg-black text-white">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Rewards
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {stakes.map((stake, index) => {
              const now = Math.floor(Date.now() / 1000);
              const isLocked = stake.lockEndTime.gt(now) && stake.lockPeriodInDays.gt(0);
              const formattedAmount = ethers.utils.formatEther(stake.amount);
              const formattedRewards = stake.rewards ? ethers.utils.formatEther(stake.rewards) : "0";
              
              return (
                <motion.tr 
                  key={stake.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={index % 2 === 0 ? "bg-black/[0.02]" : "bg-white"}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formattedAmount} {tokenSymbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stake.lockPeriodInDays.eq(0) 
                      ? "Flexible" 
                      : `${stake.lockPeriodInDays.toString()} Days Lock`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stake.lockPeriodInDays.eq(0) ? (
                      <span className="text-green-600 font-medium">Flexible</span>
                    ) : isLocked ? (
                      <span className="text-orange-600 font-medium">
                        Locked for {formatDistanceToNow(stake.lockEndTime.toNumber() * 1000)}
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">Unlocked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formattedRewards} {rewardSymbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <motion.button
                      onClick={() => handleClaimRewards(stake.id)}
                      className="bg-black text-white hover:bg-black/80 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={stake.rewards?.eq(0)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <ClaimIcon className="h-4 w-4" />
                      Claim
                    </motion.button>
                    <motion.button
                      onClick={() => handleUnstake(stake.id)}
                      className="border border-black text-black hover:bg-black hover:text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLocked}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <UnstakeIcon className="h-4 w-4" />
                      Unstake
                    </motion.button>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};

export default UserStakes;