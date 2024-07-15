import { ethers } from "hardhat"
import { register_contract_deploy } from "@structured-deployments/evm-ethers"
import { sync_tasks, register_task } from "@structured-deployments/core";

(async () => {
    const deploy_mock_erc = await register_contract_deploy(
        await ethers.getContractFactory("GLDToken"),
        "Gold Token",
        [],
        async () => ([ethers.parseEther("10")])
    )

    const deploy_lock = await register_contract_deploy(
        await ethers.getContractFactory("Lock"),
        "Lock",
        [deploy_mock_erc],
        async ([deploy_erc_output]) => {
            const block_timestamp = (await ethers.provider.getBlock("latest"))?.timestamp
            if (!block_timestamp) {
                throw new Error("Could not retrieve latest block_timestamp")
            }
            return [
                block_timestamp + 60 * 60 * 24 * 7, // Accessible in 1 week
                deploy_erc_output.contract_address
            ]
        }
    )

    register_task(
        "Deposit to Lock",
        [deploy_lock, deploy_mock_erc],
        async ([deploy_lock_output, deploy_erc_output]) => {
            console.log("Deploying to Lock")
            const gold_token = await ethers.getContractAt("GLDToken", deploy_erc_output.contract_address)
            const tx = await gold_token.transfer(deploy_lock_output.contract_address, ethers.parseEther("5"))
            return { tx_hash: tx.hash }
        }
    )

    await sync_tasks()

})()