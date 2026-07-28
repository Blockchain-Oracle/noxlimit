// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IFixedInputQuote} from "../interfaces/IFixedInputQuote.sol";

contract MutableFixedInputQuote is IFixedInputQuote {
    uint256 public quote;

    constructor(uint256 initialQuote) {
        quote = initialQuote;
    }

    function setQuote(uint256 newQuote) external {
        quote = newQuote;
    }

    function calcBuyAmount(uint256, uint256) external view returns (uint256) {
        return quote;
    }
}
