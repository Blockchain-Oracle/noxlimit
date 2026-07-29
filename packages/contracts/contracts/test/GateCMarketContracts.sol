pragma solidity 0.5.17;

import { ConditionalTokens } from "@gnosis.pm/conditional-tokens-contracts/contracts/ConditionalTokens.sol";
import { FixedProductMarketMaker } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMaker.sol";
import { FixedProductMarketMakerFactory } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMakerFactory.sol";
import { ERC20Mintable } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract GateCTestCollateral is ERC20Mintable {}


contract GateCSixDecimalCollateral is ERC20Mintable, ERC20Detailed {
    constructor() ERC20Detailed("NoxLimit Test USDC", "nlUSDC", 6) public {}
}


contract GateCConditionalTokens is ConditionalTokens {}


contract GateCFixedProductMarketMaker is FixedProductMarketMaker {}


contract GateCFixedProductMarketMakerFactory is FixedProductMarketMakerFactory {}
