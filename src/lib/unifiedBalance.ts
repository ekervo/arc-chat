import { isAddress, type EIP1193Provider } from "viem";
import {
  arbitrumSepolia,
  avalancheFuji,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
} from "viem/chains";
import { kit, createAdapter } from "./arc";

/** EVM chain ID of every source chain that can fund the Unified Balance. */
export const DEPOSIT_CHAIN_IDS = {
  Base_Sepolia: baseSepolia.id,
  Ethereum_Sepolia: sepolia.id,
  Arbitrum_Sepolia: arbitrumSepolia.id,
  Avalanche_Fuji: avalancheFuji.id,
  Optimism_Sepolia: optimismSepolia.id,
  Polygon_Amoy_Testnet: polygonAmoy.id,
} as const;

export type DepositChain = keyof typeof DEPOSIT_CHAIN_IDS;

export function isDepositChain(chain: string): chain is DepositChain {
  return chain in DEPOSIT_CHAIN_IDS;
}

export function isUnauthorizedError(err: unknown): boolean {
  const e = err as { name?: string; code?: number; message?: string };
  const text = `${e?.name ?? ""} ${e?.message ?? ""}`.toLowerCase();
  return (
    e?.code === 4100 ||
    text.includes("unauthorizedprovider") ||
    text.includes("has not been authorized")
  );
}

/** Turn wallet/SDK errors into a message the user can act on. */
export function describeWalletError(err: unknown, fallback: string): string {
  const e = err as { name?: string; code?: number; message?: string };
  const text = `${e?.name ?? ""} ${e?.message ?? ""}`.toLowerCase();
  if (isUnauthorizedError(err)) {
    return "Your wallet refused the request because this site is not allowed to use the selected network. Press Reconnect wallet below and, in the wallet's connect window, make sure this network is selected.";
  }
  if (e?.code === 4001 || text.includes("user rejected")) return "";
  return e?.message || fallback;
}

export interface UnifiedBalanceData {
  totalConfirmedBalance?: string;
  totalPendingBalance?: string;
  breakdown?: Array<{
    breakdown?: Array<{
      chain: string;
      confirmedBalance?: string;
      pendingBalance?: string;
    }>;
  }>;
}

export async function getUnifiedBalance(
  provider: EIP1193Provider
): Promise<UnifiedBalanceData> {
  const adapter = await createAdapter(provider);
  const result = await kit.unifiedBalance.getBalances({
    sources: [{ adapter }],
    networkType: "testnet",
    includePending: true,
  });
  return result;
}

export async function depositUnifiedBalance(
  provider: EIP1193Provider,
  chain: string,
  amount: string,
  onStatus?: (message: string) => void
): Promise<unknown> {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid deposit amount.");
  }
  if (!isDepositChain(chain)) {
    throw new Error(`Unsupported source chain: ${chain}`);
  }

  // The caller has already switched the wallet to the source chain. Ask the
  // wallet for account access on that chain (no prompt if already granted) and
  // confirm it really is on the right network before anything is signed.
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (accounts.length === 0) {
    throw new Error("Your wallet did not share an account. Please reconnect.");
  }
  const activeChainId = Number(
    (await provider.request({ method: "eth_chainId" }))
  );
  if (activeChainId !== DEPOSIT_CHAIN_IDS[chain]) {
    throw new Error(
      `Your wallet is on a different network. Switch it to ${chain.replace(/_/g, " ")} and try again.`
    );
  }

  const adapter = await createAdapter(provider);
  const deposit = (p: unknown) =>
    (kit.unifiedBalance.deposit as (p: unknown) => Promise<unknown>)(p);
  const base = { amount: String(amount), token: "USDC", from: { adapter, chain } };

  try {
    // Default flow: one signed message plus one transaction.
    return await deposit(base);
  } catch (err) {
    if (!isUnauthorizedError(err)) throw err;
    // Some wallets refuse the typed-data signature on networks that were added
    // by hand. Fall back to the classic approve + deposit transactions.
    onStatus?.("Wallet refused the signature request. Trying approve + deposit instead...");
    return await deposit({ ...base, allowanceStrategy: "approve" });
  }
}

export async function spendUnifiedBalance(
  provider: EIP1193Provider,
  to: string,
  amount: string
): Promise<unknown> {
  if (!to || !isAddress(to)) {
    throw new Error("Invalid recipient address.");
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid spend amount.");
  }

  const adapter = await createAdapter(provider);

  // No `allocations`: the SDK picks the source chains itself. It draws from the
  // destination chain first, then from the largest confirmed balances.
  return await (kit.unifiedBalance.spend as (p: unknown) => Promise<unknown>)({
    amount: String(amount),
    token: "USDC",
    from: { adapter },
    to: {
      adapter,
      chain: "Arc_Testnet",
      recipientAddress: to,
    },
  });
}
