export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'vault_staking',
    synchronize: process.env.NODE_ENV !== 'production',
  },
  blockchain: {
    rpcUrl:
      process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    vaultContractAddress:
      process.env.VAULT_CONTRACT_ADDRESS ||
      '0x0d796ED6Fa59596b265a6C97ee1d9794b1Ac14ca',
    stakingTokenAddress:
      process.env.STAKING_TOKEN_ADDRESS ||
      '0x32f0DC475d5f2444868bAFabf79F450ADCf026cD',
    rewardsTokenAddress:
      process.env.REWARDS_TOKEN_ADDRESS ||
      '0xaA3A8D339829a1d76ef90b5f6Cd443c7Ed9aB73e',
  },
});
