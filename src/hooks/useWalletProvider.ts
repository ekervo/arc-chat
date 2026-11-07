import { useCallback } from "react";
import { useAccount } from "wagmi";
import type { EIP1193Provider } from "viem";

/**
 * Returns a function that resolves the EIP-1193 provider of the wallet the user
 * connected through the connect button. Use it instead of `window.ethereum`,
 * which may belong to a different wallet than the one authorized for this site.
 */
export function useWalletProvider() {
  const { connector } = useAccount();

  return useCallback(async (): Promise<EIP1193Provider> => {
    if (!connector) {
      throw new Error("Connect your wallet first.");
    }
    return (await connector.getProvider()) as EIP1193Provider;
  }, [connector]);
}
