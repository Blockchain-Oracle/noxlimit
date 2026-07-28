// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IFixedInputQuote {
    function calcBuyAmount(
        uint256 investmentAmount,
        uint256 outcomeIndex
    ) external view returns (uint256);
}
