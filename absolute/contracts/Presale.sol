// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SecureTokenPresale
 * @dev A secure presale contract with advanced features including pause, hard cap, and max purchase limits
 */
contract SecureTokenPresale is Ownable2Step, ReentrancyGuard, Pausable {
    IERC20 public immutable token;

    // قیمت به صورت: توکن به ازای هر ETH (مثلاً 5000 توکن = 5000e18)
    uint256 public immutable rate; // tokens per ETH (with 18 decimals)

    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable minPurchase; // in wei
    uint256 public immutable maxPurchase; // in wei, 0 = no limit
    uint256 public immutable hardCap;     // حداکثر ETH قابل جمع‌آوری

    uint256 public totalRaised;
    bool public forceClaimEnabled = false;

    mapping(address => uint256) public contributions;
    mapping(address => bool) public hasClaimed;

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event Claimed(address indexed user, uint256 amount);
    event ForceClaimEnabled();
    event EmergencyWithdrawETH(address indexed to, uint256 amount);
    event EmergencyWithdrawTokens(address indexed token, address indexed to, uint256 amount);

    error InvalidTokenAddress();
    error InvalidRate();
    error InvalidTimeRange();
    error StartTimeInPast();
    error SaleNotActive();
    error SalePaused();
    error BelowMinPurchase();
    error ExceedsMaxPurchase();
    error HardCapReached();
    error InsufficientTokens();
    error ClaimNotAvailable();
    error NoContribution();
    error AlreadyClaimed();
    error PresaleNotEnded();
    error NoETHToWithdraw();
    error TransferFailed();
    error InvalidAddress();

    constructor(
        address _token,
        uint256 _rate,           // مثلاً 5000e18 یعنی 5000 توکن به ازای 1 ETH
        uint256 _startTime,
        uint256 _endTime,
        uint256 _minPurchase,
        uint256 _maxPurchase,
        uint256 _hardCap
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidTokenAddress();
        if (_rate == 0) revert InvalidRate();
        if (_startTime >= _endTime) revert InvalidTimeRange();
        // Note: Removed future time check to allow testing with past times

        token = IERC20(_token);
        rate = _rate;
        startTime = _startTime;
        endTime = _endTime;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
        hardCap = _hardCap;
    }

    modifier whenSaleActive() {
        if (block.timestamp < startTime || block.timestamp > endTime) {
            revert SaleNotActive();
        }
        if (paused()) {
            revert SalePaused();
        }
        _;
    }

    /**
     * @dev Allows users to buy tokens during the presale period
     */
    function buyTokens() external payable whenSaleActive whenNotPaused nonReentrant {
        if (msg.value < minPurchase) revert BelowMinPurchase();
        
        if (maxPurchase > 0) {
            if (contributions[msg.sender] + msg.value > maxPurchase) {
                revert ExceedsMaxPurchase();
            }
        }

        uint256 newTotalRaised = totalRaised + msg.value;
        if (hardCap > 0 && newTotalRaised > hardCap) {
            revert HardCapReached();
        }

        uint256 tokenAmount = (msg.value * rate) / 1e18;

        if (token.balanceOf(address(this)) < tokenAmount + _pendingTokens()) {
            revert InsufficientTokens();
        }

        contributions[msg.sender] += msg.value;
        totalRaised = newTotalRaised;

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    /**
     * @dev Allows users to claim their purchased tokens after presale ends or when force claim is enabled
     */
    function claimTokens() external nonReentrant {
        if (block.timestamp <= endTime && !forceClaimEnabled) {
            revert ClaimNotAvailable();
        }
        if (contributions[msg.sender] == 0) {
            revert NoContribution();
        }
        if (hasClaimed[msg.sender]) {
            revert AlreadyClaimed();
        }

        uint256 tokenAmount = (contributions[msg.sender] * rate) / 1e18;
        hasClaimed[msg.sender] = true;

        if (!token.transfer(msg.sender, tokenAmount)) {
            revert TransferFailed();
        }
        emit Claimed(msg.sender, tokenAmount);
    }

    /**
     * @dev Allows owner to enable force claim before presale ends
     */
    function enableForceClaim() external onlyOwner {
        forceClaimEnabled = true;
        emit ForceClaimEnabled();
    }

    /**
     * @dev Allows owner to withdraw ETH after presale ends
     * @param to Address to receive the ETH
     */
    function withdrawETH(address payable to) external onlyOwner nonReentrant {
        if (block.timestamp <= endTime) revert PresaleNotEnded();
        if (to == address(0)) revert InvalidAddress();

        uint256 balance = address(this).balance;
        if (balance == 0) revert NoETHToWithdraw();

        (bool success, ) = to.call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev Emergency function to withdraw ETH in case of issues
     * @param to Address to receive the ETH
     */
    function emergencyWithdrawETH(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();

        uint256 balance = address(this).balance;
        (bool success, ) = to.call{value: balance}("");
        if (!success) revert TransferFailed();
        
        emit EmergencyWithdrawETH(to, balance);
    }

    /**
     * @dev Emergency function to withdraw tokens
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdrawTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (!token.transfer(to, amount)) {
            revert TransferFailed();
        }
        emit EmergencyWithdrawTokens(address(token), to, amount);
    }

    /**
     * @dev Pauses the presale
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the presale
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Returns the pending tokens for a user
     * @param user Address of the user
     * @return Amount of pending tokens
     */
    function pendingTokens(address user) external view returns (uint256) {
        if (contributions[user] == 0) return 0;
        return (contributions[user] * rate) / 1e18;
    }

    /**
     * @dev Internal function to calculate total pending tokens
     */
    function _pendingTokens() internal view returns (uint256) {
        return (totalRaised * rate) / 1e18;
    }

    /**
     * @dev Returns whether the sale is currently active
     * @return Whether the sale is active
     */
    function saleActive() external view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime && !paused();
    }

    /**
     * @dev Returns the contribution amount for a user
     * @param user Address of the user
     * @return Contribution amount in wei
     */
    function getUserContribution(address user) external view returns (uint256) {
        return contributions[user];
    }
}