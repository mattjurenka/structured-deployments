import "dotenv/config"

import '@nomicfoundation/hardhat-ethers'

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "ethers"

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "sepolia",
  //etherscan: {
  //  apiKey: process.env.ETHERSCAN_KEY
  //},
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC,
      chainId: 11155111,
      accounts: [ethers.Wallet.fromPhrase(process.env.MNEMONIC!).privateKey],
    },
    ethereum: {
      url: process.env.ETHEREUM_RPC,
      chainId: 1,
      accounts: [ethers.Wallet.fromPhrase(process.env.MNEMONIC!).privateKey],
    },
  }
};

export default config;
