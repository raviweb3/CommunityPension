import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployDirector: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  log("----------------------------------------------------")
  log("Deploying Director and waiting for confirmations...")
  const director = await deploy("Director", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  })
  log(`Box at ${director.address}`)
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(director.address, [])
  }
  const directorContract = await ethers.getContractAt("Director", director.address)
  const timeLock = await ethers.getContract("TimeLock")
  const transferTx = await directorContract.transferOwnership(timeLock.address)
  await transferTx.wait(1)
}

export default deployDirector
deployDirector.tags = ["all", "director"]
