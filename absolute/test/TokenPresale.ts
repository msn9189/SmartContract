import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TokenPresale", function () {
  let owner: any;
  let user1: any;
  let user2: any;

  let token: any;
  let tokenAddress: any;
  let TokenPresale: any;
  let presaleAddress: any;

  const startTime = BigInt("1764579912");
  const endTime = BigInt("1767085512");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    token = await ethers.deployContract("MockToken");
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    TokenPresale = await ethers.deployContract("TokenPresale", [
      tokenAddress,
      ethers.parseUnits("2000", 18),
      startTime,
      endTime,
      ethers.parseEther("0.1"),
      ethers.parseEther("10"),
      0,
    ]);
    await TokenPresale.waitForDeployment();
    presaleAddress = await TokenPresale.getAddress();
    await token.mint(presaleAddress, ethers.parseUnits("1000000", 18));
  });

  describe("Deployment & Initialization", () => {
    it("Should set correct contract parameters", async () => {
      expect(await TokenPresale.token()).to.equal(tokenAddress);
      expect(await TokenPresale.rate()).to.equal(ethers.parseUnits("2000", 18));
      expect(await TokenPresale.startTime()).to.equal(startTime);
      expect(await TokenPresale.endTime()).to.equal(endTime);
      expect(await TokenPresale.minPurchase()).to.equal(
        ethers.parseEther("0.1")
      );
      expect(await TokenPresale.maxPurchase()).to.equal(
        ethers.parseEther("10")
      );
      expect(await TokenPresale.hardCap()).to.equal(0);
    });

    it("Should revert if token address is invalid", async () => {
      await expect(
        ethers.deployContract("TokenPresale", [
          ethers.ZeroAddress,
          ethers.parseUnits("2000", 18),
          startTime,
          endTime,
          ethers.parseEther("0.1"),
          ethers.parseEther("10"),
          0,
        ])
      ).to.be.revertedWithCustomError(TokenPresale, "InvalidTokenAddress");
    });
  });

  describe("Buying Tokens", () => {
    it("Should allow users to buy tokens", async () => {
      await expect(
        TokenPresale.connect(user1).buyTokens({ value: ethers.parseEther("1") })
      )
        .to.emit(TokenPresale, "TokensPurchased")
        .withArgs(
          user1.address,
          ethers.parseEther("1"),
          ethers.parseUnits("2000", 18)
        );
    });

    it("Should revert if user sends less than min purchase", async () => {
      await expect(
        TokenPresale.connect(user1).buyTokens({
          value: ethers.parseEther("0.09"),
        })
      ).to.be.revertedWithCustomError(TokenPresale, "BelowMinPurchase");
    });

    it("Should revert if user sends more than max purchase", async () => {
      await expect(
        TokenPresale.connect(user1).buyTokens({
          value: ethers.parseEther("11"),
        })
      ).to.be.revertedWithCustomError(TokenPresale, "ExceedsMaxPurchase");
    });

    it("Should revert if user sends more than hard cap", async () => {
      // Deploy a new contract with a hardCap of 5 ETH
      const TokenPresaleWithCap = await ethers.deployContract("TokenPresale", [
        tokenAddress,
        ethers.parseUnits("2000", 18),
        startTime,
        endTime,
        ethers.parseEther("0.1"),
        ethers.parseEther("10"), // maxPurchase: 10 ETH
        ethers.parseEther("5"), // hardCap: 5 ETH
      ]);
      await TokenPresaleWithCap.waitForDeployment();
      const presaleWithCapAddress = await TokenPresaleWithCap.getAddress();
      await token.mint(presaleWithCapAddress, ethers.parseUnits("1000000", 18));

      // Try to buy 6 ETH, which exceeds hardCap (5 ETH) but is within maxPurchase (10 ETH)
      await expect(
        TokenPresaleWithCap.connect(user1).buyTokens({
          value: ethers.parseEther("6"),
        })
      ).to.be.revertedWithCustomError(TokenPresaleWithCap, "HardCapReached");
    });

    it("Should revert if user sends more than token balance", async () => {
      // Deploy a new contract with higher maxPurchase to allow large purchases
      const TokenPresaleLimited = await ethers.deployContract("TokenPresale", [
        tokenAddress,
        ethers.parseUnits("2000", 18), // rate: 2000 tokens per ETH
        startTime,
        endTime,
        ethers.parseEther("0.1"),
        ethers.parseEther("1000"), // maxPurchase: 1000 ETH (high enough)
        ethers.parseEther("0"), // no hardCap
      ]);
      await TokenPresaleLimited.waitForDeployment();
      const presaleLimitedAddress = await TokenPresaleLimited.getAddress();

      // Mint only 1,000,000 tokens (enough for 500 ETH at rate 2000 tokens/ETH)
      await token.mint(presaleLimitedAddress, ethers.parseUnits("1000000", 18));

      // Try to buy 501 ETH, which requires 1,002,000 tokens (501 * 2000)
      // But contract only has 1,000,000 tokens, so should revert with InsufficientTokens
      await expect(
        TokenPresaleLimited.connect(user1).buyTokens({
          value: ethers.parseEther("501"),
        })
      ).to.be.revertedWithCustomError(
        TokenPresaleLimited,
        "InsufficientTokens"
      );
    });
  });

  describe("Claiming Tokens", () => {
    it("Should allow users to claim tokens after presale ends", async () => {
      // First, user1 needs to buy tokens
      await TokenPresale.connect(user1).buyTokens({
        value: ethers.parseEther("1"),
      });

      // Fast-forward time to after the presale ends
      const currentBlock = await ethers.provider.getBlock("latest");
      const timeToIncrease = Number(endTime) - currentBlock!.timestamp + 1;
      await ethers.provider.send("evm_increaseTime", [timeToIncrease]);
      await ethers.provider.send("evm_mine", []);

      // Now user1 should be able to claim tokens
      await expect(TokenPresale.connect(user1).claimTokens())
        .to.emit(TokenPresale, "Claimed")
        .withArgs(user1.address, ethers.parseUnits("2000", 18));
    });

    it("Should revert if user has not purchased any tokens", async () => {
     
    });
  });
});
