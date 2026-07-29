// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/// @notice Explicitly valueless six-decimal collateral for the NoxLimit Sepolia product.
contract NoxLimitTestUSDC {
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidRecipient();
    error NotIssuer();

    string public constant name = "NoxLimit Test USDC";
    string public constant symbol = "NLTUSDC";
    uint8 public constant decimals = 6;

    address public immutable issuer;
    uint256 public totalSupply;
    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address issuer_) {
        if (issuer_ == address(0)) revert InvalidRecipient();
        issuer = issuer_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != issuer) revert NotIssuer();
        if (to == address(0)) revert InvalidRecipient();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        if (approved < amount) revert InsufficientAllowance();
        if (approved != type(uint256).max) {
            allowance[from][msg.sender] = approved - amount;
            emit Approval(from, msg.sender, approved - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (to == address(0)) revert InvalidRecipient();
        uint256 balance = balanceOf[from];
        if (balance < amount) revert InsufficientBalance();
        balanceOf[from] = balance - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
