// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ISettlementPriceAdapter} from "../oracle/ISettlementPriceAdapter.sol";

interface IConditionalTokensResolver {
    function reportPayouts(bytes32 questionId, uint256[] calldata payouts) external;
}

/// @notice One-shot resolver for a curated YES/NO price market.
contract PriceBinaryResolver {
    error InvalidConfiguration();
    error ResolutionNotReady();
    error ObservationTooLate();
    error AlreadyResolved();

    IConditionalTokensResolver public immutable conditionalTokens;
    ISettlementPriceAdapter public immutable settlementAdapter;
    bytes32 public immutable questionId;
    bytes32 public immutable assetId;
    int256 public immutable strikePriceWad;
    uint64 public immutable tradingClosesAt;
    uint64 public immutable resolvesAt;
    uint64 public immutable maximumObservationDelay;

    bool public resolved;
    bool public resolvedYes;
    int256 public settlementPriceWad;
    uint64 public settlementObservedAt;
    uint80 public settlementRoundId;
    uint80 public predecessorRoundId;

    event MarketResolved(
        bytes32 indexed questionId,
        bool indexed yesWon,
        int256 settlementPriceWad,
        uint64 observedAt,
        uint80 selectedRoundId,
        uint80 predecessorRoundId
    );

    constructor(
        IConditionalTokensResolver conditionalTokens_,
        ISettlementPriceAdapter settlementAdapter_,
        bytes32 questionId_,
        int256 strikePriceWad_,
        uint64 tradingClosesAt_,
        uint64 resolvesAt_,
        uint64 maximumObservationDelay_
    ) {
        if (
            address(conditionalTokens_).code.length == 0
                || address(settlementAdapter_).code.length == 0 || questionId_ == bytes32(0)
                || strikePriceWad_ <= 0 || tradingClosesAt_ <= block.timestamp
                || resolvesAt_ <= tradingClosesAt_ || maximumObservationDelay_ == 0
        ) revert InvalidConfiguration();
        bytes32 assetId_ = settlementAdapter_.assetId();
        if (assetId_ == bytes32(0)) revert InvalidConfiguration();
        conditionalTokens = conditionalTokens_;
        settlementAdapter = settlementAdapter_;
        questionId = questionId_;
        assetId = assetId_;
        strikePriceWad = strikePriceWad_;
        tradingClosesAt = tradingClosesAt_;
        resolvesAt = resolvesAt_;
        maximumObservationDelay = maximumObservationDelay_;
    }

    function conditionId() external view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), questionId, uint256(2)));
    }

    function resolve(uint80 selectedRoundId, uint80 priorRoundId) external returns (bool yesWon) {
        if (resolved) revert AlreadyResolved();
        if (block.timestamp < resolvesAt) revert ResolutionNotReady();
        (int256 priceWad, uint64 observedAt) = settlementAdapter.firstObservationAtOrAfter(
            resolvesAt, selectedRoundId, priorRoundId
        );
        if (observedAt > uint256(resolvesAt) + maximumObservationDelay) {
            revert ObservationTooLate();
        }

        yesWon = priceWad >= strikePriceWad;
        resolved = true;
        resolvedYes = yesWon;
        settlementPriceWad = priceWad;
        settlementObservedAt = observedAt;
        settlementRoundId = selectedRoundId;
        predecessorRoundId = priorRoundId;

        uint256[] memory payouts = new uint256[](2);
        payouts[yesWon ? 0 : 1] = 1;
        conditionalTokens.reportPayouts(questionId, payouts);
        emit MarketResolved(
            questionId, yesWon, priceWad, observedAt, selectedRoundId, priorRoundId
        );
    }
}
