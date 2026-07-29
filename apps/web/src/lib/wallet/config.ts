import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim() ?? "";
export const walletRuntimeConfigured = sepoliaRpcUrl.length > 0;

export function getConfig() {
  return createConfig({
    chains: [sepolia],
    connectors: [injected()],
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
    transports: {
      [sepolia.id]: http(sepoliaRpcUrl || "http://127.0.0.1:9"),
    },
  });
}
