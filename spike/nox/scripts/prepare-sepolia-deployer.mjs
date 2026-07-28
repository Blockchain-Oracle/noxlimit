import { existsSync } from "node:fs";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const keyPath = fileURLToPath(new URL("../.gate-c-deployer-key", import.meta.url));

let privateKey;
let created = false;
if (existsSync(keyPath)) {
  privateKey = (await readFile(keyPath, "utf8")).trim();
  await chmod(keyPath, 0o600);
} else {
  privateKey = generatePrivateKey();
  await writeFile(keyPath, `${privateKey}\n`, { mode: 0o600 });
  created = true;
}

const account = privateKeyToAccount(privateKey);
console.log(
  JSON.stringify(
    {
      address: account.address,
      created,
      network: "Ethereum Sepolia only",
      minimumSepoliaEth: "0.03",
      privateKeyPrinted: false,
    },
    null,
    2,
  ),
);
