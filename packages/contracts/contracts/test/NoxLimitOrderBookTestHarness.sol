// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {
    IERC20Bound,
    IConditionalTokensBound,
    IFixedProductMarketMakerBound,
    NoxLimitOrderBook
} from "../NoxLimitOrderBook.sol";

/// @dev Test-only state seeding for otherwise unreachable global replay-guard mutations.
contract NoxLimitOrderBookTestHarness is NoxLimitOrderBook {
    constructor(
        address worker_,
        IFixedProductMarketMakerBound fpmm_,
        IConditionalTokensBound conditionalTokens_,
        IERC20Bound collateral_,
        bytes32 conditionId_,
        uint64 tradingClosesAt_,
        uint64 evaluationTimeout_,
        uint64 publicationTimeout_,
        uint64 minimumEvaluationInterval_,
        uint8 maximumEvaluations_
    )
        NoxLimitOrderBook(
            worker_,
            fpmm_,
            conditionalTokens_,
            collateral_,
            conditionId_,
            tradingClosesAt_,
            evaluationTimeout_,
            publicationTimeout_,
            minimumEvaluationInterval_,
            maximumEvaluations_
        )
    {}

    function seedResultConsumed(bytes32 resultKey) external {
        resultConsumed[resultKey] = true;
    }
}
