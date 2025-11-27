// SPDX-License_Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("MOCKTOKEN", "MTK") {}

    function mint(address to, uint256 value) external {
        _mint(to, value);
    }
}