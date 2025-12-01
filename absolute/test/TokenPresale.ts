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
      await expect(
        TokenPresale.connect(user1).buyTokens({
          value: ethers.parseEther("11"),
        })
      ).to.be.revertedWithCustomError(TokenPresale, "InsufficientTokens");
    });
  });

  describe("Claiming Tokens", () => {
    it("Should allow users to claim tokens after presale ends", async () => {
      expect(await TokenPresale.block.timestamp).to.be.greaterThan(endTime);
      await expect(TokenPresale.connect(user1).claimTokens())
        .to.emit(TokenPresale, "Claimed")
        .withArgs(user1.address, ethers.parseUnits("2000", 18));
    });

    it("Should revert if user has not purchased any tokens", async () => {
      await expect(
        TokenPresale.connect(user1).claimTokens()
      ).to.be.revertedWithCustomError(TokenPresale, "NoContribution");
    });
  });
});
