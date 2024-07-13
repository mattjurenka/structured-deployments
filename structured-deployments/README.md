# structured-deployments
10x your Deploy Scripts

## What is structured-deployments?
Structured Deployments is a new way to organize your deploy process into a series of tasks. If a task runs successfully the output will be cached locally so it doesn't have to be re-run again. Only new tasks, tasks that previously failed, or tasks that have a changed dependency will be re-run.

This leads to two crucial advantages.

1. Deploying is FAST. If we have a task that takes a long time, we can run other things in the background while we are waiting for it to finish. If you modify the contract code, or want to add something extra to your deploy script, you will only have to re-deploy a few things instead of everything, making development itself faster by tightening the code-deploy-test loop.
2. You spend significantly less testnet tokens on gas while deploying. This is especially important if you are in a ecosystem where testnet tokens are hard to come by. No more needing to bot the testnet faucet or beg for tokens in the dev channel on Telegram/Discord.


## Who should use this library?

You should use this library if:
  - You have a complex deployment process, especially if you are deploying multichain or to non-evm chains.
  - You want to spend less time running deploy scripts and more time writing smart contracts
  - You want to spend less gas on testnets

You should NOT use this library if:
  - You have a very simple contract deployment process that only runs on one EVM chain at a time (use hardhat ignition)
  - You are only looking for an RPC client and not a way to manage your entire deploy process (use each chain's sdk like ethers or @mystenlabs/sui.js)

## Install

Code is structured into the main `@structured-deployments/core` package, and a number of other library packages that provide basic chain-specific premade tasks, like deploying contracts, sending native tokens, and interacting with contracts. It is possible you will be able to write your entire deploy script with just the premade tasks in these libraries, but it is likely you will have to use the `register_task` function in core to do anything custom or non-standard.

All projects will need to import the core package: `npm install @structured-deployments/core`

And also any libraries you may want to use
- `@structured-deployments/evm-ethers`
- more coming soon...

## Disclaimer

This project currently is in pre-alpha. There are likely to be rough spots. Please contact me on Telegram if you have any questions or for support: `@mjurenka`

## License

[MIT](LICENSE.md)