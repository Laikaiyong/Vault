const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("StakingDeployment", (m) => {
  // First deploy the staking token with explicit ID
  const stakingToken = m.contract("TestToken", [], { id: "StakingToken" });

  // Deploy another instance of TestToken for rewards with different ID
  const rewardsToken = m.contract("TestToken", [], { id: "RewardsToken" });

  // Deploy the Vault contract with the token addresses
  const vault = m.contract("Vault", [
    stakingToken,
    rewardsToken
  ]);

  // Transfer some rewards to the vault contract
  const rewardsAmount = m.getParameter(
    "rewardsAmount", 
    "100000000000000000000000" // 100,000 tokens
  );

  // Use the contract objects directly when referencing contracts
  const transferRewards = m.call(rewardsToken, "transfer", [
    vault,
    rewardsAmount
  ], {
    // Use the `from` option to set dependencies (this is how Ignition handles it)
    // This ensures transferRewards is executed after both vault and rewardsToken are deployed
    from: m.getAccount(0)
  });

  // Ignition automatically manages most dependencies based on references
  // No need for explicit dependsOn call

  return { stakingToken, rewardsToken, vault };
});