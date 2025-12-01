import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TokenPresale", function () {
  let owner: any;
  let user1: any;
  let user2: any;
  const startTime = BigInt("1764227834");
  const endTime = BigInt("1764400634");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const token = await ethers.deployContract("MockToken", ["MockToken","MTK"]);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    const TokenPresale = await ethers.deployContract("TokenPresale", [
      tokenAddress,
      ethers.parseUnits("2000", 18),
      startTime,
      endTime,
      ethers.parseEther("0.1"),
      ethers.parseEther("10"),
      0
    ]);
    await TokenPresale.waitForDeployment();
    const presaleAddress = await TokenPresale.getAddress();
  });

 

  
});  