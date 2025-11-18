// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Presale is Ownable {
  IERC20 public token;
  uint256 public tokenPrice;
  uint256 public startTime;
  uint256 public endTime;
  uint256 public minPurchase;
  bool public transfersUnlocked;


  mapping(address => uint256) public purchasedTokens;

  event Bought(address indexed buyer, uint amountETH, uint256 tokens);
  event WithdrawETH(address indexed owner, uint256 amount);
  event UnlockTransfers();

  
}
