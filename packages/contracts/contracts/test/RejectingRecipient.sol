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

contract ReentrantRefundRecipient {
    address public immutable target;
    uint256 public immutable orderId;

    uint256 public attempts;
    bool public reentrySucceeded;
    bytes4 public reentrySelector;

    constructor(address target_, uint256 orderId_) {
        target = target_;
        orderId = orderId_;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external returns (bytes4) {
        attempts += 1;
        (bool success, bytes memory result) =
            target.call(abi.encodeWithSignature("refund(uint256)", orderId));
        reentrySucceeded = success;

        if (!success && result.length >= 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(result, 0x20))
            }
            reentrySelector = selector;
        }

        return this.onERC1155Received.selector;
    }
}
