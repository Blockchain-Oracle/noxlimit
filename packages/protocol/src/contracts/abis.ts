/**
 * Provisional product-client ABI for the hardened single-market OrderBook. It is intentionally
 * declared in source (rather than importing Hardhat artifacts) so browser and service builds do
 * not depend on compiler output directories.
 */
export const noxLimitOrderBookAbi = [
  {
    type: "event",
    name: "OrderCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "outcomeIndex", type: "uint8" },
      { indexed: false, name: "amountIn", type: "uint256" },
      { indexed: false, name: "expiresAt", type: "uint64" },
      { indexed: false, name: "encryptedMinOut", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "EvaluationRequested",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "nonce", type: "uint32" },
      { indexed: false, name: "quote", type: "uint256" },
      { indexed: false, name: "candidate", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "PublicationRequested",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "nonce", type: "uint32" },
      { indexed: false, name: "candidate", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "EvaluationReopened",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "nonce", type: "uint32" },
    ],
  },
  {
    type: "event",
    name: "Filled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "nonce", type: "uint32" },
      { indexed: false, name: "minOut", type: "uint256" },
      { indexed: false, name: "outcomeTokens", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ExecutionFailed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "nonce", type: "uint32" },
      { indexed: false, name: "reason", type: "bytes" },
    ],
  },
  {
    type: "event",
    name: "Terminal",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: false, name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    anonymous: false,
    inputs: [
      { indexed: true, name: "orderId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "createOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "outcomeIndex", type: "uint8" },
      { name: "amountIn", type: "uint128" },
      { name: "expiresAt", type: "uint64" },
      { name: "encryptedMinOut", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "requestEvaluation",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [{ name: "nonce", type: "uint32" }],
  },
  {
    type: "function",
    name: "requestPublication",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "nonce", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "nonce", type: "uint32" },
      { name: "decryptionProof", type: "bytes" },
    ],
    outputs: [{ name: "plaintext", type: "uint256" }],
  },
  {
    type: "function",
    name: "expireEvaluation",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expirePublication",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expireOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  ...[
    ["statusOf", "uint8"],
    ["ownerOf", "address"],
    ["recipientOf", "address"],
    ["amountInOf", "uint256"],
    ["outcomeIndexOf", "uint8"],
    ["expiryOf", "uint64"],
    ["phaseDeadlineOf", "uint64"],
    ["lastEvaluationAtOf", "uint64"],
    ["nonceOf", "uint32"],
    ["evaluationCountOf", "uint8"],
    ["remainingEvaluations", "uint8"],
    ["candidateOf", "bytes32"],
    ["authorizedMinOutOf", "uint256"],
    ["outcomeTokensOf", "uint256"],
  ].map(([name, outputType]) => ({
    type: "function" as const,
    name,
    stateMutability: "view" as const,
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [{ name: "", type: outputType }],
  })),
  ...[
    ["worker", "address"],
    ["fpmm", "address"],
    ["conditionalTokens", "address"],
    ["collateral", "address"],
    ["conditionId", "bytes32"],
    ["tradingClosesAt", "uint64"],
    ["yesPositionId", "uint256"],
    ["noPositionId", "uint256"],
    ["evaluationTimeout", "uint64"],
    ["publicationTimeout", "uint64"],
    ["minimumEvaluationInterval", "uint64"],
    ["maximumEvaluations", "uint8"],
    ["nextOrderId", "uint256"],
    ["escrowBalance", "uint256"],
  ].map(([name, outputType]) => ({
    type: "function" as const,
    name,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: outputType }],
  })),
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
export const fixedProductMarketMakerAbi = [
  {
    type: "function",
    name: "calcBuyAmount",
    stateMutability: "view",
    inputs: [
      { name: "investmentAmount", type: "uint256" },
      { name: "outcomeIndex", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "fee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "collateralToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "conditionalTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "conditionIds",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export const conditionalTokensAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemPositions",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSets", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export const priceBinaryResolverAbi = [
  {
    type: "event",
    name: "MarketResolved",
    anonymous: false,
    inputs: [
      { indexed: true, name: "questionId", type: "bytes32" },
      { indexed: true, name: "yesWon", type: "bool" },
      { indexed: false, name: "settlementPriceWad", type: "int256" },
      { indexed: false, name: "observedAt", type: "uint64" },
      { indexed: false, name: "selectedRoundId", type: "uint80" },
      { indexed: false, name: "predecessorRoundId", type: "uint80" },
    ],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "selectedRoundId", type: "uint80" },
      { name: "priorRoundId", type: "uint80" },
    ],
    outputs: [{ name: "yesWon", type: "bool" }],
  },
  {
    type: "function",
    name: "resolved",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "resolvedYes",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const testnetFundingTreasuryAbi = [
  {
    type: "event",
    name: "FundingClaimed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "recipient", type: "address" },
      { indexed: true, name: "nonce", type: "uint256" },
      { indexed: false, name: "nativeAmount", type: "uint256" },
      { indexed: false, name: "collateralAmount", type: "uint256" },
      { indexed: false, name: "nextEligibleAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "nativeAmount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "preview",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [
      { name: "nativeAmount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "nextEligibleAt", type: "uint64" },
      { name: "nonce", type: "uint256" },
    ],
  },
] as const;
