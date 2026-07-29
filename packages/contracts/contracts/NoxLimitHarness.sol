// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {
    Nox,
    ebool,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

import {IFixedInputQuote} from "./interfaces/IFixedInputQuote.sol";

/// @notice Disposable Prompt 3 harness. It proves the released Nox authorization path only;
///         it is not the polished product contract and moves no assets.
contract NoxLimitHarness {
    enum Status {
        None,
        Open,
        Evaluating,
        PublicationPending,
        Finalized,
        Cancelled,
        Expired,
        DisclosedRefundable
    }

    struct Order {
        address owner;
        uint64 expiresAt;
        uint64 phaseDeadline;
        uint64 evaluationNonce;
        Status status;
        euint256 encryptedMinOut;
        uint256 authorizedMinOut;
    }

    error CandidateAlreadyAssigned(bytes32 candidate);
    error InputAlreadyUsed(bytes32 handle);
    error InvalidExpiry();
    error InvalidNonce(uint64 expected, uint64 actual);
    error InvalidStatus(Status expected, Status actual);
    error NotExpired();
    error NotOrderOwner();
    error NotWorker();
    error ResultAlreadyConsumed(bytes32 key);

    address public immutable worker;
    IFixedInputQuote public immutable quoteSource;
    uint256 public immutable amountIn;
    uint256 public immutable outcomeIndex;
    uint64 public immutable evaluationTimeout;
    uint64 public immutable publicationTimeout;

    uint256 public nextOrderId = 1;

    mapping(uint256 orderId => Order order) private _orders;
    mapping(uint256 orderId => mapping(uint64 nonce => euint256 candidate)) private _candidates;
    mapping(bytes32 inputHandle => bool used) public inputUsed;
    mapping(bytes32 candidateHandle => bool assigned) public candidateAssigned;
    mapping(bytes32 resultKey => bool consumed) public resultConsumed;

    event OrderCreated(uint256 indexed orderId, address indexed owner, bytes32 encryptedMinOut);
    event EvaluationRequested(
        uint256 indexed orderId,
        uint64 indexed nonce,
        uint256 quote,
        bytes32 candidate
    );
    event PublicationRequested(uint256 indexed orderId, uint64 indexed nonce, bytes32 candidate);
    event EvaluationReopened(uint256 indexed orderId, uint64 indexed nonce);
    event Authorized(uint256 indexed orderId, uint64 indexed nonce, uint256 minOut);
    event Cancelled(uint256 indexed orderId);
    event Expired(uint256 indexed orderId, Status terminalStatus);

    modifier onlyWorker() {
        if (msg.sender != worker) revert NotWorker();
        _;
    }

    constructor(
        address worker_,
        IFixedInputQuote quoteSource_,
        uint256 amountIn_,
        uint256 outcomeIndex_,
        uint64 evaluationTimeout_,
        uint64 publicationTimeout_
    ) {
        worker = worker_;
        quoteSource = quoteSource_;
        amountIn = amountIn_;
        outcomeIndex = outcomeIndex_;
        evaluationTimeout = evaluationTimeout_;
        publicationTimeout = publicationTimeout_;
    }

    function createOrder(
        externalEuint256 encryptedMinOut,
        bytes calldata inputProof,
        uint64 expiresAt
    ) external returns (uint256 orderId) {
        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        euint256 minOut = Nox.fromExternal(encryptedMinOut, inputProof);
        bytes32 inputHandle = euint256.unwrap(minOut);
        if (inputUsed[inputHandle]) revert InputAlreadyUsed(inputHandle);

        inputUsed[inputHandle] = true;
        Nox.allowThis(minOut);

        orderId = nextOrderId++;
        Order storage order = _orders[orderId];
        order.owner = msg.sender;
        order.expiresAt = expiresAt;
        order.status = Status.Open;
        order.encryptedMinOut = minOut;

        emit OrderCreated(orderId, msg.sender, inputHandle);
    }

    function requestEvaluation(uint256 orderId) external onlyWorker returns (uint64 nonce) {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Open);
        if (block.timestamp >= order.expiresAt) revert InvalidExpiry();

        nonce = ++order.evaluationNonce;
        euint256 publicNonce = Nox.toEuint256(uint256(nonce));
        euint256 freshZero = Nox.sub(publicNonce, publicNonce);
        euint256 evaluationMinOut = Nox.add(order.encryptedMinOut, freshZero);
        uint256 quote = quoteSource.calcBuyAmount(amountIn, outcomeIndex);
        ebool eligible = Nox.ge(Nox.toEuint256(quote), evaluationMinOut);
        euint256 candidate = Nox.select(eligible, evaluationMinOut, Nox.toEuint256(0));
        bytes32 candidateHandle = euint256.unwrap(candidate);

        if (candidateAssigned[candidateHandle]) {
            revert CandidateAlreadyAssigned(candidateHandle);
        }
        candidateAssigned[candidateHandle] = true;

        Nox.allowThis(candidate);
        Nox.addViewer(candidate, worker);

        _candidates[orderId][nonce] = candidate;
        order.status = Status.Evaluating;
        order.phaseDeadline = uint64(block.timestamp) + evaluationTimeout;

        emit EvaluationRequested(orderId, nonce, quote, candidateHandle);
    }

    function requestPublication(uint256 orderId, uint64 nonce) external onlyWorker {
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

    function finalize(
        uint256 orderId,
        uint64 nonce,
        bytes calldata decryptionProof
    ) external returns (uint256 plaintext) {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.PublicationPending);
        _requireNonce(order, nonce);
        if (block.timestamp >= order.expiresAt || block.timestamp >= order.phaseDeadline) {
            revert InvalidExpiry();
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
        order.status = Status.Finalized;
        order.phaseDeadline = 0;
        emit Authorized(orderId, nonce, plaintext);
    }

    function expireEvaluation(uint256 orderId) external {
        Order storage order = _orders[orderId];
        _requireStatus(order, Status.Evaluating);
        if (block.timestamp < order.phaseDeadline) revert NotExpired();

        order.phaseDeadline = 0;
        if (block.timestamp >= order.expiresAt) {
            order.status = Status.Expired;
            emit Expired(orderId, Status.Expired);
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
        emit Expired(orderId, Status.DisclosedRefundable);
    }

    function cancel(uint256 orderId) external {
        Order storage order = _orders[orderId];
        if (msg.sender != order.owner) revert NotOrderOwner();
        if (order.status != Status.Open && order.status != Status.Evaluating) {
            revert InvalidStatus(Status.Open, order.status);
        }
        order.status = Status.Cancelled;
        order.phaseDeadline = 0;
        emit Cancelled(orderId);
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
        emit Expired(orderId, order.status);
    }

    function ownerOf(uint256 orderId) external view returns (address) {
        return _orders[orderId].owner;
    }

    function statusOf(uint256 orderId) external view returns (Status) {
        return _orders[orderId].status;
    }

    function nonceOf(uint256 orderId) external view returns (uint64) {
        return _orders[orderId].evaluationNonce;
    }

    function candidateOf(uint256 orderId) external view returns (bytes32) {
        Order storage order = _orders[orderId];
        return euint256.unwrap(_candidates[orderId][order.evaluationNonce]);
    }

    function encryptedMinOutOf(uint256 orderId) external view returns (bytes32) {
        return euint256.unwrap(_orders[orderId].encryptedMinOut);
    }

    function authorizedMinOutOf(uint256 orderId) external view returns (uint256) {
        return _orders[orderId].authorizedMinOut;
    }

    function _requireStatus(Order storage order, Status expected) private view {
        if (order.status != expected) revert InvalidStatus(expected, order.status);
    }

    function _requireNonce(Order storage order, uint64 nonce) private view {
        if (order.evaluationNonce != nonce) revert InvalidNonce(order.evaluationNonce, nonce);
    }
}
