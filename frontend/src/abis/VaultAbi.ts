export const VaultAbi = [
    // Events
    "event Staked(address indexed user, uint256 amount, uint256 lockPeriodInDays, uint256 stakeId)",
    "event Unstaked(address indexed user, uint256 amount, uint256 stakeId)",
    "event RewardsClaimed(address indexed user, uint256 amount, uint256 stakeId)",
    "event StakingOptionAdded(uint256 id, string name, uint256 lockPeriodInDays, uint256 rewardRate)",
    "event StakingOptionUpdated(uint256 id, string name, uint256 lockPeriodInDays, uint256 rewardRate)",
    "event StakingOptionDeactivated(uint256 id)",
    "event RewardsPaused(bool isPaused)",
    "event MinimumStakeUpdated(uint256 newMinimum)",
    
    // View Functions
    "function stakingToken() external view returns (address)",
    "function rewardsToken() external view returns (address)",
    "function totalStaked() external view returns (uint256)",
    "function minimumStake() external view returns (uint256)",
    "function rewardsPaused() external view returns (bool)",
    "function userStakes(address, uint256) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
    "function stakingOptions(uint256) external view returns (uint256, string, uint256, uint256, bool)",
    "function getUserStakes(address _user) external view returns (tuple(uint256 amount, uint256 startTime, uint256 lockPeriodInDays, uint256 lockEndTime, uint256 rewardRate, uint256 lastClaimTime, bool active)[])",
    "function getStakingOptions() external view returns (tuple(uint256 id, string name, uint256 lockPeriodInDays, uint256 rewardRate, bool active)[])",
    "function calculateRewards(address _user, uint256 _stakeId) external view returns (uint256)",
    "function getAPY(uint256 _optionId) external view returns (uint256)",
    
    // State Changing Functions
    "function stake(uint256 _amount, uint256 _optionId) external",
    "function unstake(uint256 _stakeId) external",
    "function claimRewards(uint256 _stakeId) external",
    "function addStakingOption(string memory _name, uint256 _lockPeriodInDays, uint256 _rewardRate) external",
    "function updateStakingOption(uint256 _optionId, string memory _name, uint256 _lockPeriodInDays, uint256 _rewardRate) external",
    "function deactivateStakingOption(uint256 _optionId) external",
    "function setMinimumStake(uint256 _newMinimum) external",
    "function addRewards(uint256 _amount) external",
    "function checkAndUpdateRewardStatus() external",
    "function recoverToken(address _token) external"
  ];