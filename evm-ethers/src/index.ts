import { DependentTasks, register_task, Task } from "@structured-deployments/core"
import { BaseContract, ContractFactory, formatEther } from "ethers"
//import hre, { run } from "hardhat"
import { TypedContractMethod, ContractMethodArgs, StateMutability } from "@typechain/ethers-v6/static/common"

type DeployContractReturn = {
    contract_address: string
}
export const register_contract_deploy = async <Depends extends [...any[]], Factory extends ContractFactory>(
    name: string,
    factory: Factory,
    dependencies: DependentTasks<Depends>,
    get_args: (deps: Depends) => Promise<Parameters<Factory["deploy"]>>,
    verify_fqn?: string
): Promise<Task<Depends, DeployContractReturn>> => {
    const deploy_task = register_task(`${name} - Deploy`, dependencies, async (deps: Depends) => {
        console.log(`Deploying Contract: ${name}...`)
        const args = await get_args(deps)
        const contract = await factory.deploy(...args, {})
        const deployed_transaction = contract.deploymentTransaction()

        let gas_used: bigint | undefined = undefined
        let gas_price: bigint | undefined = undefined
        let fee: bigint | undefined = undefined
        if (deployed_transaction) {
            const receipt = await deployed_transaction.wait()
            gas_used = receipt?.gasUsed
            gas_price = receipt?.gasPrice
            fee = receipt?.fee
        }
        await contract.waitForDeployment()
        const contract_address = await contract.getAddress()
        
        console.log(`Contract ${name} deployed at ${contract_address}`)
        if (gas_used !== undefined) {
            console.log(`Used ${gas_used} gas to deploy, at a price of ${gas_price}, for a total fee of ${fee} WEI, or ${formatEther(fee!)} Ether`)
        }

        return {
            contract_address
        }
    })
    
    //if (verify_fqn) {
    //    const build_info = await hre.artifacts.getBuildInfo(verify_fqn)
    //    if (build_info) {
    //        build_info.output = {sources: {}, contracts: {}}
    //        register_task(
    //            `${name} - Etherscan Verify`,
    //            [deploy_task, ...dependencies],
    //            async ([deploy_output, ...other_deps]) => {
    //                console.log(`Verifying ${name} on Etherscan...`)
    //                const args = await get_args(other_deps as Depends)
    //                await run("verify:verify", {
    //                  address: deploy_output.contract_address,
    //                  constructorArguments: args
    //                })
    //                return {}
    //            },
    //        )
    //    }
    //}

    return deploy_task
}


export type * from "@structured-deployments/core"