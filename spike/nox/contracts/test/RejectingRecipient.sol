// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

contract RejectingRecipient {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        revert("reject outcome shares");
    }
}

contract LargeRevertRecipient {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        assembly {
            revert(0, 0x10000)
        }
    }
}
