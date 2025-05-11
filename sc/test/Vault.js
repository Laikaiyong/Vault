const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Vault Contract", function () {
  let vault;
  let stakingToken;
  let rewardsToken;
  let owner;
  let user1;
  let user2;
  let addrs;

  const ONE_DAY = 86400; // 24 hours in seconds
  const MINIMUM_STAKE = ethers.parseEther("1"); // 1 token
  const STAKE_AMOUNT = ethers.parseEther("100"); // 100 tokens
  const REWARDS_AMOUNT = ethers.parseEther("10000"); // 10,000 tokens for rewards

  before(async function () {
    [owner, user1, user2, ...addrs] = await ethers.getSigners();
  });

  beforeEach(async function () {
    // Deploy the test tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    stakingToken = await TestToken.deploy();
    rewardsToken = await TestToken.deploy();

    // Deploy the vault contract
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(await stakingToken.getAddress(), await rewardsToken.getAddress());

    // Transfer tokens to users
    await stakingToken.mint(user1.address, STAKE_AMOUNT * 10n);
    await stakingToken.mint(user2.address, STAKE_AMOUNT * 10n);
    
    // Transfer rewards to owner for later distribution
    await rewardsToken.mint(owner.address, REWARDS_AMOUNT * 10n);
    
    // Approve vault to spend tokens
    await stakingToken.connect(user1).approve(await vault.getAddress(), STAKE_AMOUNT * 10n);
    await stakingToken.connect(user2).approve(await vault.getAddress(), STAKE_AMOUNT * 10n);
    await rewardsToken.connect(owner).approve(await vault.getAddress(), REWARDS_AMOUNT * 10n);
    
    // Add initial rewards to the vault
    await vault.connect(owner).addRewards(REWARDS_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should set the correct tokens", async function () {
      expect(await vault.stakingToken()).to.equal(await stakingToken.getAddress());
      expect(await vault.rewardsToken()).to.equal(await rewardsToken.getAddress());
    });

    it("Should initialize with the correct minimum stake", async function () {
      expect(await vault.minimumStake()).to.equal(MINIMUM_STAKE);
    });

    it("Should initialize with the correct staking options", async function () {
      const options = await vault.getStakingOptions();
      expect(options.length).to.equal(4);
      
      // Check flexible option
      expect(options[0].name).to.equal("Flexible");
      expect(options[0].lockPeriodInDays).to.equal(0);
      expect(options[0].rewardRate).to.equal(35n * 10n**8n);
      expect(options[0].active).to.equal(true);
      
      // Check 90-day option
      expect(options[3].name).to.equal("90 Days Lock");
      expect(options[3].lockPeriodInDays).to.equal(90);
      expect(options[3].active).to.equal(true);
    });
  });

  describe("Staking Options Management", function () {
    it("Should allow owner to add a new staking option", async function () {
      await vault.connect(owner).addStakingOption("180 Days Lock", 180, 150n * 10n**8n);
      
      const options = await vault.getStakingOptions();
      expect(options.length).to.equal(5);
      
      const newOption = options[4];
      expect(newOption.name).to.equal("180 Days Lock");
      expect(newOption.lockPeriodInDays).to.equal(180);
      expect(newOption.rewardRate).to.equal(150n * 10n**8n);
      expect(newOption.active).to.equal(true);
    });

    it("Should allow owner to update a staking option", async function () {
      await vault.connect(owner).updateStakingOption(1, "45 Days Lock", 45, 65n * 10n**8n);
      
      const options = await vault.getStakingOptions();
      const updatedOption = options[1];
      
      expect(updatedOption.name).to.equal("45 Days Lock");
      expect(updatedOption.lockPeriodInDays).to.equal(45);
      expect(updatedOption.rewardRate).to.equal(65n * 10n**8n);
    });

    it("Should allow owner to deactivate a staking option", async function () {
      await vault.connect(owner).deactivateStakingOption(2);
      
      const options = await vault.getStakingOptions();
      expect(options[2].active).to.equal(false);
    });

    it("Should prevent non-owners from managing staking options", async function () {
      await expect(
        vault.connect(user1).addStakingOption("New Option", 120, 100n * 10n**8n)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      
      await expect(
        vault.connect(user1).updateStakingOption(0, "Modified", 15, 25n * 10n**8n)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      
      await expect(
        vault.connect(user1).deactivateStakingOption(0)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(1);
      expect(userStakes[0].amount).to.equal(STAKE_AMOUNT);
      expect(userStakes[0].active).to.equal(true);
      
      expect(await vault.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("Should fail when staking below minimum amount", async function () {
      const belowMinimum = ethers.parseEther("0.5");
      await expect(
        vault.connect(user1).stake(belowMinimum, 0)
      ).to.be.revertedWith("Amount below minimum stake");
    });

    it("Should fail when staking with invalid option ID", async function () {
      await expect(
        vault.connect(user1).stake(STAKE_AMOUNT, 99)
      ).to.be.revertedWith("Invalid option ID");
    });

    it("Should fail when staking with deactivated option", async function () {
      await vault.connect(owner).deactivateStakingOption(0);
      
      await expect(
        vault.connect(user1).stake(STAKE_AMOUNT, 0)
      ).to.be.revertedWith("Staking option not active");
    });

    it("Should correctly set lock period end time", async function () {
      // Stake with 30-day lock option (index 1)
      await vault.connect(user1).stake(STAKE_AMOUNT, 1);
      
      const userStakes = await vault.getUserStakes(user1.address);
      const lockEndTime = userStakes[0].lockEndTime;
      const expectedEndTime = BigInt(await time.latest()) + BigInt(30 * ONE_DAY);
      
      // Allow for small timestamp variation
      expect(lockEndTime).to.be.closeTo(expectedEndTime, 5n);
    });
  });

  describe("Unstaking", function () {
    it("Should allow unstaking tokens with flexible option", async function () {
      // Stake with flexible option (index 0)
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Get initial balances
      const initialBalance = await stakingToken.balanceOf(user1.address);
      
      // Need to wait a short period for rewards to accrue
      await time.increase(1); // Increase by 1 second
      
      // Unstake
      await vault.connect(user1).unstake(0);
      
      // Check user received tokens back
      const finalBalance = await stakingToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(STAKE_AMOUNT);
      
      // Check stake marked as inactive
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes[0].active).to.equal(false);
      
      // Check total staked decreased
      expect(await vault.totalStaked()).to.equal(0);
    });

    it("Should prevent unstaking before lock period ends", async function () {
      // Stake with 30-day lock option (index 1)
      await vault.connect(user1).stake(STAKE_AMOUNT, 1);
      
      // Try to unstake immediately
      await expect(
        vault.connect(user1).unstake(0)
      ).to.be.revertedWith("Lock period not ended");
      
      // Fast forward 15 days (still locked)
      await time.increase(15 * ONE_DAY);
      
      await expect(
        vault.connect(user1).unstake(0)
      ).to.be.revertedWith("Lock period not ended");
    });

    it("Should allow unstaking after lock period ends", async function () {
      // Stake with 30-day lock option (index 1)
      await vault.connect(user1).stake(STAKE_AMOUNT, 1);
      
      // Fast forward 31 days plus a bit for rewards
      await time.increase(31 * ONE_DAY + 10);
      
      // Should allow unstaking now
      await vault.connect(user1).unstake(0);
      
      // Check stake marked as inactive
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes[0].active).to.equal(false);
    });

    it("Should prevent unstaking an invalid stake ID", async function () {
      await expect(
        vault.connect(user1).unstake(0)
      ).to.be.revertedWith("Invalid stake ID");
    });

    it("Should prevent unstaking an already unstaked position", async function () {
      // Stake with flexible option
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Need to wait a short period for rewards to accrue
      await time.increase(1); // Increase by 1 second
      
      // Unstake
      await vault.connect(user1).unstake(0);
      
      // Try to unstake again
      await expect(
        vault.connect(user1).unstake(0)
      ).to.be.revertedWith("Stake already withdrawn");
    });
  });

  describe("Rewards", function () {
    it("Should accrue rewards over time", async function () {
      // Stake with flexible option (index 0)
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Fast forward 30 days
      await time.increase(30 * ONE_DAY);
      
      // Calculate expected rewards
      // Flexible has 3.5% APY = 35 * 10^8 reward rate
      const rewards = await vault.calculateRewards(user1.address, 0);
      
      // Verify rewards are non-zero
      expect(rewards).to.be.gt(0);
      
      // Manually calculate approximate rewards for validation
      // reward = amount * rewardRate * timeElapsed / (365 days * 10^12)
      const rewardRate = 35n * 10n**8n;
      const timeElapsed = BigInt(30 * ONE_DAY);
      const expectedRewardApprox = (STAKE_AMOUNT * rewardRate * timeElapsed) / (365n * BigInt(ONE_DAY) * 10n**12n);
      
      // Allow small rounding differences
      expect(rewards).to.be.closeTo(expectedRewardApprox, ethers.parseEther("0.01"));
    });

    it("Should allow claiming rewards", async function () {
      // Stake with flexible option (index 0)
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Fast forward 30 days
      await time.increase(30 * ONE_DAY);
      
      // Get expected rewards
      const expectedRewards = await vault.calculateRewards(user1.address, 0);
      
      // Initial balance
      const initialBalance = await rewardsToken.balanceOf(user1.address);
      
      // Claim rewards
      await vault.connect(user1).claimRewards(0);
      
      // Check rewards received
      const finalBalance = await rewardsToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.be.closeTo(expectedRewards, ethers.parseEther("0.0001"));
      
      // Check lastClaimTime updated
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes[0].lastClaimTime).to.be.closeTo(BigInt(await time.latest()), 5n);
    });

    it("Should correctly calculate rewards for different options", async function () {
      // Stake with all options
      await vault.connect(user1).stake(STAKE_AMOUNT, 0); // Flexible - 3.5% APY
      await vault.connect(user1).stake(STAKE_AMOUNT, 1); // 30 Days - 5.5% APY
      await vault.connect(user1).stake(STAKE_AMOUNT, 2); // 60 Days - 8.2% APY
      await vault.connect(user1).stake(STAKE_AMOUNT, 3); // 90 Days - 12% APY
      
      // Fast forward 30 days
      await time.increase(30 * ONE_DAY);
      
      // Calculate rewards for each
      const rewardsFlexible = await vault.calculateRewards(user1.address, 0);
      const rewards30Days = await vault.calculateRewards(user1.address, 1);
      const rewards60Days = await vault.calculateRewards(user1.address, 2);
      const rewards90Days = await vault.calculateRewards(user1.address, 3);
      
      // Higher lock period should give higher rewards
      expect(rewards90Days).to.be.gt(rewards60Days);
      expect(rewards60Days).to.be.gt(rewards30Days);
      expect(rewards30Days).to.be.gt(rewardsFlexible);
    });

    it("Should automatically claim rewards when unstaking", async function () {
      // Stake with flexible option (index 0)
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Fast forward 30 days
      await time.increase(30 * ONE_DAY);
      
      // Get expected rewards
      const expectedRewards = await vault.calculateRewards(user1.address, 0);
      
      // Initial balance
      const initialRewardsBalance = await rewardsToken.balanceOf(user1.address);
      
      // Unstake (should auto-claim rewards)
      await vault.connect(user1).unstake(0);
      
      // Check rewards received
      const finalRewardsBalance = await rewardsToken.balanceOf(user1.address);
      expect(finalRewardsBalance - initialRewardsBalance).to.be.closeTo(expectedRewards, ethers.parseEther("0.0001"));
    });
  });

  describe("APY Calculation", function () {
    it("Should correctly convert reward rate to APY", async function () {
      // Calculate expected APY values based on the contract logic
      // APY = (rate * 365 days) / 10^10
      
      // Flexible option (index 0) - 35 * 10^8 reward rate
      const apyFlexible = await vault.getAPY(0);
      const expectedApyFlexible = (35n * 10n**8n * 365n * 24n * 60n * 60n) / 10n**10n;
      expect(apyFlexible).to.be.closeTo(expectedApyFlexible, 1n);
      
      // 30 Days option (index 1) - 55 * 10^8 reward rate
      const apy30Days = await vault.getAPY(1);
      const expectedApy30Days = (55n * 10n**8n * 365n * 24n * 60n * 60n) / 10n**10n;
      expect(apy30Days).to.be.closeTo(expectedApy30Days, 1n);
      
      // 90 Days option (index 3) - 120 * 10^8 reward rate
      const apy90Days = await vault.getAPY(3);
      const expectedApy90Days = (120n * 10n**8n * 365n * 24n * 60n * 60n) / 10n**10n;
      expect(apy90Days).to.be.closeTo(expectedApy90Days, 1n);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set minimum stake", async function () {
      const newMinimum = ethers.parseEther("5");
      await vault.connect(owner).setMinimumStake(newMinimum);
      
      expect(await vault.minimumStake()).to.equal(newMinimum);
      
      // Try staking below new minimum
      await expect(
        vault.connect(user1).stake(ethers.parseEther("3"), 0)
      ).to.be.revertedWith("Amount below minimum stake");
    });

    it("Should allow owner to add more rewards", async function () {
      const initialRewardsBalance = await rewardsToken.balanceOf(await vault.getAddress());
      const additionalRewards = ethers.parseEther("5000");
      
      await vault.connect(owner).addRewards(additionalRewards);
      
      const finalRewardsBalance = await rewardsToken.balanceOf(await vault.getAddress());
      expect(finalRewardsBalance - initialRewardsBalance).to.equal(additionalRewards);
    });

    it("Should allow anyone to check and update reward status", async function () {
      // Initially rewards are not paused
      expect(await vault.rewardsPaused()).to.equal(false);
      
      // Remove all rewards
      await vault.connect(owner).recoverToken(await rewardsToken.getAddress());
      
      // Update reward status
      await vault.connect(user1).checkAndUpdateRewardStatus();
      
      // Rewards should now be paused
      expect(await vault.rewardsPaused()).to.equal(true);
      
      // Add rewards back
      await vault.connect(owner).addRewards(REWARDS_AMOUNT);
      
      // Rewards should be automatically unpaused
      expect(await vault.rewardsPaused()).to.equal(false);
    });

    it("Should allow owner to recover tokens", async function () {
      // Send some tokens directly to the contract
      const tokenAmount = ethers.parseEther("100");
      await rewardsToken.connect(owner).transfer(await vault.getAddress(), tokenAmount);
      
      // Record initial balance
      const initialBalance = await rewardsToken.balanceOf(owner.address);
      
      // Get current contract balance before recovery
      const contractBalance = await rewardsToken.balanceOf(await vault.getAddress());
      
      // Recover tokens
      await vault.connect(owner).recoverToken(await rewardsToken.getAddress());
      
      // Check tokens were recovered
      const finalBalance = await rewardsToken.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.be.closeTo(contractBalance, ethers.parseEther("0.001"));
      
      // Rewards should be paused
      expect(await vault.rewardsPaused()).to.equal(true);
    });

    it("Should prevent recovering staking tokens with active stakes", async function () {
      // Stake some tokens
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Try to recover staking tokens
      await expect(
        vault.connect(owner).recoverToken(await stakingToken.getAddress())
      ).to.be.revertedWith("Cannot recover staking tokens with active stakes");
    });
  });

  describe("Multiple Users and Stakes", function () {
    it("Should handle multiple users staking separately", async function () {
      // User 1 stakes
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // User 2 stakes
      await vault.connect(user2).stake(STAKE_AMOUNT * 2n, 2);
      
      // Check total staked
      expect(await vault.totalStaked()).to.equal(STAKE_AMOUNT * 3n);
      
      // Check individual stakes
      const user1Stakes = await vault.getUserStakes(user1.address);
      const user2Stakes = await vault.getUserStakes(user2.address);
      
      expect(user1Stakes.length).to.equal(1);
      expect(user1Stakes[0].amount).to.equal(STAKE_AMOUNT);
      
      expect(user2Stakes.length).to.equal(1);
      expect(user2Stakes[0].amount).to.equal(STAKE_AMOUNT * 2n);
    });

    it("Should handle multiple stakes from the same user", async function () {
      // Multiple stakes with different options
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      await vault.connect(user1).stake(STAKE_AMOUNT / 2n, 1);
      await vault.connect(user1).stake(STAKE_AMOUNT * 2n, 3);
      
      // Check user stakes
      const userStakes = await vault.getUserStakes(user1.address);
      
      expect(userStakes.length).to.equal(3);
      expect(userStakes[0].amount).to.equal(STAKE_AMOUNT);
      expect(userStakes[1].amount).to.equal(STAKE_AMOUNT / 2n);
      expect(userStakes[2].amount).to.equal(STAKE_AMOUNT * 2n);
      
      // Different lock periods should be set correctly
      expect(userStakes[0].lockPeriodInDays).to.equal(0);
      expect(userStakes[1].lockPeriodInDays).to.equal(30);
      expect(userStakes[2].lockPeriodInDays).to.equal(90);
    });

    it("Should handle unstaking one of multiple stakes", async function () {
      // Create 3 stakes with flexible option
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      await vault.connect(user1).stake(STAKE_AMOUNT * 2n, 0);
      await vault.connect(user1).stake(STAKE_AMOUNT / 2n, 0);
      
      const totalStaked = STAKE_AMOUNT + (STAKE_AMOUNT * 2n) + (STAKE_AMOUNT / 2n);
      expect(await vault.totalStaked()).to.equal(totalStaked);
      
      // Need to wait a short period for rewards to accrue
      await time.increase(1);
      
      // Unstake the middle one
      await vault.connect(user1).unstake(1);
      
      // Check stakes status
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes[0].active).to.equal(true);
      expect(userStakes[1].active).to.equal(false);
      expect(userStakes[2].active).to.equal(true);
      
      // Check total staked decreased correctly
      expect(await vault.totalStaked()).to.equal(totalStaked - (STAKE_AMOUNT * 2n));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle staking zero tokens gracefully", async function () {
      await expect(
        vault.connect(user1).stake(0, 0)
      ).to.be.revertedWith("Amount below minimum stake");
    });

    it("Should handle staking, unstaking, and re-staking", async function () {
      // Stake
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Need to wait a short period for rewards
      await time.increase(1);
      
      // Unstake
      await vault.connect(user1).unstake(0);
      
      // Stake again
      await vault.connect(user1).stake(STAKE_AMOUNT, 0);
      
      // Check user stakes
      const userStakes = await vault.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(2);
      expect(userStakes[0].active).to.equal(false);
      expect(userStakes[1].active).to.equal(true);
    });

    it("Should handle out of rewards situation correctly", async function () {
      // Stake tokens
      await vault.connect(user1).stake(STAKE_AMOUNT, 3); // High reward rate option
      
      // Fast forward 30 days to accrue rewards
      await time.increase(30 * ONE_DAY);
      
      // Remove all rewards
      await vault.connect(owner).recoverToken(await rewardsToken.getAddress());
      await vault.connect(user1).checkAndUpdateRewardStatus();
      
      // Try to claim rewards
      await expect(
        vault.connect(user1).claimRewards(0)
      ).to.be.revertedWith("No rewards to claim");
      
      // Add rewards back
      await vault.connect(owner).addRewards(REWARDS_AMOUNT);
      
      // Fast forward a bit more to accrue some rewards
      await time.increase(1 * ONE_DAY);
      
      // Should be able to claim now
      await vault.connect(user1).claimRewards(0);
    });
  });
});