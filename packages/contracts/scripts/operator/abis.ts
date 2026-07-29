import { parseAbi } from "viem";

export const chainlinkFeedAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
]);

export const collateralAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function issuer() view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address,uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
]);

export const conditionalTokensAbi = parseAbi([
  "function prepareCondition(address,bytes32,uint256)",
  "function getConditionId(address,bytes32,uint256) pure returns (bytes32)",
  "function getOutcomeSlotCount(bytes32) view returns (uint256)",
  "function getCollectionId(bytes32,bytes32,uint256) view returns (bytes32)",
  "function getPositionId(address,bytes32) pure returns (uint256)",
  "function balanceOf(address,uint256) view returns (uint256)",
  "function payoutDenominator(bytes32) view returns (uint256)",
  "function redeemPositions(address,bytes32,bytes32,uint256[])",
]);

export const fpmmFactoryAbi = parseAbi([
  "event FixedProductMarketMakerCreation(address indexed creator,address fixedProductMarketMaker,address indexed conditionalTokens,address indexed collateralToken,bytes32[] conditionIds,uint256 fee)",
  "function createFixedProductMarketMaker(address,address,bytes32[],uint256) returns (address)",
]);

export const fpmmAbi = parseAbi([
  "function conditionalTokens() view returns (address)",
  "function collateralToken() view returns (address)",
  "function conditionIds(uint256) view returns (bytes32)",
  "function fee() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function addFunding(uint256,uint256[])",
  "function removeFunding(uint256)",
]);

export const settlementAdapterAbi = parseAbi([
  "function assetId() view returns (bytes32)",
  "function feed() view returns (address)",
  "function feedDecimals() view returns (uint8)",
]);

export const resolverAbi = parseAbi([
  "event MarketResolved(bytes32 indexed questionId,bool indexed yesWon,int256 settlementPriceWad,uint64 observedAt,uint80 selectedRoundId,uint80 predecessorRoundId)",
  "function conditionalTokens() view returns (address)",
  "function settlementAdapter() view returns (address)",
  "function questionId() view returns (bytes32)",
  "function conditionId() view returns (bytes32)",
  "function assetId() view returns (bytes32)",
  "function strikePriceWad() view returns (int256)",
  "function tradingClosesAt() view returns (uint64)",
  "function resolvesAt() view returns (uint64)",
  "function maximumObservationDelay() view returns (uint64)",
  "function resolved() view returns (bool)",
  "function resolvedYes() view returns (bool)",
  "function settlementPriceWad() view returns (int256)",
  "function settlementObservedAt() view returns (uint64)",
  "function settlementRoundId() view returns (uint80)",
  "function predecessorRoundId() view returns (uint80)",
  "function resolve(uint80,uint80) returns (bool)",
]);

export const orderBookAbi = parseAbi([
  "function worker() view returns (address)",
  "function fpmm() view returns (address)",
  "function conditionalTokens() view returns (address)",
  "function collateral() view returns (address)",
  "function conditionId() view returns (bytes32)",
  "function tradingClosesAt() view returns (uint64)",
  "function yesPositionId() view returns (uint256)",
  "function noPositionId() view returns (uint256)",
  "function evaluationTimeout() view returns (uint64)",
  "function publicationTimeout() view returns (uint64)",
  "function minimumEvaluationInterval() view returns (uint64)",
  "function maximumEvaluations() view returns (uint8)",
]);

export const fundingTreasuryAbi = parseAbi([
  "function collateral() view returns (address)",
  "function nativeTarget() view returns (uint256)",
  "function collateralTarget() view returns (uint256)",
  "function nativePerClaimCap() view returns (uint256)",
  "function collateralPerClaimCap() view returns (uint256)",
  "function nativeLifetimeCap() view returns (uint256)",
  "function collateralLifetimeCap() view returns (uint256)",
  "function cooldown() view returns (uint64)",
]);
