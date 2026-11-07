import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { erc20Abi, isAddress, zeroAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { buildTxExplorerUrl, getUsdc } from "@/onchain-facts";
import { formatUsdc, parseAmount } from "@/onchain-money";

interface SendIntent {
  amount: string;
  to: string;
}

/** Arc mainnet. Every chain fact below is read from the generated onchain facts. */
const ARC_MAINNET_CHAIN_ID = 5042;

const usdcFact = getUsdc(ARC_MAINNET_CHAIN_ID);
if (!usdcFact) {
  throw new Error("USDC is not configured for Arc mainnet.");
}
const USDC_ADDRESS = usdcFact.address as `0x${string}`;

/** Amounts above this get an extra warning. */
const LARGE_AMOUNT_USDC = 100;

function readableError(err: unknown): string {
  const e = err as { code?: number; name?: string; message?: string; shortMessage?: string };
  const text = `${e?.name ?? ""} ${e?.shortMessage ?? e?.message ?? ""}`.toLowerCase();
  if (e?.code === 4001 || text.includes("user rejected") || text.includes("userrejected")) {
    return "";
  }
  if (text.includes("insufficient funds") || text.includes("exceeds balance")) {
    return "Insufficient USDC for the amount plus the network fee. On Arc the fee is paid in USDC from the same balance.";
  }
  return e?.shortMessage ?? e?.message ?? "Transaction failed.";
}

export default function SendMainnetConfirm({ intent }: { intent: SendIntent }) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isSigning } = useWriteContract();

  const [acknowledged, setAcknowledged] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const balanceQuery = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_MAINNET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });
  const balance = balanceQuery.data;

  // Validate everything before the button can be pressed.
  let amountRaw: bigint | undefined;
  let amountProblem = "";
  try {
    const parsed = parseAmount(ARC_MAINNET_CHAIN_ID, intent.amount);
    amountRaw = parsed.raw;
    if (amountRaw <= 0n) amountProblem = "Amount must be greater than zero.";
  } catch {
    amountProblem = "Invalid USDC amount.";
  }

  const recipientOk =
    isAddress(intent.to) && intent.to.toLowerCase() !== zeroAddress;
  const recipientProblem = recipientOk ? "" : "Invalid recipient wallet address.";

  const insufficient =
    amountRaw !== undefined && balance !== undefined && amountRaw > balance;
  const isLarge = Number(intent.amount) > LARGE_AMOUNT_USDC;

  const isConfirming = Boolean(hash) && receipt.isLoading;
  const reverted = receipt.data?.status === "reverted";
  const succeeded = receipt.isSuccess && !reverted;

  const problem =
    amountProblem ||
    recipientProblem ||
    (!address ? "Connect your wallet to continue." : "") ||
    (insufficient ? "Your Arc mainnet USDC balance is lower than this amount." : "");

  const canSend =
    acknowledged && !problem && !isSigning && !isConfirming && !hash;

  async function handleSend() {
    if (!canSend || amountRaw === undefined) return;
    setError("");
    try {
      // Always make sure the wallet really is on Arc mainnet before signing.
      if (chainId !== ARC_MAINNET_CHAIN_ID) {
        await switchChainAsync({ chainId: ARC_MAINNET_CHAIN_ID });
      }
      const txHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [intent.to as `0x${string}`, amountRaw],
        chainId: ARC_MAINNET_CHAIN_ID,
      });
      setHash(txHash);
    } catch (err: unknown) {
      const msg = readableError(err);
      if (msg) setError(msg);
    }
  }

  const buttonLabel = isSigning
    ? "Confirm in your wallet..."
    : isConfirming
    ? "Waiting for confirmation..."
    : "Send on Arc Mainnet";

  return (
    <div className="confirmCard">
      <div className="mainnetBanner" role="alert">
        <AlertTriangle size={20} aria-hidden style={{ flexShrink: 0, color: "#7a0c0c" }} />
        <div>
          <b>Mainnet: real funds</b>
          <p>
            This sends real USDC on Arc mainnet. The transfer cannot be undone
            and a wrong address means the funds are lost. Check every detail.
          </p>
        </div>
      </div>

      <div className="confirmTop">
        <div>
          <h3>Send on Arc Mainnet</h3>
          <p>Review details before signing.</p>
        </div>
        <span className="statusPill">USDC</span>
      </div>

      <div className="detailList">
        <div>
          <span>Amount</span>
          <b>{intent.amount} USDC</b>
        </div>
        <div>
          <span>Recipient (check every character)</span>
          <b className="monoAddr">{intent.to}</b>
        </div>
        <div>
          <span>Network</span>
          <b>Arc Mainnet (chain ID {ARC_MAINNET_CHAIN_ID})</b>
        </div>
        <div>
          <span>Your USDC balance</span>
          <b>
            {!address
              ? "Connect wallet"
              : balance === undefined
              ? "Loading..."
              : `${formatUsdc(balance)} USDC`}
          </b>
        </div>
        <div>
          <span>Network fee</span>
          <b>Paid in USDC from the same balance</b>
        </div>
      </div>

      {isLarge && !hash && (
        <p className="errorText">
          Large amount: more than {LARGE_AMOUNT_USDC} USDC. Consider sending a
          small test amount to this address first.
        </p>
      )}

      {!hash && (
        <label className="mainnetAck">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            I have checked the recipient and amount, and I understand this
            sends real USDC on Arc mainnet and cannot be undone.
          </span>
        </label>
      )}

      {!hash && (
        <button
          className="primaryAction"
          onClick={() => {
            void handleSend();
          }}
          disabled={!canSend}
        >
          {buttonLabel}
        </button>
      )}

      {!hash && acknowledged && problem && <p className="errorText">{problem}</p>}
      {error && <p className="errorText">{error}</p>}

      {isConfirming && (
        <p className="statusText">Transaction submitted. Waiting for confirmation on Arc mainnet...</p>
      )}

      {hash && (
        <div className="successBox">
          <h4>
            {reverted
              ? "Transaction reverted"
              : succeeded
              ? "Transaction confirmed on Arc Mainnet"
              : "Transaction submitted"}
          </h4>
          <p>{hash}</p>
          <a
            href={buildTxExplorerUrl(ARC_MAINNET_CHAIN_ID, hash)}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer
          </a>
        </div>
      )}
    </div>
  );
}
