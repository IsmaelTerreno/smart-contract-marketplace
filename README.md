# Smart Contract Marketplace
## Overview
This project involves an Ethereum-based decentralized marketplace for trading ERC20 tokens. The core functionality allows users to list tokens for sale, purchase listed tokens, and facilitate fund withdrawals by sellers. The project leverages a combination of Solidity smart contracts and uses the Hardhat framework for development and testing. Also, this project is part of an assessment objective. [Here is a backend project that interacts with the smart contracts](https://github.com/IsmaelTerreno/smart-contract-api-marketplace) and manages EIP-712 signatures.
## Smart Contracts
### Marketplace.sol
- **Purpose:** A contract designed to facilitate the buying and selling of ERC20 tokens. It manages token listings, purchases, and seller withdrawals.
- **Key Functions:**
   - **listItem:** List tokens for sale with a specified price.
   - **purchaseItem:** Allow buyers to purchase listed tokens.
   - **withdrawFunds:** Enable sellers to withdraw their earnings from token sales.
   - **authorizeWithSignature:** Ensure operations are authorized through a valid signature for enhanced security measures.

### ERC20MarketplaceItem.sol
- **Purpose:** An ERC20 token contract used to create tokens that can be listed and traded in the marketplace.
- **Key Functions:**
   - **Minting Tokens:** On deployment, mints a specific initial supply for the owner, which can be traded on the marketplace.

## Project Structure
- `contracts/`: Contains Solidity contracts defining the ERC20 token and marketplace logic.
- `scripts/`: Holds deployment scripts using Hardhat Ignition.
- `test/`: Includes Mocha/Chai test scripts validating contract functionality with Hardhat.
- `hardhat.config.cjs`: Configuration for Hardhat specifying Solidity compiler version and plugins.

## Installation
To set up the project locally, follow these steps:
1. **Clone the repository:**
``` bash
   git clone https://github.com/IsmaelTerreno/smart-contract-marketplace
```
``` bash
   cd smart-contract-marketplace
```
1. **Install dependencies:** Ensure you have [Node.js]() and [npm]() installed, then run:
``` bash
   npm install
```
## Scripts
Scripts are provided to deploy and interact with the contracts:
- **Start Local Node:** Launches a local Ethereum node for development and testing.
``` bash
   npm run start:local:node
```
- **Compile Contracts:** Compiles the Solidity contracts using Hardhat.
``` bash
   npm run compile
```
- **Clean Artifacts:** Removes any cached builds or artifacts from compilations.
``` bash
   npm run clean
```
- **Deploy Contracts:** Deploys the contracts to the local development blockchain.
``` bash
   npm run deploy:local:node
```
## Testing
The project includes a suite of tests to ensure the smart contracts operate as expected.
1. **Run Tests:** Execute the test suite using the following command:
``` bash
   npm test
```
1. **Testing Framework:**
   - **Mocha** is used as the test runner.
   - **Chai** provides assertion capabilities to validate outcomes.

## Running the Project
Here's a step-by-step guide to get the application running locally:
1. **Start Hardhat Node:** Start a local Ethereum network:
``` bash
   npx hardhat node
```
1. **Deploy Contracts:** Run the deployment script to deploy the contracts to the local network:
``` bash
   npx hardhat ignition deploy ./ignition/modules/Marketplace.js --network localhost
```
1. **Interact with Contracts:** Interact with the deployed contracts via scripts or directly through the Hardhat console.

## Additional Features
- **Security:** Employs EIP712 for typed structure signatures to ensure that transactions are authorized and securely processed.
- **Token Transactions:** Facilitates ERC20 token transfers with robust listing and purchasing mechanisms.
- **Earnings Management:** Implements a systematic approach for sellers to claim earnings post-transaction.

## Contributors
Contributions are welcome! Feel free to open issues or submit pull requests for features or bug fixes.
## License
Distributed under the MIT License. See `LICENSE` for further details.

---
# Assessment Objective related to this project
Develop a dApp (Decentralized Application) consisting of:
1. Smart Contracts: Implement a decentralized token-based marketplace.
2. Backend Service: Build a backend to interact with the smart contracts and manage EIP-712 signatures.
3. Frontend GUI: Create a simple user interface for interacting with the marketplace.

## Detailed Requirements

---

### Part 1: Smart Contracts

1. Implement a Marketplace contract using ERC-20 tokens as the traded items.
   - List Item: A user can list a certain number of ERC-20 tokens for sale at a specified price in Ether.
   - Purchase Item: Another user can purchase the listed tokens by sending the required amount of Ether. The tokens are transferred to
     the buyer.
   - Withdraw Funds: Sellers can withdraw their earnings in Ether from the marketplace contract.
2. EIP-712 Signed Message Interaction:
   - Add a function that enables token transfers based on an EIP-712 signed message:
   - Users can sign a message authorizing the marketplace to transfer tokens on their behalf.
   - The contract verifies the signature before executing the transfer.
   - Include a specific use case in the marketplace:
   - Allow sellers to pre-authorize token listings using signed messages.
3. Key Requirements:
   Use Solidity and follow EVM-compatible standards.
   Include events for important actions ( ItemListed, ItemPurchased, FundsWithdrawn).
   Use OpenZeppelin libraries such as ERC-20 where possible.
---
### Part 2: Backend Service

1. Build a backend service to:
   - Query listed items and purchase history from the smart contract.
   - Generate EIP-712-compliant messages for token transfers.
     Facilitate API routes for:
   - Listing items via signed messages ( POST /list).
   - Querying all items ( GET /items).
   - Purchasing item ( POST /purchase).
   - Withdraw item ( POST /withdraw)
2. Sell Tokens Directly (Optional Advanced Use Case):
   Provide an API route ( POST /sell) to:
   - Accept signed EIP-712 messages authorizing the backend to facilitate direct token transfers between users.
   - Push the transfer transaction to the blockchain on behalf of the seller and buyer.
3. Key Requirements:
   - Use Node.js with Express, Nestjs or any other equivalent framework.
   - Integrate Web3.js or ethers.js for contract interaction.
   - Include utilities for signing messages on behalf of users (e.g., using a wallet or private key during testing).
---
### Part 3: Frontend GUI
1. Build a simple GUI to interact with the backend and marketplace:
   - Marketplace: Display all listed ERC-20 tokens, including name, price, and quantity.
   - Listing Form: Allow users to list tokens for sale. Include an option to sign the listing with their wallet.
   - Purchase Flow: Enable users to buy tokens by connecting their wallet.
   - Withdraw Section: Allow sellers to withdraw their funds in Ether.
2. Key Requirements:
   - Use a modern frontend framework (React, Vue, etc.).
   - Implement wallet integration using MetaMask, WalletConnect, or wagmi.
   - Display detailed information about signed messages and their validation.
     Bonus (Optional)
     Add a test suite for:
   - Smart contracts (using Hardhat or Foundry).
   - EIP-712 message verification.
   - Deploy the contract to a testnet (e.g., sepolia or zkSync Era) and provide the deployment address.
   - Implement token price sorting or filtering on the frontend.
   - Add off-chain caching of marketplace data for performance (e.g., using Redis).
