import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { EIP1193Provider } from "viem";
import type { SwapEstimate } from "@circle-fin/app-kit";
import { kit } from "../lib/arc";
import { buildTxExplorerUrl } from "@/onchain-facts";

// Supported Arc Testnet swap tokens
const SWAP_TOKENS = ["USDC", "EURC"] as const;
type SwapToken = (typeof SWAP_TOKENS)[number];

// Arc Testnet is the only supported testnet for swap
const ARC_CHAIN = "Arc_Testnet";
const ARC_CHAIN_ID = 5042002;

/** Turn SDK/wallet errors into a readable message (including nested causes). */
function readError(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    code?: number | string;
    cause?: { trace?: { error?: { message?: string }; rawError?: { details?: string } } };
  };
  const nested =
    e?.cause?.trace?.rawError?.details ?? e?.cause?.trace?.error?.message;
  const base = e?.message || fallback;
  if (String(e?.code) === "9001") {
    return "Insufficient token balance on Arc Testnet. Get test USDC from the sidebar faucet.";
  }
  return nested && !base.includes(nested) ? `${base} (${nested})` : base;
}

interface SwapIntent {
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
}

interface Props {
  intent: SwapIntent;
}

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val: unknown) =>
      typeof val === "bigint" ? (val).toString() : val,
    2
  );
}

function formatAmount(val: string | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  return isNaN(n) ? val : n.toFixed(4);
}

export default function SwapConfirm({ intent }: Props) {
  const { address, connector, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [tokenIn, setTokenIn] = useState<SwapToken>(
    (SWAP_TOKENS.includes(intent.tokenIn as SwapToken)
      ? intent.tokenIn
      : "USDC") as SwapToken
  );
  const [tokenOut, setTokenOut] = useState<SwapToken>(
    (SWAP_TOKENS.includes(intent.tokenOut as SwapToken)
      ? intent.tokenOut
      : "EURC") as SwapToken
  );
  const [amount, setAmount] = useState(intent.amount ?? "1");

  const [estimate, setEstimate] = useState<SwapEstimate | null>(null);
  const [estimateAddr, setEstimateAddr] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "estimating" | "swapping">(
    "idle"
  );
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [result, setResult] = useState<unknown>(null);

  // Validation guards
  const sameToken = tokenIn === tokenOut;
  const validAmount = parseFloat(amount) > 0;
  const canEstimate = !sameToken && validAmount && !!address;

  async function getAdapter() {
    if (!connector) throw new Error("Wallet not connected.");

    // The wallet must be on Arc Testnet before the adapter signs a permit or
    // sends the swap, otherwise the SDK rejects the transaction.
    if (chainId !== ARC_CHAIN_ID) {
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    }

    const provider = (await connector.getProvider()) as EIP1193Provider;
    return await createViemAdapterFromProvider({ provider });
  }

  async function handleEstimate() {
    if (!canEstimate) return;
    setLoading(true);
    setPhase("estimating");
    setError("");
    setEstimate(null);
    setResult(null);
    setTxHash("");

    try {
      const adapter = await getAdapter();
      const est = await kit.estimateSwap({
        from: { adapter, chain: ARC_CHAIN },
        tokenIn,
        tokenOut,
        amountIn: amount,
      });
      setEstimate(est);
      setEstimateAddr(address);
    } catch (err: unknown) {
      const msg = readError(err, "Estimation failed.");
      if (!msg.toLowerCase().includes("user rejected")) setError(msg);
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  async function handleSwap() {
    if (!estimate) return;
    if (address !== estimateAddr) {
      setError("Wallet account changed since estimate. Please re-estimate.");
      setEstimate(null);
      return;
    }
    setLoading(true);
    setPhase("swapping");
    setError("");

    try {
      const adapter = await getAdapter();
      const res = await kit.swap({
        from: { adapter, chain: ARC_CHAIN },
        tokenIn,
        tokenOut,
        amountIn: amount,
        config: { slippageBps: 300 },
      });
      setResult(res);
      const hash =
        (res as { txHash?: string }).txHash ??
        (res as { hash?: string }).hash ??
        "";
      setTxHash(hash);
      setEstimate(null);
    } catch (err: unknown) {
      const msg = readError(err, "Swap failed.");
      if (!msg.toLowerCase().includes("user rejected")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  function flipTokens() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setEstimate(null);
    setError("");
  }

  const btnLabel = () => {
    if (phase === "estimating") return "Getting quote…";
    if (phase === "swapping") return "Waiting for wallet…";
    if (estimate) return `Confirm Swap — get ~${formatAmount(estimate.estimatedOutput?.amount)} ${tokenOut}`;
    return "Get Quote";
  };

  return (
    <div className="confirmCard">
      {/* Header */}
      <div className="confirmTop">
        <div>
          <h3>Swap</h3>
          <p>Review the quote before signing.</p>
        </div>
        <span className="statusPill">Arc Testnet</span>
      </div>

      {/* Token selectors */}
      <div className="detailList">
        <div>
          <span>From token</span>
          <select
            className="confirmInput"
            value={tokenIn}
            onChange={(e) => {
              setTokenIn(e.target.value as SwapToken);
              setEstimate(null);
              setError("");
            }}
          >
            {SWAP_TOKENS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span>Amount</span>
          <input
            className="confirmInput"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setEstimate(null);
              setError("");
            }}
            placeholder="1"
          />
        </div>

        {/* Flip button */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={flipTokens}
            style={{
              background: "#b7ff5e",
              border: "2px solid #111",
              borderRadius: 12,
              padding: "6px 18px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 18,
            }}
            title="Flip tokens"
          >
            ⇅
          </button>
        </div>

        <div>
          <span>To token</span>
          <select
            className="confirmInput"
            value={tokenOut}
            onChange={(e) => {
              setTokenOut(e.target.value as SwapToken);
              setEstimate(null);
              setError("");
            }}
          >
            {SWAP_TOKENS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span>Network</span>
          <b>Arc Testnet</b>
        </div>
      </div>

      {/* Validation warning */}
      {sameToken && (
        <p className="errorText" style={{ marginBottom: 8 }}>
          From and To tokens must be different.
        </p>
      )}

      {/* Aggregator notice */}
      <p
        style={{
          fontSize: 11,
          color: "#666",
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      >
        Swaps are routed through a third-party aggregator (LiFi). By swapping
        you agree to the aggregator's terms of service.
      </p>

      {/* Estimate preview */}
      {estimate && (
        <div className="successBox" style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>Quote</b>
          <div
            style={{
              display: "grid",
              gap: 6,
              marginTop: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>You send</span>
              <b>
                {amount} {tokenIn}
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>You receive ~</span>
              <b>
                {formatAmount(estimate.estimatedOutput?.amount)}{" "}
                {estimate.estimatedOutput?.token ?? tokenOut}
              </b>
            </div>
            {estimate.fees && estimate.fees.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Fee</span>
                <b>
                  {estimate.fees[0]?.amount} {estimate.fees[0]?.token}
                </b>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        className="primaryAction"
        onClick={() => {
          if (estimate) {
            void handleSwap();
          } else {
            void handleEstimate();
          }
        }}
        disabled={loading || sameToken || !validAmount || !address}
      >
        {btnLabel()}
      </button>

      {!address && (
        <p className="errorText" style={{ marginTop: 8 }}>
          Connect your wallet to swap.
        </p>
      )}

      {error && (
        <p className="errorText" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}

      {/* Success */}
      {txHash && (
        <div className="successBox" style={{ marginTop: 12 }}>
          <b>Swap submitted</b>
          <p className="mono" style={{ wordBreak: "break-all", fontSize: 12, margin: "4px 0" }}>
            {txHash}
          </p>
          <a
            href={buildTxExplorerUrl(ARC_CHAIN_ID, txHash)}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#111", fontWeight: 900, fontSize: 13 }}
          >
            View on Arc Explorer
          </a>
        </div>
      )}

      {result !== null && !txHash && (
        <pre className="resultBox" style={{ marginTop: 12 }}>
          {safeStringify(result)}
        </pre>
      )}
    </div>
  );
}
