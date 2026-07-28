pragma solidity 0.5.17;

import { ConditionalTokens } from "@gnosis.pm/conditional-tokens-contracts/contracts/ConditionalTokens.sol";
import { FixedProductMarketMaker } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMaker.sol";
import { FixedProductMarketMakerFactory } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMakerFactory.sol";
import { ERC20Mintable } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract GateBTestCollateral is ERC20Mintable {}


contract GateBConditionalTokens is ConditionalTokens {}


contract GateBFixedProductMarketMaker is FixedProductMarketMaker {}


contract GateBFixedProductMarketMakerFactory is FixedProductMarketMakerFactory {}
