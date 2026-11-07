import { useState } from "react";
import { useSwitchChain } from "wagmi";
import { kit, createAdapter } from "../lib/arc";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { BRIDGE_CHAIN_IDS, isBridgeChain } from "../lib/chains";
import { describeWalletError } from "../lib/unifiedBalance";

interface BridgeIntent {
  token?: string;
  amount: string;
  fromChain: string;
  toChain: string;
}

interface BridgeStep {
  name?: string;
  state?: string;
  errorMessage?: string;
  explorerUrl?: string;
  data?: { explorerUrl?: string };
  txHash?: string;
  transactionHash?: string;
}

interface BridgeResult {
  txHash?: string;
  steps?: BridgeStep[];
}

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val: unknown) =>
      typeof val === "bigint" ? (val).toString() : val,
    2
  );
}

function describeBridgeFailure(step: BridgeStep): string {
  const raw = step.errorMessage ?? "";
  if (/unrecognized chain|wallet_addEthereumChain|failed to switch/i.test(raw)) {
    return `The "${step.name ?? "bridge"}" step failed because your wallet could not switch networks. Approve the "add network" and "switch network" prompts in your wallet, then press Try Again.`;
  }
  if (/insufficient/i.test(raw)) {
    return `The "${step.name ?? "bridge"}" step failed: insufficient balance for the amount or the network fee.`;
  }
  return `The "${step.name ?? "bridge"}" step failed. ${raw}`.trim();
}

function displayChain(chain: string): string {
  return chain.replace(/_/g, " ");
}

export default function BridgeConfirm({ intent }: { intent: BridgeIntent }) {
  const getProvider = useWalletProvider();
  const { switchChainAsync } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [error, setError] = useState("");

  async function handleBridge() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      if (!intent.amount || Number(intent.amount) <= 0)
        throw new Error("Invalid bridge amount.");
      if (!intent.fromChain || !intent.toChain)
        throw new Error("Missing bridge chain.");
      if (intent.fromChain === intent.toChain)
        throw new Error("Source and destination chains must be different.");

      if (!isBridgeChain(intent.fromChain) || !isBridgeChain(intent.toChain)) {
        throw new Error("This route is not supported.");
      }

      setStatus("Preparing bridge transaction...");
      const provider = await getProvider();

      // The SDK can only switch to networks the wallet already knows. Go through
      // wagmi first so a missing network (for example Polygon Amoy) is added.
      // Visit the destination first, then end on the source chain, which is
      // where the burn is signed.
      await switchChainAsync({ chainId: BRIDGE_CHAIN_IDS[intent.toChain] });
      await switchChainAsync({ chainId: BRIDGE_CHAIN_IDS[intent.fromChain] });

      const adapter = await createAdapter(provider);

      const params = {
        from: { adapter, chain: intent.fromChain },
        to: { adapter, chain: intent.toChain },
        amount: String(intent.amount),
      } as Parameters<typeof kit.bridge>[0];

      setStatus("Please confirm the bridge transaction in your wallet...");
      const bridgeResult = await kit.bridge(params);
      setResult(bridgeResult as BridgeResult);
      setStatus("Bridge submitted. Settlement may take a few minutes.");
    } catch (err: unknown) {
      const msg = describeWalletError(err, "Bridge failed.");
      if (msg) setError(msg);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // The SDK resolves (instead of throwing) when a step fails, so inspect steps.
  const failedStep = result?.steps?.find((s) => s.state === "error");
  const succeeded = result !== null && !failedStep;

  const txHash =
    result?.txHash ??
    result?.steps?.find((s) => s?.txHash)?.txHash ??
    result?.steps?.find((s) => s?.transactionHash)?.transactionHash;

  return (
    <div className="confirmCard">
      <div className="confirmTop">
        <div>
          <h3>Bridge Confirmation</h3>
          <p>Cross-chain settlement can take several minutes.</p>
        </div>
        <span className="statusPill">USDC</span>
      </div>

      <div className="detailList">
        <div>
          <span>Amount</span>
          <b>{intent.amount} USDC</b>
        </div>
        <div>
          <span>From</span>
          <b>{displayChain(intent.fromChain)}</b>
        </div>
        <div>
          <span>To</span>
          <b>{displayChain(intent.toChain)}</b>
        </div>
        <div>
          <span>Token</span>
          <b>USDC</b>
        </div>
      </div>

      {!succeeded && (
        <button
          className="primaryAction"
          onClick={() => { void handleBridge(); }}
          disabled={loading}
        >
          {loading ? "Waiting for wallet..." : failedStep ? "Try Again" : "Confirm Bridge"}
        </button>
      )}

      {status && !failedStep && <p className="statusText">{status}</p>}
      {failedStep && (
        <p className="errorText">
          {describeBridgeFailure(failedStep)}
        </p>
      )}
      {error && <p className="errorText">{error}</p>}

      {result?.steps?.map((step, index) => (
        <div key={index} className="stepItem">
          <b>Step {index + 1}</b>
          <span>
            {step.name} — {step.state}
          </span>
          {step.explorerUrl && (
            <a href={step.explorerUrl} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          )}
          {step.data?.explorerUrl && (
            <a href={step.data.explorerUrl} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          )}
        </div>
      ))}

      {txHash && succeeded && (
        <div className="successBox">
          <h4>Bridge Submitted</h4>
          <p>{txHash}</p>
        </div>
      )}

      {result !== null && (
        <pre className="resultBox">{safeStringify(result)}</pre>
      )}
    </div>
  );
}
