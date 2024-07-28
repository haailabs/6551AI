# 6551.AI
Turn each one of your NFTs into a wallet, control it with AI
6551.AI combines ERC-6551 token-bound accounts with AI-powered transaction suggestions.

## Deployed app
https://6551ai.replit.app

## Overview

This application allows users to:
1. Connect their wallet and view their NFTs
2. Create or access ERC-6551 wallets for their NFTs
3. Interact with these token-bound accounts
4. Get AI-suggested transactions based on natural language prompts

## Dependencies

- **Alchemy**: Used to retrieve blockchain data, including NFT ownership information.
- **Brian API**: Provides AI-powered transaction suggestions based on user prompts.

## Key Features

- Wallet connection and NFT display
- ERC-6551 wallet creation and management
- Basic token-bound account operations (balance checking, transfers)
- AI-suggested transactions using natural language input
- Transaction approval and execution through the ERC-6551 wallet

## Setup and Running

1. Clone the repository:
2. git clone https://github.com/yourusername/6551.AI.git
cd 6551.AI
Copy
2. Install dependencies:
npm install
Copy
3. Set up environment variables:
Create a `.env` file in the root directory and add your API keys:
ALCHEMY_API_KEY=your_alchemy_api_key
BRIAN_API_KEY=your_brian_api_key
Copy
4. Run the application:
node index.js
Copy
5. Open your web browser and navigate to `http://localhost:3000` (or the port specified in your application).

## Usage

1. Connect your wallet using the "Connect Wallet" button.
2. Select an NFT from the dropdown to create or access its ERC-6551 wallet.
3. Use the interface to check balance, transfer tokens, or execute custom calls.
4. Enter natural language prompts in the AI suggestion box to get transaction suggestions.
5. Review and approve AI-suggested transactions as needed.
