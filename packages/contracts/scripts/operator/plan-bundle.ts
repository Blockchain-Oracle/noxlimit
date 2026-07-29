import {
  loadCatalogAuthority,
  loadCatalogHistory,
  operatorPlan,
  parseBundleConfig,
} from "./lib.js";

async function main(): Promise<void> {
  const config = parseBundleConfig(process.env);
  const authority = await loadCatalogAuthority();
  const history = await loadCatalogHistory(config.catalogHistoryPaths, authority);
  const plan = operatorPlan(config);
  process.stdout.write(
    `${JSON.stringify(
      {
        ...plan,
        validatedCatalogHead: history.at(-1)?.catalogRevision,
        nextCatalogRevision: (BigInt(history.at(-1)?.revision ?? "0") + 1n).toString(),
      },
      null,
      2,
    )}\n`,
  );
}

await main();
