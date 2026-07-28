// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {
    Nox,
    ebool,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

interface IERC20Bound {
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IConditionalTokensBound {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function getCollectionId(
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256 indexSet
    ) external view returns (bytes32);
    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint256);
    function getPositionId(address collateralToken, bytes32 collectionId)
        external
        pure
        returns (uint256);
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;
}

interface IFixedProductMarketMakerBound {
    function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex)
        external
        view
        returns (uint256);
    function buy(
        uint256 investmentAmount,
        uint256 outcomeIndex,
        uint256 minOutcomeTokensToBuy
    ) external;
    function collateralToken() external view returns (address);
    function conditionalTokens() external view returns (address);
    function conditionIds(uint256 index) external view returns (bytes32);
}

/// @notice Disposable Prompt 3 adapter. It intentionally supports one curated binary FPMM.
/// @dev This is verification code, not an audited production contract.
contract NoxLimitOrderBook {
    enum Status {
        None,
        Open,
        Evaluating,
        PublicationPending,
        Executing,
        Filled,
        Cancelled,
        Expired,
        DisclosedRefundable,
        Refunded
    }

    struct Order {
        address owner;
        address recipient;
        uint128 amountIn;
        uint64 expiresAt;
        uint64 phaseDeadline;
        uint64 lastEvaluationAt;
        uint32 evaluationNonce;
        uint8 evaluationCount;
        uint8 outcomeIndex;
        Status status;
        euint256 encryptedMinOut;
        uint256 authorizedMinOut;
        uint256 outcomeTokens;
    }

    error CallbackNotObserved();
    error CandidateAlreadyAssigned(bytes32 candidate);
    error ConstructorBindingMismatch();
    error EvaluationCadence();
    error EvaluationLimit();
    error InputAlreadyUsed(bytes32 handle);
    error InvalidAmount();
    error InvalidExpiry();
    error InsufficientFinalizeGas();
    error InvalidNonce(uint32 expected, uint32 actual);
    error InvalidOutcome();
    error InvalidRecipient();
    error InvalidStatus(Status expected, Status actual);
    error NotExpired();
    error NotOrderOwner();
    error NotSelf();
    error NotWorker();
    error ReentrantCall();
    error ResultAlreadyConsumed(bytes32 key);
    error TokenCallFailed();
    error UnexpectedERC1155();
    error UnexpectedAllowance();
    error ZeroOutcomeDelta();

    address public immutable worker;
    IFixedProductMarketMakerBound public immutable fpmm;
    IConditionalTokensBound public immutable conditionalTokens;
    IERC20Bound public immutable collateral;
    bytes32 public immutable conditionId;
    uint256 public immutable yesPositionId;
    uint256 public immutable noPositionId;
    uint64 public immutable evaluationTimeout;
    uint64 public immutable publicationTimeout;
    uint64 public immutable minimumEvaluationInterval;
    uint8 public immutable maximumEvaluations;

    uint256 public constant EXECUTION_GAS_LIMIT = 1_500_000;
    uint256 public constant EXECUTION_GAS_RESERVE = 150_000;

    uint256 public nextOrderId = 1;

    mapping(uint256 orderId => Order order) private _orders;
    mapping(uint256 orderId => mapping(uint32 nonce => euint256 candidate)) private _candidates;
    mapping(bytes32 inputHandle => bool used) public inputUsed;
    mapping(bytes32 candidateHandle => bool assigned) public candidateAssigned;
    mapping(bytes32 resultKey => bool consumed) public resultConsumed;

    bool private _locked;
    bool private _executionActive;
    bool private _callbackObserved;
    uint256 private _activePositionId;
    uint256 private _receivedAmount;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        address indexed recipient,
        uint8 outcomeIndex,
        uint256 amountIn,
        uint64 expiresAt,
        bytes32 encryptedMinOut
    );
    event EvaluationRequested(
        uint256 indexed orderId,
        uint32 indexed nonce,
        uint256 quote,
        bytes32 candidate
    );
    event PublicationRequested(uint256 indexed orderId, uint32 indexed nonce, bytes32 candidate);
    event EvaluationReopened(uint256 indexed orderId, uint32 indexed nonce);
    event Filled(
        uint256 indexed orderId,
        uint32 indexed nonce,
        uint256 minOut,
        uint256 outcomeTokens
    );
    event ExecutionFailed(uint256 indexed orderId, uint32 indexed nonce, bytes reason);
    event Terminal(uint256 indexed orderId, Status status);
    event Refunded(uint256 indexed orderId, address indexed owner, uint256 amount);

    modifier onlyWorker() {
        if (msg.sender != worker) revert NotWorker();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert ReentrantCall();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(
        address worker_,
        IFixedProductMarketMakerBound fpmm_,
        IConditionalTokensBound conditionalTokens_,
        IERC20Bound collateral_,
        bytes32 conditionId_,
        uint64 evaluationTimeout_,
        uint64 publicationTimeout_,
        uint64 minimumEvaluationInterval_,
        uint8 maximumEvaluations_
    ) {
        if (
            worker_ == address(0) ||
            address(fpmm_).code.length == 0 ||
            address(conditionalTokens_).code.length == 0 ||
            address(collateral_).code.length == 0 ||
            maximumEvaluations_ == 0
        ) revert ConstructorBindingMismatch();
        if (
            fpmm_.conditionalTokens() != address(conditionalTokens_) ||
            fpmm_.collateralToken() != address(collateral_) ||
            fpmm_.conditionIds(0) != conditionId_ ||
            conditionalTokens_.getOutcomeSlotCount(conditionId_) != 2
        ) revert ConstructorBindingMismatch();

        (bool hasSecondCondition,) = address(fpmm_).staticcall{gas: 50_000}(
            abi.encodeWithSelector(IFixedProductMarketMakerBound.conditionIds.selector, 1)
        );
        if (hasSecondCondition) revert ConstructorBindingMismatch();

        bytes32 yesCollection = conditionalTokens_.getCollectionId(bytes32(0), conditionId_, 1);
        bytes32 noCollection = conditionalTokens_.getCollectionId(bytes32(0), conditionId_, 2);
        uint256 yesPosition = conditionalTokens_.getPositionId(address(collateral_), yesCollection);
        uint256 noPosition = conditionalTokens_.getPositionId(address(collateral_), noCollection);
        if (yesPosition == 0 || noPosition == 0 || yesPosition == noPosition) {
            revert ConstructorBindingMismatch();
        }

        worker = worker_;
        fpmm = fpmm_;
        conditionalTokens = conditionalTokens_;
        collateral = collateral_;
        conditionId = conditionId_;
        yesPositionId = yesPosition;
        noPositionId = noPosition;
        evaluationTimeout = evaluationTimeout_;
        publicationTimeout = publicationTimeout_;
        minimumEvaluationInterval = minimumEvaluationInterval_;
        maximumEvaluations = maximumEvaluations_;
    }

    function createOrder(
        address recipient,
        uint8 outcomeIndex,
        uint128 amountIn,
        uint64 expiresAt,
        externalEuint256 encryptedMinOut,
        bytes calldata inputProof
    ) external nonReentrant returns (uint256 orderId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (outcomeIndex > 1) revert InvalidOutcome();
        if (amountIn == 0) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        euint256 minOut = Nox.fromExternal(encryptedMinOut, inputProof);
        bytes32 inputHandle = euint256.unwrap(minOut);
        if (inputUsed[inputHandle]) revert InputAlreadyUsed(inputHandle);

        inputUsed[inputHandle] = true;
        Nox.allowThis(minOut);
        _safeTransferFrom(collateral, msg.sender, address(this), amountIn);

        orderId = nextOrderId++;
        Order storage order = _orders[orderId];
        order.owner = msg.sender;
        order.recipient = recipient;
        order.amountIn = amountIn;
        order.expiresAt = expiresAt;
        order.outcomeIndex = outcomeIndex;
        order.status = Status.Open;
        order.encryptedMinOut = minOut;

        emit OrderCreated(
            orderId,
            msg.sender,
            recipient,
            outcomeIndex,
            amountIn,
            expiresAt,
            inputHandle
        );
    }

    function requestEvaluation(uint256 orderId) external onlyWorker returns (uint32 nonce) {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Open);
        if (block.timestamp >= order.expiresAt) revert InvalidExpiry();
        if (order.evaluationCount >= maximumEvaluations) revert EvaluationLimit();
        if (
            order.lastEvaluationAt != 0 &&
            block.timestamp < uint256(order.lastEvaluationAt) + minimumEvaluationInterval
        ) revert EvaluationCadence();

        nonce = ++order.evaluationNonce;
        ++order.evaluationCount;
        euint256 publicNonce = Nox.toEuint256(uint256(nonce));
        euint256 freshZero = Nox.sub(publicNonce, publicNonce);
        euint256 evaluationMinOut = Nox.add(order.encryptedMinOut, freshZero);
        uint256 quote = fpmm.calcBuyAmount(order.amountIn, order.outcomeIndex);
        ebool eligible = Nox.ge(Nox.toEuint256(quote), evaluationMinOut);
        euint256 candidate = Nox.select(eligible, evaluationMinOut, Nox.toEuint256(0));
        bytes32 candidateHandle = euint256.unwrap(candidate);
        if (candidateAssigned[candidateHandle]) revert CandidateAlreadyAssigned(candidateHandle);

        candidateAssigned[candidateHandle] = true;
        Nox.allowThis(candidate);
        Nox.addViewer(candidate, worker);
        _candidates[orderId][nonce] = candidate;
        order.status = Status.Evaluating;
        order.lastEvaluationAt = uint64(block.timestamp);
        order.phaseDeadline = uint64(block.timestamp) + evaluationTimeout;

        emit EvaluationRequested(orderId, nonce, quote, candidateHandle);
    }

    function requestPublication(uint256 orderId, uint32 nonce) external onlyWorker {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Evaluating);
        _requireNonce(order, nonce);
        if (block.timestamp >= order.expiresAt || block.timestamp >= order.phaseDeadline) {
            revert InvalidExpiry();
        }

        euint256 candidate = _candidates[orderId][nonce];
        Nox.allowPublicDecryption(candidate);
        order.status = Status.PublicationPending;
        order.phaseDeadline = uint64(block.timestamp) + publicationTimeout;
        emit PublicationRequested(orderId, nonce, euint256.unwrap(candidate));
    }

    function finalize(uint256 orderId, uint32 nonce, bytes calldata decryptionProof)
        external
        nonReentrant
        returns (uint256 plaintext)
    {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.PublicationPending);
        _requireNonce(order, nonce);
        if (block.timestamp >= order.expiresAt || block.timestamp >= order.phaseDeadline) {
            order.status = Status.DisclosedRefundable;
            order.phaseDeadline = 0;
            emit Terminal(orderId, Status.DisclosedRefundable);
            return 0;
        }

        euint256 candidate = _candidates[orderId][nonce];
        plaintext = Nox.publicDecrypt(candidate, decryptionProof);
        bytes32 resultKey = keccak256(abi.encode(euint256.unwrap(candidate), plaintext));
        if (resultConsumed[resultKey]) revert ResultAlreadyConsumed(resultKey);
        resultConsumed[resultKey] = true;

        if (plaintext == 0) {
            order.status = Status.Open;
            order.phaseDeadline = 0;
            emit EvaluationReopened(orderId, nonce);
            return plaintext;
        }

        order.authorizedMinOut = plaintext;
        order.status = Status.Executing;
        order.phaseDeadline = 0;
        if (gasleft() < EXECUTION_GAS_LIMIT + EXECUTION_GAS_RESERVE) {
            revert InsufficientFinalizeGas();
        }
        try this.executeAndForward{gas: EXECUTION_GAS_LIMIT}(orderId, plaintext) returns (
            uint256 outcomeTokens
        ) {
            order.outcomeTokens = outcomeTokens;
            order.status = Status.Filled;
            emit Filled(orderId, nonce, plaintext, outcomeTokens);
        } catch {
            order.status = Status.DisclosedRefundable;
            // Do not copy or emit unbounded downstream revert data. A hostile recipient could
            // otherwise exhaust the reserved outer gas and prevent this refund state persisting.
            emit ExecutionFailed(orderId, nonce, bytes(""));
        }
    }

    function executeAndForward(uint256 orderId, uint256 minOut)
        external
        returns (uint256 outcomeTokens)
    {
        if (msg.sender != address(this)) revert NotSelf();
        if (!_locked) revert ReentrantCall();
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Executing);
        if (order.authorizedMinOut != minOut || minOut == 0) revert InvalidAmount();

        uint256 positionId = _positionId(order.outcomeIndex);
        uint256 beforeBalance = conditionalTokens.balanceOf(address(this), positionId);
        _executionActive = true;
        _callbackObserved = false;
        _activePositionId = positionId;
        _receivedAmount = 0;

        if (collateral.allowance(address(this), address(fpmm)) != 0) revert UnexpectedAllowance();
        _safeApprove(collateral, address(fpmm), order.amountIn);
        fpmm.buy(order.amountIn, order.outcomeIndex, minOut);
        _safeApprove(collateral, address(fpmm), 0);

        if (!_callbackObserved) revert CallbackNotObserved();
        uint256 afterBalance = conditionalTokens.balanceOf(address(this), positionId);
        if (afterBalance <= beforeBalance) revert ZeroOutcomeDelta();
        outcomeTokens = afterBalance - beforeBalance;
        if (outcomeTokens != _receivedAmount || outcomeTokens < minOut) revert UnexpectedERC1155();

        _executionActive = false;
        _activePositionId = 0;
        _receivedAmount = 0;
        conditionalTokens.safeTransferFrom(
            address(this), order.recipient, positionId, outcomeTokens, bytes("")
        );
        if (conditionalTokens.balanceOf(address(this), positionId) != beforeBalance) {
            revert UnexpectedERC1155();
        }
    }

    function expireEvaluation(uint256 orderId) external {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Evaluating);
        if (block.timestamp < order.phaseDeadline && block.timestamp < order.expiresAt) {
            revert NotExpired();
        }
        order.phaseDeadline = 0;
        if (block.timestamp >= order.expiresAt) {
            order.status = Status.Expired;
            emit Terminal(orderId, Status.Expired);
        } else {
            order.status = Status.Open;
            emit EvaluationReopened(orderId, order.evaluationNonce);
        }
    }

    function expirePublication(uint256 orderId) external {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.PublicationPending);
        if (block.timestamp < order.phaseDeadline && block.timestamp < order.expiresAt) {
            revert NotExpired();
        }
        order.status = Status.DisclosedRefundable;
        order.phaseDeadline = 0;
        emit Terminal(orderId, Status.DisclosedRefundable);
    }

    function cancel(uint256 orderId) external {
        Order storage order = _orders[orderId];
        if (msg.sender != order.owner) revert NotOrderOwner();
        if (order.status != Status.Open && order.status != Status.Evaluating) {
            revert InvalidStatus(Status.Open, order.status);
        }
        order.status = Status.Cancelled;
        order.phaseDeadline = 0;
        emit Terminal(orderId, Status.Cancelled);
    }

    function expireOrder(uint256 orderId) external {
        Order storage order = _orders[orderId];
        if (block.timestamp < order.expiresAt) revert NotExpired();
        if (order.status == Status.PublicationPending) {
            order.status = Status.DisclosedRefundable;
        } else if (order.status == Status.Open || order.status == Status.Evaluating) {
            order.status = Status.Expired;
        } else {
            revert InvalidStatus(Status.Open, order.status);
        }
        order.phaseDeadline = 0;
        emit Terminal(orderId, order.status);
    }

    function refund(uint256 orderId) external nonReentrant {
        Order storage order = _orders[orderId];
        if (msg.sender != order.owner) revert NotOrderOwner();
        if (
            order.status != Status.Cancelled &&
            order.status != Status.Expired &&
            order.status != Status.DisclosedRefundable
        ) revert InvalidStatus(Status.DisclosedRefundable, order.status);

        uint256 amount = order.amountIn;
        order.status = Status.Refunded;
        _safeTransfer(collateral, order.owner, amount);
        emit Refunded(orderId, order.owner, amount);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata
    ) external returns (bytes4) {
        if (
            msg.sender != address(conditionalTokens) ||
            !_executionActive ||
            _callbackObserved ||
            operator != address(fpmm) ||
            from != address(fpmm) ||
            id != _activePositionId ||
            value == 0
        ) revert UnexpectedERC1155();
        _callbackObserved = true;
        _receivedAmount = value;
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert UnexpectedERC1155();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x4e2312e0;
    }

    function statusOf(uint256 orderId) external view returns (Status) {
        return _orders[orderId].status;
    }

    function ownerOf(uint256 orderId) external view returns (address) {
        return _orders[orderId].owner;
    }

    function recipientOf(uint256 orderId) external view returns (address) {
        return _orders[orderId].recipient;
    }

    function amountInOf(uint256 orderId) external view returns (uint256) {
        return _orders[orderId].amountIn;
    }

    function outcomeIndexOf(uint256 orderId) external view returns (uint8) {
        return _orders[orderId].outcomeIndex;
    }

    function expiryOf(uint256 orderId) external view returns (uint64) {
        return _orders[orderId].expiresAt;
    }

    function nonceOf(uint256 orderId) external view returns (uint32) {
        return _orders[orderId].evaluationNonce;
    }

    function candidateOf(uint256 orderId) external view returns (bytes32) {
        Order storage order = _orders[orderId];
        return euint256.unwrap(_candidates[orderId][order.evaluationNonce]);
    }

    function authorizedMinOutOf(uint256 orderId) external view returns (uint256) {
        return _orders[orderId].authorizedMinOut;
    }

    function outcomeTokensOf(uint256 orderId) external view returns (uint256) {
        return _orders[orderId].outcomeTokens;
    }

    function escrowBalance() external view returns (uint256) {
        return collateral.balanceOf(address(this));
    }

    function _positionId(uint8 outcomeIndex) private view returns (uint256) {
        return outcomeIndex == 0 ? yesPositionId : noPositionId;
    }

    function _requireStatus(Order storage order, Status expected) private view {
        if (order.status != expected) revert InvalidStatus(expected, order.status);
    }

    function _requireNonce(Order storage order, uint32 nonce) private view {
        if (order.evaluationNonce != nonce) revert InvalidNonce(order.evaluationNonce, nonce);
    }

    function _safeApprove(IERC20Bound token, address spender, uint256 amount) private {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.approve.selector, spender, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenCallFailed();
    }

    function _safeTransfer(IERC20Bound token, address to, uint256 amount) private {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenCallFailed();
    }

    function _safeTransferFrom(IERC20Bound token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenCallFailed();
    }
}
