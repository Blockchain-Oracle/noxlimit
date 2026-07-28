import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, noxPlugin],
  solidity: {
    compilers: [
      { version: "0.8.35", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.5.17", settings: { evmVersion: "istanbul" } },
    ],
  },
  networks: {
    default: {
      type: "edr-simulated",
      chainType: "op",
    },
  },
});
