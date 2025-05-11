# DeFi Staking Platform ("Vault")

A full-stack decentralized application allowing users to stake ERC20 tokens with flexible or locked staking options for different reward rates.

## Links

- Frontend: [http://localhost:3060](http://localhost:3060)
- Backend: [http://localhost:3061](http://localhost:3061)
- Smart Contracts (Sepolia Testnet):
  - [Vault (Sepolia)](https://sepolia.etherscan.io/address/0x2B8f94ceeA12A7806469A2A6bfb87F9D6ee66C6e)
  - [Staking Token (Sepolia)](https://sepolia.etherscan.io/address/0xa895600CF9b295bEf5a0ABce08C04d772360FBE6)
  - [Rewards Token (Sepolia)](https://sepolia.etherscan.io/address/0x6ed2641f4207F495B94B2F44b7CB972Cf2E21945)
  - [Test Token (Sepolia)](https://sepolia.etherscan.io/token/0x6ed2641f4207F495B94B2F44b7CB972Cf2E21945#balances)


## Features

- **Flexible Staking**: Stake tokens with the ability to unstake anytime
- **Locked Staking**: Opt for higher rewards by locking tokens for predefined periods
- **Reward Calculation**: Dynamic reward rates based on staking duration and amount
- **User Dashboard**: View staking positions, rewards, and available actions

## Tech Stack

- **Smart Contracts**: Solidity, Hardhat
- **Frontend**: NextJS, TailwindCSS, ethers.js
- **Backend**: NestJS, PostgreSQL
- **Testing**: Hardhat test suite

## Project Structure

```bash
├── contracts/            # Smart contract source files
├── frontend/             # Next.js frontend application
├── backend/              # NestJS backend API (optional)
├── scripts/              # Deployment and utility scripts
└── sc/                   # Smart contracts folder (hardhat)
```

## Smart Contract Design

### Vault Contract

The main staking contract implements:

- **Staking Logic**:
  - Flexible staking with immediate withdrawal option
  - Locked staking with time-based restrictions
- **Reward System**:

  - Different reward rates for flexible vs. locked staking
  - Time-based reward calculation
  - Rewards can be claimed anytime, regardless of lock period

- **Contract Management**:
  - Deposit reward tokens
  - Track staking positions

### Events

The contract emits the following events for tracking:

- `Staked`: When tokens are deposited
- `Unstaked`: When tokens are withdrawn
- `RewardClaimed`: When rewards are claimed
- `RewardPaid`: When rewards are paid out

## Setup and Installation

### Prerequisites

- Node.js v16+
- npm or yarn
- MetaMask or another web3 wallet

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/Laikaiyong/Vault.git
   cd Vault
   ```

2. Set up environment variables:

   ```bash
   # Create .env files in frontend and backend folders (refer to .env.example)
   cd frontend
   cp .env.example .env
   # Edit .env files to set up your environment
   cd ../backend
   cp .env.example .env
   # Edit .env files to set up your environment
   ```

3. Run the local development setup (includes installing dependencies):

   ```bash
   sh ./scripts/run.sh
   ```

The script handles all necessary dependencies installation, contract compilation, and deployment.

## Frontend Interface

The frontend provides an intuitive interface for:

- Connecting wallet
- Viewing available staking options
- Staking tokens with or without lock periods
- Viewing staking positions and rewards
- Claiming rewards
- Unstaking tokens (when eligible)

## Smart Contract Design Decisions

### Reward Mechanism

- Rewards accrue linearly over time based on the staking amount and chosen rate
- Higher rates are provided for longer lock-up periods
- Rewards can be claimed at any time, regardless of whether the principal is still locked
- If the contract runs out of reward tokens, reward accrual is paused until refilled

### Staking Flexibility

- Users can have multiple staking positions with different lock periods
- Each staking position is tracked separately, allowing for partial unstaking

## Testing

Comprehensive tests cover all major contract functions:

- Staking functionality
- Lock period enforcement
- Reward calculations
- Admin functions
- Edge cases and potential vulnerabilities

Run the test suite with:

```bash
cd sc
npx hardhat test
```

To deploy

```bash
# Make sure to set up your environment variables in .env file
npx hardhat ignition deploy ignition/modules/Vault.js --network sepolia
```

## Security Considerations

- Reentrancy protection for all external calls
- Rate limiting for certain admin functions
- Sanity checks for user inputs
- Emergency pause functionality
- No direct interaction with unknown external contracts

## Future Enhancements

- Multi-token staking pools
- NFT-based staking positions
- Governance mechanism for parameter updates
- Compounding rewards options
- Integration with other DeFi protocols
