import { CommunityContract, GoldToken, TimeLock, Box } from "../../typechain-types"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import {
  FUNC,
  PROPOSAL_DESCRIPTION,
  NEW_STORE_VALUE,
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
} from "../../helper-hardhat-config"
import { moveBlocks } from "../../utils/move-blocks"
import { moveTime } from "../../utils/move-time"

describe("Community Flow", async () => {
  let community: CommunityContract
  let goldToken: GoldToken
  let timeLock: TimeLock
  let box: Box
  const voteWay = 1 // for
  const reason = "I lika do da cha cha"
  beforeEach(async () => {
    await deployments.fixture(["all"])
    community = await ethers.getContract("CommunityContract")
    timeLock = await ethers.getContract("TimeLock")
    goldToken = await ethers.getContract("GoldToken")
    box = await ethers.getContract("Box")
  })

  it("can only be changed through Community", async () => {
    await expect(box.store(55)).to.be.revertedWith("Ownable: caller is not the owner")
  })

  it("proposes, votes, waits, queues, and then executes", async () => {
    // propose
    const encodedFunctionCall = box.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
    const proposeTx = await community.propose(
      [box.address],
      [0],
      [encodedFunctionCall],
      PROPOSAL_DESCRIPTION
    )
    const boxStartingValue = await box.retrieve()
    console.log(`Box starting value is: ${boxStartingValue.toString()}`)
    const proposeReceipt = await proposeTx.wait(1)
    const proposalId = proposeReceipt.events![0].args!.proposalId
    let proposalState = await community.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    await moveBlocks(VOTING_DELAY + 1)
    // vote
    const voteTx = await community.castVoteWithReason(proposalId, voteWay, reason)
    await voteTx.wait(1)
    proposalState = await community.state(proposalId)
    assert.equal(proposalState.toString(), "1")
    console.log(`Current Proposal State: ${proposalState}`)
    await moveBlocks(VOTING_PERIOD + 1)

    // queue & execute
    // const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
    const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION)
    const queueTx = await community.queue([box.address], [0], [encodedFunctionCall], descriptionHash)
    await queueTx.wait(1)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)

    proposalState = await community.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    console.log("Executing...")
    console.log
    const exTx = await community.execute([box.address], [0], [encodedFunctionCall], descriptionHash)
    await exTx.wait(1)
    const boxEndingValue = await box.retrieve()
    console.log(`Director ending value THROUGH GOVERNANCE IS: ${boxEndingValue.toString()}`)
  })
})
