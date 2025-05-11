import { StakingOptionType } from "@/hooks/useContracts";
import { LockIcon, UnlockIcon } from "@/components/icons";
import { motion } from "framer-motion";

interface StakingOptionsProps {
  options: StakingOptionType[];
  selectedOption: StakingOptionType | null;
  onSelectOption: (option: StakingOptionType) => void;
  loading: boolean;
}

const StakingOptions = ({ options, selectedOption, onSelectOption, loading }: StakingOptionsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="minimalist-card p-6 animate-pulse">
            <div className="h-6 bg-black/10 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-black/10 rounded w-2/4 mb-2"></div>
            <div className="h-4 bg-black/10 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="minimalist-card p-6 text-center">
        <p>No staking options available</p>
      </div>
    );
  }

  // Animation variants for staggered cards
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {options.map((option) => (
        <motion.div 
          key={option.id}
          onClick={() => onSelectOption(option)}
          className={`
            cursor-pointer p-6 transition-all rounded-lg
            ${selectedOption?.id === option.id 
              ? "border-2 border-black bg-black text-white" 
              : "minimalist-card hover:border-black/30"}
          `}
          variants={item}
          whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-medium">{option.name}</h3>
            {option.lockPeriodInDays === 0 ? (
              <UnlockIcon className="h-5 w-5" />
            ) : (
              <LockIcon className="h-5 w-5" />
            )}
          </div>
          <div className="text-3xl font-bold mb-2">
            {option.apy}
          </div>
          <div className="text-sm opacity-80">
            {option.lockPeriodInDays === 0 
              ? "No lock period, withdraw anytime" 
              : `Lock period: ${option.lockPeriodInDays} days`
            }
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StakingOptions;