import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { EIP1193Provider } from "viem";

export const kit = new AppKit();

/**
 * Build an adapter from the provider of the wallet connected through wagmi.
 * Never read `window.ethereum` directly: with several wallets installed it can
 * be a different wallet than the one the user authorized for this site.
 */
export async function createAdapter(provider: EIP1193Provider) {
  return await createViemAdapterFromProvider({ provider });
}
