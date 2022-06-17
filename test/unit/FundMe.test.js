const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { devChains } = require("../../helper-hardhat-config")

!devChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async () => {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          const senderName = beforeEach(async () => {
              //deploy fundme ctrnt using hardhat deploy

              //const accs = await ethers.getSigners() - this will get all the accounts from hardhat-config on the used network
              //const accZero = accs[0]

              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"]) //deploying every deploy js from deploy folder
              fundMe = await ethers.getContract("FundMe", deployer) //getting the most recently deployed fundMe contract
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("Constructor", async () => {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()

                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("Fund", async () => {
              it("fails if you dont send enough eth", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Did not send enough!"
                  )
              })

              it("updates the amount funded data sctructure", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("adds funder to array of getFunder", async () => {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", async () => {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })

              it("can withdraw eth from a single founder", async () => {
                  //Arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Act
                  const txResponse = await fundMe.withdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("can withdraw eth from a single founder", async () => {
                  //Arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Act
                  const txResponse = await fundMe.cheaperWithdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("allows us to withdraw with multiple getFunder", async () => {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Act
                  const txResponse = await fundMe.withdraw()

                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("only allows the owner to withdraw", async () => {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnContract = await fundMe.connect(attacker)

                  await expect(
                      attackerConnContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })

              it("cheaper withdraw testing...", async () => {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Act
                  const txResponse = await fundMe.cheaperWithdraw()

                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
