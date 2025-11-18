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

  constructor(
      address tokenAdress,
      uint256 _tokenPrice,
      uint256 _startTime,
      uint256 _endTime,
      uint256 _minPurchase
   ) Ownable(msg.sender) {
      require(_startTime < _endTime, "Start must be before end time");
      token = IERC20(tokenAdress);
      tokenPrice = _tokenPrice;
      startTime = _startTime;
      endTime = _endTime;
      minPurchase = _minPurchase;
      transfersUnlocked = false;
    }
    
    
  modifier onlyWhileOpen() {
      require(block.timestamp >= startTime && block.timestamp <= endTime, "Presale closed");
      _;
    }

  function buyTokens() external payable onlyWhileOpen {
      require(msg.value >= minPurchase, "Below minimum purchase");
      uint256 tokensToReceive = (msg.value * (10 ** 18)) / tokenPrice;
      require(token.balanceOf(address(this)) >= tokensToReceive, "Not enough tokens in presale contract");

      purchasedTokens[msg.sender] += tokensToReceive;

      emit Bought(msg.sender, msg.value, tokensToReceive);
    }

  function UnlockTransfers() external onlyOwner {
    transfersUnlocked = true;
    emit UnlockTransfers();
  }

  function WithdrawETH(address payable to) external onlyOwner {
    require(block.timestamp > endTime, "Presale not ended");
    uint256 balance = address(this).balance;
    require(balance > 0, "No ETH to withdraw");
    to.transfer(balance);
    emit WithdrawETH(to, balance);
  }




}

    
    
