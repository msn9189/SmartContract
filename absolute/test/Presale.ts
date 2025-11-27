import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TokenPresale", function () {
    let owner: any;
    let user1: any;
    let user2: any;

    beforeEach(async function () {
        const TokenPresale = await ethers.deployContract("PresaleToken");
        [owner, user1, user2] = await ethers.getSigners();

    })
})
