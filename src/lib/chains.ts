import { arcTestnet } from "viem/chains";
import { DEPOSIT_CHAIN_IDS } from "./unifiedBalance";

/** EVM chain ID for every chain the app can bridge from or to. */
export const BRIDGE_CHAIN_IDS = {
  Arc_Testnet: arcTestnet.id,
  ...DEPOSIT_CHAIN_IDS,
} as const;

export type BridgeChain = keyof typeof BRIDGE_CHAIN_IDS;

export function isBridgeChain(chain: string): chain is BridgeChain {
  return chain in BRIDGE_CHAIN_IDS;
}
