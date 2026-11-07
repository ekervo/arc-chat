import { useState } from "react";
import { isAddress } from "viem";
import { kit, createAdapter } from "../lib/arc";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { buildTxExplorerUrl } from "@/onchain-facts";

interface SendIntent {
  token?: string;
  amount: string;
  to: string;
}

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val: unknown) =>
      typeof val === "bigint" ? (val).toString() : val,
    2
  );
}

const ARC_TESTNET_CHAIN_ID = 5042002;

export default function SendConfirm({ intent }: { intent: SendIntent }) {
  const getProvider = useWalletProvider();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function handleSend() {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setTxHash("");

      if (!intent?.to || !isAddress(intent.to)) {
        throw new Error("Invalid recipient wallet address.");
      }
      if (!intent?.amount || Number(intent.amount) <= 0) {
        throw new Error("Invalid token amount.");
      }

      const adapter = await createAdapter(await getProvider());

      const params = {
        from: { adapter, chain: "Arc_Testnet" },
        to: intent.to,
        amount: String(intent.amount),
        token: intent.token ?? "USDC",
      } as Parameters<typeof kit.send>[0];

      const tx = await kit.send(params);
      setResult(tx);

      const txObj = tx as { txHash?: string; hash?: string; transactionHash?: string } | null;
      const hash = txObj?.txHash ?? txObj?.hash ?? txObj?.transactionHash;
      if (hash) setTxHash(hash);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Transaction failed.";
      if (!msg.toLowerCase().includes("user rejected")) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="confirmCard">
      <div className="confirmTop">
        <div>
          <h3>Send Confirmation</h3>
          <p>Review details before signing.</p>
        </div>
        <span className="statusPill">USDC</span>
      </div>

      <div className="detailList">
        <div>
          <span>Amount</span>
          <b>{intent.amount}</b>
        </div>
        <div>
          <span>Token</span>
          <b>{intent.token ?? "USDC"}</b>
        </div>
        <div>
          <span>Recipient</span>
          <b className="monoAddr">{intent.to}</b>
        </div>
        <div>
          <span>Network</span>
          <b>Arc Testnet</b>
        </div>
      </div>

      {!txHash && (
        <button
          className="primaryAction"
          onClick={() => { void handleSend(); }}
          disabled={loading}
        >
          {loading ? "Waiting for wallet..." : "Confirm Transaction"}
        </button>
      )}

      {error && <p className="errorText">{error}</p>}

      {txHash && (
        <div className="successBox">
          <h4>Transaction Successful</h4>
          <p>{txHash}</p>
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, txHash)}
            target="_blank"
            rel="noreferrer"
          >
            View on ArcScan
          </a>
        </div>
      )}

      {result !== null && !txHash && (
        <pre className="resultBox">{safeStringify(result)}</pre>
      )}
    </div>
  );
}
