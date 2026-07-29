// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

contract MockPhaseAggregator {
    struct Round {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
    }

    mapping(uint80 roundId => Round round) private _rounds;
    uint80 public latestRoundId;

    function setRound(uint80 roundId, int256 answer, uint256 updatedAt) external {
        _rounds[roundId] = Round(answer, updatedAt, updatedAt);
        if (roundId > latestRoundId) latestRoundId = roundId;
    }

    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        Round memory round = _rounds[roundId];
        require(round.updatedAt != 0, "missing round");
        return (roundId, round.answer, round.startedAt, round.updatedAt, roundId);
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        Round memory round = _rounds[latestRoundId];
        require(round.updatedAt != 0, "missing latest round");
        return (
            latestRoundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            latestRoundId
        );
    }
}

contract MockChainlinkPhaseProxy {
    uint256 private constant PHASE_OFFSET = 64;

    uint8 public immutable decimals;
    mapping(uint16 phaseId => address aggregator) public phaseAggregators;
    uint16 public latestPhase;

    constructor(uint8 decimals_) {
        decimals = decimals_;
    }

    function setPhaseAggregator(uint16 phaseId, address aggregator) external {
        phaseAggregators[phaseId] = aggregator;
        if (phaseId > latestPhase) latestPhase = phaseId;
    }

    function getRoundData(uint80 proxyRoundId)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        uint16 phaseId = uint16(uint256(proxyRoundId) >> PHASE_OFFSET);
        uint80 aggregatorRoundId = uint80(uint64(proxyRoundId));
        address aggregator = phaseAggregators[phaseId];
        require(aggregator != address(0), "missing phase");
        (, int256 answer, uint256 startedAt, uint256 updatedAt,) =
            MockPhaseAggregator(aggregator).getRoundData(aggregatorRoundId);
        return (proxyRoundId, answer, startedAt, updatedAt, proxyRoundId);
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        address aggregator = phaseAggregators[latestPhase];
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt,) =
            MockPhaseAggregator(aggregator).latestRoundData();
        uint80 proxyRoundId = uint80((uint256(latestPhase) << PHASE_OFFSET) | roundId);
        return (proxyRoundId, answer, startedAt, updatedAt, proxyRoundId);
    }
}

contract MockSettlementPriceAdapter {
    bytes32 public immutable assetId;

    constructor(bytes32 assetId_) {
        assetId = assetId_;
    }

    function firstObservationAtOrAfter(uint64 timestamp, uint80, uint80)
        external
        pure
        returns (int256 priceWad, uint64 observedAt)
    {
        return (1e18, timestamp);
    }
}
