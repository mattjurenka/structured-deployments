# Structured Deployments

Web3 complex deploy scripts

What this library is:
  - A smart contract deployment tool intended at making large/complex deployments, especially targeted at those
    going multichain or on non-EVM platforms. Think hardhat ignition but not specific to EVM and with some extra features.
  - Something that speeds up development of new smart contract projects by tightening the code-deploy-interact loop
  - Substantially reduces the amount of testnet gas spent on transactions by not re-deploying things you already have deployed. No more begging for testnet tokens on Telegram or needing to bot the faucet.
  - Reduces the time spent deploying by running what you can concurrently instead of in serial, in addition to not
    re-deploying things you have already deployed

What this library is not:
  - A replacement for Hardhat/Ethers, Foundry, or any kind of SDK meant for compiling contracts or abstracting HTTP
    communication with the RPC.
  - Something tailored for those just getting into blockchain