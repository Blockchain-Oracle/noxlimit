// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ISettlementPriceAdapter} from "./ISettlementPriceAdapter.sol";

interface IChainlinkAggregatorV3 {
    function decimals() external view returns (uint8);

    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
}

interface IChainlinkPhaseProxy is IChainlinkAggregatorV3 {
    function phaseAggregators(uint16 phaseId) external view returns (address);
}

/// @notice Phase-aware historical Chainlink adapter for objective binary-market settlement.
/// @dev The caller supplies the selected observation and its predecessor. This contract proves
/// adjacency inside a phase, or proves that round 1 follows the terminal round of the prior phase.
contract ChainlinkRoundAdapter is ISettlementPriceAdapter {
    uint256 private constant PHASE_OFFSET = 64;
    uint256 private constant AGGREGATOR_ROUND_MASK = type(uint64).max;

    error InvalidFeed();
    error InvalidRound();
    error InvalidObservation();
    error NonAdjacentRounds();
    error UnsupportedDecimals();

    IChainlinkPhaseProxy public immutable feed;
    bytes32 public immutable override assetId;
    uint8 public immutable feedDecimals;

    constructor(bytes32 assetId_, IChainlinkPhaseProxy feed_) {
        if (assetId_ == bytes32(0) || address(feed_).code.length == 0) revert InvalidFeed();
        uint8 decimals_ = feed_.decimals();
        if (decimals_ > 36) revert UnsupportedDecimals();
        assetId = assetId_;
        feed = feed_;
        feedDecimals = decimals_;
    }

    function firstObservationAtOrAfter(
        uint64 timestamp,
        uint80 selectedRoundId,
        uint80 predecessorRoundId
    ) external view override returns (int256 priceWad, uint64 observedAt) {
        if (timestamp == 0 || selectedRoundId == 0 || predecessorRoundId == 0) {
            revert InvalidRound();
        }

        (uint80 selectedId, int256 selectedAnswer,, uint256 selectedUpdatedAt,) =
            feed.getRoundData(selectedRoundId);
        (uint80 predecessorId, int256 predecessorAnswer,, uint256 predecessorUpdatedAt,) =
            feed.getRoundData(predecessorRoundId);

        if (selectedId != selectedRoundId || predecessorId != predecessorRoundId) {
            revert InvalidRound();
        }
        if (
            selectedAnswer <= 0 || predecessorAnswer <= 0 || selectedUpdatedAt == 0
                || predecessorUpdatedAt == 0 || selectedUpdatedAt > type(uint64).max
                || predecessorUpdatedAt > type(uint64).max
        ) revert InvalidObservation();
        if (selectedUpdatedAt < timestamp || predecessorUpdatedAt >= timestamp) {
            revert InvalidObservation();
        }

        _requireAdjacent(selectedRoundId, predecessorRoundId);
        priceWad = _toWad(selectedAnswer);
        observedAt = uint64(selectedUpdatedAt);
    }

    function _requireAdjacent(uint80 selectedRoundId, uint80 predecessorRoundId) private view {
        uint16 selectedPhase = uint16(uint256(selectedRoundId) >> PHASE_OFFSET);
        uint16 predecessorPhase = uint16(uint256(predecessorRoundId) >> PHASE_OFFSET);
        uint64 selectedAggregatorRound = uint64(uint256(selectedRoundId) & AGGREGATOR_ROUND_MASK);
        uint64 predecessorAggregatorRound =
            uint64(uint256(predecessorRoundId) & AGGREGATOR_ROUND_MASK);

        if (selectedPhase == 0 || predecessorPhase == 0) revert InvalidRound();
        if (selectedPhase == predecessorPhase) {
            if (
                selectedAggregatorRound == 0 || predecessorAggregatorRound == type(uint64).max
                    || selectedAggregatorRound != predecessorAggregatorRound + 1
            ) revert NonAdjacentRounds();
            return;
        }

        if (
            selectedPhase != predecessorPhase + 1 || selectedAggregatorRound != 1
                || predecessorAggregatorRound == 0
        ) revert NonAdjacentRounds();

        address previousAggregator = feed.phaseAggregators(predecessorPhase);
        address selectedAggregator = feed.phaseAggregators(selectedPhase);
        if (previousAggregator.code.length == 0 || selectedAggregator.code.length == 0) {
            revert InvalidFeed();
        }
        (uint80 lastPreviousRound,,,,) = IChainlinkAggregatorV3(previousAggregator).getRoundData(
            predecessorAggregatorRound
        );
        (uint80 latestPreviousRound,,,,) =
            IChainlinkAggregatorV3(previousAggregator).latestRoundData();
        if (
            lastPreviousRound != predecessorAggregatorRound
                || latestPreviousRound != predecessorAggregatorRound
        ) revert NonAdjacentRounds();
    }

    function _toWad(int256 answer) private view returns (int256 normalized) {
        if (feedDecimals == 18) {
            normalized = answer;
        } else if (feedDecimals < 18) {
            int256 scale = int256(10 ** (18 - feedDecimals));
            if (answer > type(int256).max / scale) revert InvalidObservation();
            normalized = answer * scale;
        } else {
            normalized = answer / int256(10 ** (feedDecimals - 18));
        }
        if (normalized <= 0) revert InvalidObservation();
    }
}
