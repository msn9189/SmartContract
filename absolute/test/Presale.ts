import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TokenPresale", function () {
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const token = await ethers.deployContract("MockToken", ["MockToken","MTK"]);
    await token.waitForDeployment();
    const TokenPresale = await ethers.deployContract("PresaleToken");
  });
});  