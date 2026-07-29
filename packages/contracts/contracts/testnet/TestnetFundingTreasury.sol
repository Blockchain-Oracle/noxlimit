// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IERC20Funding {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Relayed, user-authorized Sepolia onboarding and explicit low-balance refills.
/// @dev The user signs; any sponsor may relay and pay gas. Targets, cooldown, and lifetime caps are
/// immutable deployment policy. This contract never refills a wallet automatically.
contract TestnetFundingTreasury {
    bytes32 private constant FUNDING_CLAIM_TYPEHASH =
        keccak256("FundingClaim(address recipient,uint256 nonce,uint64 deadline)");
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("NoxLimit Testnet Funding");
    bytes32 private constant VERSION_HASH = keccak256("1");
    uint256 private constant SECP256K1_HALF_N =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    error CooldownActive(uint64 nextEligibleAt);
    error ExpiredAuthorization();
    error InvalidConfiguration();
    error InvalidNonce(uint256 expected, uint256 actual);
    error InvalidSignature();
    error NothingToFund();
    error TokenTransferFailed();

    IERC20Funding public immutable collateral;
    uint256 public immutable nativeTarget;
    uint256 public immutable collateralTarget;
    uint256 public immutable nativePerClaimCap;
    uint256 public immutable collateralPerClaimCap;
    uint256 public immutable nativeLifetimeCap;
    uint256 public immutable collateralLifetimeCap;
    uint64 public immutable cooldown;
    bytes32 public immutable DOMAIN_SEPARATOR;

    mapping(address recipient => uint256 nonce) public nonces;
    mapping(address recipient => uint64 timestamp) public lastClaimAt;
    mapping(address recipient => uint256 amount) public nativeGranted;
    mapping(address recipient => uint256 amount) public collateralGranted;

    event FundingClaimed(
        address indexed recipient,
        uint256 indexed nonce,
        uint256 nativeAmount,
        uint256 collateralAmount,
        uint64 nextEligibleAt
    );

    constructor(
        IERC20Funding collateral_,
        uint256 nativeTarget_,
        uint256 collateralTarget_,
        uint256 nativePerClaimCap_,
        uint256 collateralPerClaimCap_,
        uint256 nativeLifetimeCap_,
        uint256 collateralLifetimeCap_,
        uint64 cooldown_
    ) {
        if (
            address(collateral_).code.length == 0 || nativeTarget_ == 0
                || collateralTarget_ == 0 || nativePerClaimCap_ == 0
                || collateralPerClaimCap_ == 0 || nativeLifetimeCap_ < nativePerClaimCap_
                || collateralLifetimeCap_ < collateralPerClaimCap_ || cooldown_ == 0
        ) revert InvalidConfiguration();
        collateral = collateral_;
        nativeTarget = nativeTarget_;
        collateralTarget = collateralTarget_;
        nativePerClaimCap = nativePerClaimCap_;
        collateralPerClaimCap = collateralPerClaimCap_;
        nativeLifetimeCap = nativeLifetimeCap_;
        collateralLifetimeCap = collateralLifetimeCap_;
        cooldown = cooldown_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
    }

    receive() external payable {}

    function claim(address recipient, uint256 nonce, uint64 deadline, bytes calldata signature)
        external
        returns (uint256 nativeAmount, uint256 collateralAmount)
    {
        if (deadline < block.timestamp) revert ExpiredAuthorization();
        uint256 expectedNonce = nonces[recipient];
        if (nonce != expectedNonce) revert InvalidNonce(expectedNonce, nonce);
        _requireRecipientSignature(recipient, nonce, deadline, signature);

        uint64 previousClaimAt = lastClaimAt[recipient];
        if (previousClaimAt != 0 && block.timestamp < uint256(previousClaimAt) + cooldown) {
            revert CooldownActive(previousClaimAt + cooldown);
        }

        nativeAmount = _fundingAmount(
            nativeTarget,
            recipient.balance,
            nativePerClaimCap,
            nativeLifetimeCap,
            nativeGranted[recipient],
            address(this).balance
        );
        collateralAmount = _fundingAmount(
            collateralTarget,
            collateral.balanceOf(recipient),
            collateralPerClaimCap,
            collateralLifetimeCap,
            collateralGranted[recipient],
            collateral.balanceOf(address(this))
        );
        if (nativeAmount == 0 && collateralAmount == 0) revert NothingToFund();

        nonces[recipient] = expectedNonce + 1;
        lastClaimAt[recipient] = uint64(block.timestamp);
        nativeGranted[recipient] += nativeAmount;
        collateralGranted[recipient] += collateralAmount;

        if (collateralAmount != 0 && !collateral.transfer(recipient, collateralAmount)) {
            revert TokenTransferFailed();
        }
        if (nativeAmount != 0) {
            (bool success,) = recipient.call{value: nativeAmount}("");
            if (!success) revert TokenTransferFailed();
        }
        emit FundingClaimed(
            recipient,
            nonce,
            nativeAmount,
            collateralAmount,
            uint64(block.timestamp) + cooldown
        );
    }

    function preview(address recipient)
        external
        view
        returns (
            uint256 nativeAmount,
            uint256 collateralAmount,
            uint64 nextEligibleAt,
            uint256 nonce
        )
    {
        uint64 previousClaimAt = lastClaimAt[recipient];
        nextEligibleAt = previousClaimAt == 0 ? 0 : previousClaimAt + cooldown;
        nonce = nonces[recipient];
        if (nextEligibleAt > block.timestamp) return (0, 0, nextEligibleAt, nonce);
        nativeAmount = _fundingAmount(
            nativeTarget,
            recipient.balance,
            nativePerClaimCap,
            nativeLifetimeCap,
            nativeGranted[recipient],
            address(this).balance
        );
        collateralAmount = _fundingAmount(
            collateralTarget,
            collateral.balanceOf(recipient),
            collateralPerClaimCap,
            collateralLifetimeCap,
            collateralGranted[recipient],
            collateral.balanceOf(address(this))
        );
    }

    function fundingDigest(address recipient, uint256 nonce, uint64 deadline)
        external
        view
        returns (bytes32)
    {
        return _fundingDigest(recipient, nonce, deadline);
    }

    function _fundingAmount(
        uint256 target,
        uint256 current,
        uint256 perClaimCap,
        uint256 lifetimeCap,
        uint256 alreadyGranted,
        uint256 treasuryBalance
    ) private pure returns (uint256 amount) {
        if (current >= target || alreadyGranted >= lifetimeCap || treasuryBalance == 0) return 0;
        amount = target - current;
        uint256 remainingLifetime = lifetimeCap - alreadyGranted;
        if (amount > perClaimCap) amount = perClaimCap;
        if (amount > remainingLifetime) amount = remainingLifetime;
        if (amount > treasuryBalance) amount = treasuryBalance;
    }

    function _requireRecipientSignature(
        address recipient,
        uint256 nonce,
        uint64 deadline,
        bytes calldata signature
    ) private view {
        if (recipient == address(0) || signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > SECP256K1_HALF_N || (v != 27 && v != 28)) revert InvalidSignature();
        address recovered = ecrecover(_fundingDigest(recipient, nonce, deadline), v, r, s);
        if (recovered != recipient) revert InvalidSignature();
    }

    function _fundingDigest(address recipient, uint256 nonce, uint64 deadline)
        private
        view
        returns (bytes32)
    {
        bytes32 structHash =
            keccak256(abi.encode(FUNDING_CLAIM_TYPEHASH, recipient, nonce, deadline));
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }
}
