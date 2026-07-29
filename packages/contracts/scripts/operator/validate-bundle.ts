import { network } from "hardhat";
import { getAddress, isAddress, zeroAddress, type Address, type Hex } from "viem";

import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  assetIdOf,
  deriveIdentityId,
  loadCatalogAuthority,
  loadCatalogHistory,
  parseBundleConfig,
  readJson,
  stableIdentityOf,
} from "./lib.js";
import { verifyDeployedBundle } from "./verify.js";

function requiredAddress(name: string): Address {
  const value = process.env[name]?.trim();
  if (!value || !isAddress(value, { strict: true })) {
    throw new OperatorConfigurationError(`${name} must be a valid nonzero address`);
  }
  const parsed = getAddress(value);
  if (parsed === zeroAddress) throw new OperatorConfigurationError(`${name} cannot be zero`);
  return parsed;
}

async function main(): Promise<void> {
  const config = parseBundleConfig(process.env);
  if (!config.existingCollateral) {
    throw new OperatorConfigurationError(
      "read-only validation requires NOXLIMIT_COLLATERAL_ADDRESS from the deployed record",
    );
  }
  const fundingTreasury = config.existingFundingTreasury;
  if (!fundingTreasury) {
    throw new OperatorConfigurationError(
      "read-only validation requires NOXLIMIT_FUNDING_TREASURY_ADDRESS",
    );
  }
  const lpOwner = requiredAddress("NOXLIMIT_LP_OWNER");
  const authority = await loadCatalogAuthority();
  const history = await loadCatalogHistory(config.catalogHistoryPaths, authority);
  const manifest = authority.validateCatalogManifest(await readJson(config.catalogOutputPath));
  authority.validateCatalogChain([...history, manifest]);

  const identity = stableIdentityOf(config, config.existingCollateral);
  const marketId = deriveIdentityId("market", identity);
  const questionId = deriveIdentityId("question", identity);
  const record = manifest.markets.find(
    (candidate) =>
      typeof candidate.marketId === "string" && candidate.marketId.toLowerCase() === marketId.toLowerCase(),
  );
  if (!record) throw new OperatorConfigurationError(`catalog candidate does not contain ${marketId}`);
  const contracts = record.contracts as Record<string, unknown> | undefined;
  if (!contracts) throw new OperatorConfigurationError("market record lacks contract addresses");
  for (const key of ["resolver", "fpmm", "orderBook"] as const) {
    if (typeof contracts[key] !== "string" || !isAddress(contracts[key], { strict: true })) {
      throw new OperatorConfigurationError(`market record has invalid ${key}`);
    }
  }
  const conditionId = record.conditionId;
  if (typeof conditionId !== "string" || !/^0x[0-9a-f]{64}$/i.test(conditionId)) {
    throw new OperatorConfigurationError("market record has invalid conditionId");
  }

  const connection = await network.create();
  if (connection.networkName !== "sepolia") {
    throw new OperatorConfigurationError("read-only validation must use the Hardhat sepolia network");
  }
  const publicClient = await connection.viem.getPublicClient();
  if ((await publicClient.getChainId()) !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError("validation endpoint is not Ethereum Sepolia");
  }
  const verification = await verifyDeployedBundle(
    publicClient,
    lpOwner,
    config,
    {
      collateral: config.existingCollateral,
      settlementAdapter: getAddress((record.oracle as Record<string, string>).settlementAdapter),
      resolver: getAddress(contracts.resolver as string),
      fpmm: getAddress(contracts.fpmm as string),
      orderBook: getAddress(contracts.orderBook as string),
      fundingTreasury,
    },
    questionId,
    conditionId as Hex,
    assetIdOf(config.asset),
  );
  process.stdout.write(
    `${JSON.stringify({
      valid: true,
      marketId,
      catalogRevision: manifest.catalogRevision,
      builderSeededLiquidity: {
        yesAtoms: verification.poolYesBalance.toString(),
        noAtoms: verification.poolNoBalance.toString(),
        lpShares: verification.lpShares.toString(),
      },
      runtimeCodeHashes: verification.runtimeCodeHashes,
    })}\n`,
  );
}

await main();
