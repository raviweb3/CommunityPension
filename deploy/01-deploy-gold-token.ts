import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployGoldToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  log("----------------------------------------------------")
  log("Deploying GoldToken and waiting for confirmations...")
  const goldToken = await deploy("GoldToken", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  })
  log(`GoldToken at ${goldToken.address}`)
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(goldToken.address, [])
  }
  log(`Delegating to ${deployer}`)
  await delegate(goldToken.address, deployer)
  log("Delegated!")
}

const delegate = async (goldTokenAddress: string, delegatedAccount: string) => {
  const goldToken = await ethers.getContractAt("GoldToken", goldTokenAddress)
  const transactionResponse = await goldToken.delegate(delegatedAccount)
  await transactionResponse.wait(1)
  console.log(`Checkpoints: ${await goldToken.numCheckpoints(delegatedAccount)}`)
}

export default deployGoldToken
deployGoldToken.tags = ["all", "gold"]
