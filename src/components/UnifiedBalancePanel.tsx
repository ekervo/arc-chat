import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { buildTxExplorerUrl } from "@/onchain-facts";
import { useWalletProvider } from "../hooks/useWalletProvider";
import {
  getUnifiedBalance,
  depositUnifiedBalance,
  spendUnifiedBalance,
  describeWalletError,
  isUnauthorizedError,
  DEPOSIT_CHAIN_IDS,
  isDepositChain,
} from "../lib/unifiedBalance";

interface BalanceData {
  totalConfirmedBalance?: string;
  breakdown?: Array<{
    breakdown?: Array<{
      chain: string;
      confirmedBalance?: string;
    }>;
  }>;
}

type Props = {
  intent?: {
    amount?: string;
    fromChain?: string;
    to?: string;
  };
  defaultMode?: "deposit" | "spend";
};

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val: unknown) =>
      typeof val === "bigint" ? (val).toString() : val,
    2
  );
}

const ARC_TESTNET_ID = 5042002;

function displayChain(chain: string): string {
  return chain.replace(/_/g, " ");
}

export default function UnifiedBalancePanel({ intent, defaultMode = "deposit" }: Props) {
  const getProvider = useWalletProvider();
  const { switchChainAsync } = useSwitchChain();
  const { connector, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const [notice, setNotice] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [mode, setMode] = useState<"deposit" | "spend">(defaultMode);
  const [amount, setAmount] = useState(intent?.amount ?? "1");
  const [fromChain, setFromChain] = useState(intent?.fromChain ?? "Base_Sepolia");
  const [recipient, setRecipient] = useState(intent?.to ?? "");

  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadBalance() {
    try {
      const data = await getUnifiedBalance(await getProvider());
      setBalance(data);
    } catch {
      // ignore balance load errors
    }
  }

  // Load balance once on mount
  useEffect(() => {
    const run = async () => { await loadBalance(); };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeposit() {
    try {
      setLoading(true);
      setError("");
      setNotice("");
      setUnauthorized(false);
      setResult(null);
      if (!isDepositChain(fromChain)) {
        throw new Error(`Unsupported source chain: ${fromChain}`);
      }
      const provider = await getProvider();
      // Let wagmi switch the wallet (and add the network if it is missing).
      await switchChainAsync({ chainId: DEPOSIT_CHAIN_IDS[fromChain] });
      const tx = await depositUnifiedBalance(provider, fromChain, amount, setNotice);
      setResult(tx);
      await loadBalance();
    } catch (err: unknown) {
      setUnauthorized(isUnauthorizedError(err));
      setError(describeWalletError(err, "Deposit failed."));
    } finally {
      setNotice("");
      setLoading(false);
    }
  }

  async function handleSpend() {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const tx = await spendUnifiedBalance(await getProvider(), recipient, amount);
      setResult(tx);
      await loadBalance();
    } catch (err: unknown) {
      setError(describeWalletError(err, "Spend failed."));
    } finally {
      setLoading(false);
    }
  }

  const isDeposit = mode === "deposit";

  const txResult = result as { txHash?: string } | null;

  return (
    <div className="confirmCard">
      <div className="confirmTop">
        <div>
          <h3>{isDeposit ? "Unified Balance Deposit" : "Unified Balance Spend"}</h3>
          <p>{isDeposit ? "Review deposit details before signing." : "Review spend details before signing."}</p>
        </div>
        <span className="statusPill">USDC</span>
      </div>

      {/* Mode tabs */}
      <div className="ubTabs">
        <button
          className={mode === "deposit" ? "activeTab" : ""}
          onClick={() => setMode("deposit")}
        >
          Deposit
        </button>
        <button
          className={mode === "spend" ? "activeTab" : ""}
          onClick={() => setMode("spend")}
        >
          Spend
        </button>
      </div>

      <div className="detailList">
        <div>
          <span>Total Unified Balance</span>
          <b>{balance?.totalConfirmedBalance ?? "0.00"} USDC</b>
        </div>

        <div>
          <span>Amount</span>
          <input
            className="confirmInput"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
          />
        </div>

        {isDeposit && (
          <div>
            <span>Source Chain</span>
            <select
              className="confirmInput"
              value={fromChain}
              onChange={(e) => setFromChain(e.target.value)}
            >
              <option value="Base_Sepolia">Base Sepolia</option>
              <option value="Arbitrum_Sepolia">Arbitrum Sepolia</option>
              <option value="Ethereum_Sepolia">Ethereum Sepolia</option>
              <option value="Polygon_Amoy_Testnet">Polygon Amoy</option>
              <option value="Optimism_Sepolia">Optimism Sepolia</option>
              <option value="Avalanche_Fuji">Avalanche Fuji</option>
            </select>
          </div>
        )}

        {!isDeposit && (
          <div>
            <span>Recipient</span>
            <input
              className="confirmInput monoAddr"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
            />
          </div>
        )}

        <div>
          <span>Token</span>
          <b>USDC</b>
        </div>

        <div>
          <span>Network</span>
          <b>{isDeposit ? displayChain(fromChain) : "Arc Testnet"}</b>
        </div>
      </div>

      <button
        className="primaryAction"
        onClick={() => { void (isDeposit ? handleDeposit() : handleSpend()); }}
        disabled={loading}
      >
        {loading
          ? isDeposit ? "Submitting Deposit..." : "Submitting Spend..."
          : isDeposit ? "Confirm Deposit" : "Confirm Spend"}
      </button>

      {notice && <p className="statusText">{notice}</p>}
      {error && <p className="errorText">{error}</p>}
      {unauthorized && (
        <>
          <button
            className="primaryAction"
            style={{ background: "#fff", color: "#111" }}
            onClick={() => disconnect()}
          >
            Reconnect wallet
          </button>
          <p className="statusText" style={{ fontSize: 12 }}>
            Wallet: {connector?.name ?? "unknown"} · network ID: {chainId ?? "unknown"}.
            After disconnecting, press Connect Wallet again and keep every
            network you want to use selected.
          </p>
        </>
      )}

      {txResult?.txHash && (
        <div className="successBox">
          <h4>Transaction submitted</h4>
          <p>{txResult.txHash}</p>
          <a
            href={buildTxExplorerUrl(
              isDeposit && isDepositChain(fromChain)
                ? DEPOSIT_CHAIN_IDS[fromChain]
                : ARC_TESTNET_ID,
              txResult.txHash
            )}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer
          </a>
        </div>
      )}

      {result !== null && (
        <pre className="resultBox">{safeStringify(result)}</pre>
      )}
    </div>
  );
}
