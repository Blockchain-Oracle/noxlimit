import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

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
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [],
    },
    sepoliaOperator: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_OPERATOR_PRIVATE_KEY")],
    },
  },
});
