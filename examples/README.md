# Structured Deployments basic example 

In this example, we will deploy two contracts:

1. GLDToken, which is just a mock ERC20 token that gives an initial supply of 10 to the deployer
2. Lock, which holds a specific amount of a given ERC20 that is withdrawable by anyone after a certain block timestamp

The task dependency graph looks like this:

`Deploy GLDToken -> Deploy Lock -> Transfer 5 GLDToken to Lock`

Note that if you change the example such that a task will fail, for example trying to send 20 GLDToken, on successive runs it will not attempt to run the tasks that did go through again. If you refractor the contracts such that the Lock deploy does not depend on knowing the address of GLDToken, it will additionally deploy GLDToken and Lock concurrently, saving time.

The deploy script itself is located at `scripts/deploy.ts`

## Deploying on Sepolia

1. Ensure you have [pnpm](https://pnpm.io/installation) installed
2. Clone the workspace repo: `git clone https://github.com/mattjurenka/structured-deployments`
3. Run `pnpm install` then `pnpm -r build`
4. Ensure you have an EVM wallet with a little bit of SepoliaETH. My preferred faucet at time of writing is [from Google Cloud.](https://cloud.google.com/application/web3/faucet/ethereum/sepolia). Set the mnemonic (seed phrase) properly, copying from `examples/env.example` to `examples/.env`
5. In the `examples` folder, run `pnpm exec hardhat run scripts/deploy.ts`
