// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token being staked
    IERC20 public stakingToken;
    // Token for rewards
    IERC20 public rewardsToken;

    // Staking option details
    struct StakingOption {
        uint256 id;
        string name;
        uint256 lockPeriodInDays;
        uint256 rewardRate; // Expressed as reward per token per second (multiplied by 1e12 for precision)
        bool active;
    }
    
    // Stake details
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriodInDays;
        uint256 lockEndTime;
        uint256 rewardRate;
        uint256 lastClaimTime;
        bool active;
    }

    // User stake tracking
    mapping(address => Stake[]) public userStakes;
    // Available staking options
    StakingOption[] public stakingOptions;
    
    // Total staked amount
    uint256 public totalStaked;
    // Minimum staking amount
    uint256 public minimumStake;
    // Flag to indicate if reward accrual is paused due to insufficient rewards
    bool public rewardsPaused;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriodInDays, uint256 stakeId);
    event Unstaked(address indexed user, uint256 amount, uint256 stakeId);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 stakeId);
    event StakingOptionAdded(uint256 id, string name, uint256 lockPeriodInDays, uint256 rewardRate);
    event StakingOptionUpdated(uint256 id, string name, uint256 lockPeriodInDays, uint256 rewardRate);
    event StakingOptionDeactivated(uint256 id);
    event RewardsPaused(bool isPaused);
    event MinimumStakeUpdated(uint256 newMinimum);
    
    constructor(address _stakingToken, address _rewardsToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        minimumStake = 1 * 10**18; // Default 1 token minimum
        
        // Initialize with default staking options
        _addStakingOption("Flexible", 0, 35 * 10**8); // 3.5% APY converted to per-second rate * 1e12
        _addStakingOption("30 Days Lock", 30, 55 * 10**8); // 5.5% APY
        _addStakingOption("60 Days Lock", 60, 82 * 10**8); // 8.2% APY
        _addStakingOption("90 Days Lock", 90, 120 * 10**8); // 12% APY
    }
    
    /**
     * @dev Add a new staking option
     * @param _name Name of the staking option
     * @param _lockPeriodInDays Lock period in days (0 for flexible)
     * @param _rewardRate Reward rate per token per second (multiplied by 1e12)
     */
    function addStakingOption(
        string memory _name,
        uint256 _lockPeriodInDays,
        uint256 _rewardRate
    ) external onlyOwner {
        _addStakingOption(_name, _lockPeriodInDays, _rewardRate);
    }
    
    /**
     * @dev Internal function to add staking option
     */
    function _addStakingOption(
        string memory _name,
        uint256 _lockPeriodInDays,
        uint256 _rewardRate
    ) internal {
        uint256 id = stakingOptions.length;
        stakingOptions.push(
            StakingOption({
                id: id,
                name: _name,
                lockPeriodInDays: _lockPeriodInDays,
                rewardRate: _rewardRate,
                active: true
            })
        );
        emit StakingOptionAdded(id, _name, _lockPeriodInDays, _rewardRate);
    }
    
    /**
     * @dev Update an existing staking option
     * @param _optionId ID of the staking option to update
     * @param _name New name
     * @param _lockPeriodInDays New lock period
     * @param _rewardRate New reward rate
     */
    function updateStakingOption(
        uint256 _optionId,
        string memory _name,
        uint256 _lockPeriodInDays,
        uint256 _rewardRate
    ) external onlyOwner {
        require(_optionId < stakingOptions.length, "Invalid option ID");
        StakingOption storage option = stakingOptions[_optionId];
        option.name = _name;
        option.lockPeriodInDays = _lockPeriodInDays;
        option.rewardRate = _rewardRate;
        emit StakingOptionUpdated(_optionId, _name, _lockPeriodInDays, _rewardRate);
    }
    
    /**
     * @dev Deactivate a staking option (cannot be used for new stakes)
     * @param _optionId ID of the option to deactivate
     */
    function deactivateStakingOption(uint256 _optionId) external onlyOwner {
        require(_optionId < stakingOptions.length, "Invalid option ID");
        require(stakingOptions[_optionId].active, "Option already deactivated");
        stakingOptions[_optionId].active = false;
        emit StakingOptionDeactivated(_optionId);
    }
    
    /**
     * @dev Stake tokens
     * @param _amount Amount to stake
     * @param _optionId Selected staking option ID
     */
    function stake(uint256 _amount, uint256 _optionId) external nonReentrant {
        require(_amount >= minimumStake, "Amount below minimum stake");
        require(_optionId < stakingOptions.length, "Invalid option ID");
        require(stakingOptions[_optionId].active, "Staking option not active");
        
        StakingOption memory option = stakingOptions[_optionId];
        
        // Transfer tokens from user to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Calculate lock end time
        uint256 lockEndTime = 0;
        if (option.lockPeriodInDays > 0) {
            lockEndTime = block.timestamp + option.lockPeriodInDays * 1 days;
        }
        
        // Create new stake
        userStakes[msg.sender].push(
            Stake({
                amount: _amount,
                startTime: block.timestamp,
                lockPeriodInDays: option.lockPeriodInDays,
                lockEndTime: lockEndTime,
                rewardRate: option.rewardRate,
                lastClaimTime: block.timestamp,
                active: true
            })
        );
        
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount, option.lockPeriodInDays, userStakes[msg.sender].length - 1);
    }
    
    /**
     * @dev Unstake tokens
     * @param _stakeId ID of the stake to unstake
     */
    function unstake(uint256 _stakeId) external nonReentrant {
        Stake[] storage userStakeList = userStakes[msg.sender];
        require(_stakeId < userStakeList.length, "Invalid stake ID");
        
        Stake storage userStake = userStakeList[_stakeId];
        require(userStake.active, "Stake already withdrawn");
        
        // Check if lock period has ended
        if (userStake.lockEndTime > 0) {
            require(block.timestamp >= userStake.lockEndTime, "Lock period not ended");
        }
        
        // Calculate rewards before modifying the stake
        uint256 rewards = calculateRewards(msg.sender, _stakeId);
        
        // Mark stake as inactive and update total staked
        uint256 amount = userStake.amount;
        userStake.active = false;
        totalStaked -= amount;
        
        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount, _stakeId);
        
        // Automatically claim rewards if any
        if (rewards > 0 && rewardsToken.balanceOf(address(this)) >= rewards) {
            // Update last claim time
            userStake.lastClaimTime = block.timestamp;
            
            // Transfer rewards to user
            rewardsToken.safeTransfer(msg.sender, rewards);
            
            emit RewardsClaimed(msg.sender, rewards, _stakeId);
        }
    }
    
    /**
    * @dev Claim rewards for a specific stake
    * @param _stakeId ID of the stake to claim rewards for
    */
    function claimRewards(uint256 _stakeId) public nonReentrant {
        Stake[] storage userStakeList = userStakes[msg.sender];
        require(_stakeId < userStakeList.length, "Invalid stake ID");
        
        Stake storage userStake = userStakeList[_stakeId];
        
        // Calculate rewards
        uint256 rewards = calculateRewards(msg.sender, _stakeId);
        
        // Check for zero rewards using require statement for consistent reversion
        require(rewards > 0, "No rewards to claim");
        
        require(rewardsToken.balanceOf(address(this)) >= rewards, "Insufficient rewards in contract");
        
        // Update last claim time
        userStake.lastClaimTime = block.timestamp;
        
        // Transfer rewards to user
        rewardsToken.safeTransfer(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, rewards, _stakeId);
    }
    
    /**
     * @dev Calculate rewards for a stake
     * @param _user Address of the user
     * @param _stakeId ID of the stake
     * @return uint256 Amount of rewards
     */
    function calculateRewards(address _user, uint256 _stakeId) public view returns (uint256) {
        Stake[] memory userStakeList = userStakes[_user];
        if (_stakeId >= userStakeList.length) {
            return 0; // Invalid stake ID
        }
        
        Stake memory userStake = userStakeList[_stakeId];
        if (!userStake.active && userStake.lastClaimTime >= userStake.startTime) {
            // If stake has been withdrawn and rewards have been claimed at unstaking
            return 0;
        }
        
        if (rewardsPaused) {
            return 0; // Rewards are paused
        }
        
        // Calculate rewards based on time elapsed since last claim
        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        
        // If time elapsed is 0, no rewards
        if (timeElapsed == 0) {
            return 0;
        }
        
        uint256 reward = (userStake.amount * userStake.rewardRate * timeElapsed) / (365 days * 10**12);
        return reward;
    }
    
    /**
     * @dev Get all stakes for a user
     * @param _user Address of the user
     * @return Stake[] Array of user's stakes
     */
    function getUserStakes(address _user) external view returns (Stake[] memory) {
        return userStakes[_user];
    }
    
    /**
     * @dev Get all available staking options
     * @return StakingOption[] Array of staking options
     */
    function getStakingOptions() external view returns (StakingOption[] memory) {
        return stakingOptions;
    }
    
    /**
     * @dev Update minimum stake amount
     * @param _newMinimum New minimum stake amount
     */
    function setMinimumStake(uint256 _newMinimum) external onlyOwner {
        minimumStake = _newMinimum;
        emit MinimumStakeUpdated(_newMinimum);
    }
    
    /**
     * @dev Add rewards to the contract
     * @param _amount Amount of reward tokens to add
     */
    function addRewards(uint256 _amount) external {
        rewardsToken.safeTransferFrom(msg.sender, address(this), _amount);
        if (rewardsPaused && rewardsToken.balanceOf(address(this)) > 0) {
            rewardsPaused = false;
            emit RewardsPaused(false);
        }
    }
    
    /**
     * @dev Check if rewards are sufficient and pause/resume reward accrual
     * Can be called by anyone to update the reward status
     */
    function checkAndUpdateRewardStatus() external {
        bool shouldBePaused = rewardsToken.balanceOf(address(this)) == 0;
        if (rewardsPaused != shouldBePaused) {
            rewardsPaused = shouldBePaused;
            emit RewardsPaused(shouldBePaused);
        }
    }
    
    /**
     * @dev Get APY for a staking option
     * Converts the per-second rate to APY for frontend display
     * @param _optionId ID of the staking option
     * @return uint256 APY in basis points (1% = 100)
     */
    function getAPY(uint256 _optionId) external view returns (uint256) {
        require(_optionId < stakingOptions.length, "Invalid option ID");
        StakingOption memory option = stakingOptions[_optionId];
        
        // Convert the per-second rate back to APY
        // APY = (1 + rate/10^12)^(seconds in year) - 1
        // Using a simplified calculation for gas efficiency
        uint256 apy = (option.rewardRate * 365 days) / 10**10;
        return apy; // Returns APY in basis points (e.g., 350 for 3.5%)
    }
    
    /**
     * @dev Emergency function to recover any tokens accidentally sent to the contract
     * @param _token Address of the token to recover
     */
    function recoverToken(address _token) external onlyOwner {
        require(
            _token != address(stakingToken) || totalStaked == 0,
            "Cannot recover staking tokens with active stakes"
        );
        
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (_token == address(rewardsToken)) {
            // If recovering reward tokens, ensure we keep track of reward status
            rewardsPaused = true;
            emit RewardsPaused(true);
        }
        
        token.safeTransfer(owner(), balance);
    }
}