// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/// @notice Returns one normalized settlement observation and proves it is the first feed update
/// at or after the requested timestamp.
interface ISettlementPriceAdapter {
    function assetId() external view returns (bytes32);

    function firstObservationAtOrAfter(
        uint64 timestamp,
        uint80 selectedRoundId,
        uint80 predecessorRoundId
    ) external view returns (int256 priceWad, uint64 observedAt);
}
