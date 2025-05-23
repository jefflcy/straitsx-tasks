
# My Hardhat Token (MHT)

A Solidity ERC-20 token contract with deposit/withdrawal functionality and automatic interest generation.

## Smart Contract Changes

### Core Enhancements
- **Interest-bearing deposits**: Users can deposit tokens and earn 2% interest per 5-minute interval
- **Reserved interest pool**: 100,000 tokens allocated specifically for interest payments
- **Automated interest calculation**: Time-based interest accrual using block timestamps
- **Deposit tracking**: Individual deposit records with timestamps and amounts
- **Event emissions**: `TokensDeposited` and `TokensWithdrawn` events for transaction tracking

### Token Distribution
- **Total Supply**: 1,000,000 MHT tokens
- **Owner allocation**: 900,000 tokens
- **Interest pool**: 100,000 tokens reserved for interest payments

### Key Functions
- `deposit(uint256 amount)`: Deposit tokens to earn interest
- `withdraw()`: Withdraw principal + accrued interest
- `calculateInterest(address account)`: View pending interest calculation

## Setup

### Environment Configuration
Create a `.env` file in the project root:

```bash
PRIVATE_KEY=your_private_key_here_without_0x_prefix
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### Install Dependencies
```bash
npm install
```

## Testing

### Run All Tests
```bash
npx hardhat test
```

## Deployment

### Local Development
# Start local Hardhat node
```bash
npx hardhat node
```

# Deploy to local network (in another terminal)
```bash
npx hardhat ignition deploy ./ignition/modules/Token.js --network localhost
```

### Testnet Deployment (Sepolia)
# Deploy to Sepolia testnet
```bash
npx hardhat ignition deploy ./ignition/modules/Token.js --network sepolia
```

## What This Deploys

The deployment script creates a Token contract with the following characteristics:

### Initial State
- **Contract Name**: "My Hardhat Token"
- **Symbol**: "MHT"
- **Total Supply**: 1,000,000 tokens

### Token Distribution
- **Owner Balance**: 900,000 MHT tokens (immediately available)
- **Interest Pool**: 100,000 MHT tokens (reserved for interest payments)
- **Circulating Supply**: 900,000 MHT tokens (available for transfers)

### Interest System
- **Interest Rate**: 2% per 5-minute interval
- **Calculation Method**: `(depositAmount * 200 / 10000) * timeIntervals`
- **Payment Source**: Dedicated interest pool (prevents token inflation)
- **Minimum Interval**: 300 seconds (5 minutes)

## Network Configuration

Ensure your `hardhat.config.js` includes the target networks:

```javascript
networks: {
  sepolia: {
    url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY]
  },
  mainnet: {
    url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```