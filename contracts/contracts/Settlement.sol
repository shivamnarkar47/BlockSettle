// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICashToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ISecurityToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Settlement {
    address public owner;
    address public cashToken;
    address public securityToken;
    
    uint256 public settlementCount;
    
    event TradeProposed(
        address indexed buyer,
        address indexed seller,
        uint256 securityAmount,
        uint256 cashAmount,
        uint256 timestamp
    );
    
    event TradeSettled(
        address indexed buyer,
        address indexed seller,
        uint256 securityAmount,
        uint256 cashAmount,
        uint256 timestamp
    );
    
    event TradeFailed(
        address indexed buyer,
        address indexed seller,
        string reason,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setTokens(address _cashToken, address _securityToken) external onlyOwner {
        cashToken = _cashToken;
        securityToken = _securityToken;
    }
    
    function settleTrade(
        address buyer,
        address seller,
        uint256 securityAmount,
        uint256 cashAmount
    ) external returns (bool settled) {
        require(cashToken != address(0), "Cash token not set");
        require(securityToken != address(0), "Security token not set");
        
        emit TradeProposed(buyer, seller, securityAmount, cashAmount, block.timestamp);
        
        uint256 buyerCashBalance = ICashToken(cashToken).balanceOf(buyer);
        uint256 sellerSecBalance = ISecurityToken(securityToken).balanceOf(seller);
        
        if (buyerCashBalance < cashAmount) {
            emit TradeFailed(buyer, seller, "Insufficient cash balance", block.timestamp);
            return false;
        }
        
        if (sellerSecBalance < securityAmount) {
            emit TradeFailed(buyer, seller, "Insufficient security balance", block.timestamp);
            return false;
        }
        
        bool cashTransferred = ICashToken(cashToken).transferFrom(buyer, seller, cashAmount);
        if (!cashTransferred) {
            emit TradeFailed(buyer, seller, "Cash transfer failed", block.timestamp);
            return false;
        }
        
        bool securityTransferred = ISecurityToken(securityToken).transferFrom(seller, buyer, securityAmount);
        if (!securityTransferred) {
            emit TradeFailed(buyer, seller, "Security transfer failed", block.timestamp);
            return false;
        }
        
        settlementCount++;
        emit TradeSettled(buyer, seller, securityAmount, cashAmount, block.timestamp);
        return true;
    }
    
    function getSettlementCount() external view returns (uint256) {
        return settlementCount;
    }
}