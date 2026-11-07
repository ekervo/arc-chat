import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SendPanel from "./SendPanel";
import BridgeConfirm from "./BridgeConfirm";
import UnifiedBalancePanel from "./UnifiedBalancePanel";
import SwapConfirm from "./SwapConfirm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Intent the assistant proposed with this reply (sent back as context). */
  intent?: Intent;
}

type Intent =
  | {
      action: "send_token";
      token?: string;
      amount: string;
      to: string;
      /** Set only when the user typed "mainnet" in the chat. */
      network?: "mainnet";
    }
  | {
      action: "bridge_token";
      token?: string;
      amount: string;
      fromChain: string;
      toChain: string;
    }
  | { action: "unified_balance" }
  | { action: "unified_balance_deposit"; amount?: string; fromChain?: string }
  | { action: "unified_balance_spend"; amount?: string; to?: string }
  | { action: "swap_token"; tokenIn?: string; tokenOut?: string; amount?: string }
  | null;

const SUPPORTED_ACTIONS = [
  "send_token",
  "bridge_token",
  "unified_balance",
  "unified_balance_deposit",
  "unified_balance_spend",
  "swap_token",
];

const QUICK_PROMPTS = [
  {
    label: "Send 1 USDC",
    message: "Send 1 USDC to 0x468867c80Ca690528D4044DCaD22161aa6b47B91",
  },
  {
    label: "Bridge Base → Arc",
    message: "Bridge 1 USDC from Base Sepolia to Arc",
  },
  {
    label: "Swap USDC → EURC",
    message: "Swap 1 USDC to EURC on Arc Testnet",
  },
  { label: "Check Unified Balance", message: "Check my unified balance" },
  {
    label: "Deposit Unified",
    message: "Deposit 1 USDC from Base Sepolia to unified balance",
  },
  {
    label: "Spend Unified",
    message:
      "Spend 1 USDC from unified balance to 0x247f63331E37f349778b651FDB21ee5303dE0132",
  },
];

function getLocalFallbackIntent(text: string): Intent | null {
  const lower = text.toLowerCase();
  if (!lower.includes("unified balance") && !lower.includes("unified"))
    return null;

  if (lower.includes("deposit")) {
    const m = text.match(/deposit\s+([\d.]+)/i);
    return {
      action: "unified_balance_deposit",
      amount: m?.[1] ?? "1",
      fromChain: lower.includes("arbitrum")
        ? "Arbitrum_Sepolia"
        : lower.includes("ethereum")
        ? "Ethereum_Sepolia"
        : lower.includes("polygon")
        ? "Polygon_Amoy_Testnet"
        : "Base_Sepolia",
    };
  }

  if (lower.includes("spend") || lower.includes("pay")) {
    const m = text.match(/(?:spend|pay)\s+([\d.]+)/i);
    const addr = text.match(/0x[a-fA-F0-9]{40}/);
    return {
      action: "unified_balance_spend",
      amount: m?.[1] ?? "1",
      to: addr?.[0] ?? "",
    };
  }

  return { action: "unified_balance" };
}

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [intent, setIntent] = useState<Intent>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(customMessage?: string) {
    const text = (customMessage ?? message).trim();
    if (!text || loading) return;

    // Recent conversation so the AI can resolve follow-ups such as
    // "send 2 USDC to the address I just gave you".
    const history = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.intent ? { intent: m.intent } : {}),
    }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessage("");
    setIntent(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = (await res.json()) as {
        reply?: string;
        intent?: Intent;
      };

      let nextIntent = data.intent ?? null;

      // Preselect the mainnet tab only when the user explicitly said "mainnet".
      // The mainnet card still needs its own confirmation before anything is sent.
      if (nextIntent?.action === "send_token") {
        const recentUserText = [
          ...messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content),
          text,
        ].join(" ");
        if (/mainnet/i.test(recentUserText)) {
          nextIntent = { ...nextIntent, network: "mainnet" };
        }
      }

      // Unified balance fallback
      const ubFallback = getLocalFallbackIntent(text);
      if (
        ubFallback &&
        (nextIntent?.action === "bridge_token" ||
          nextIntent?.action === "send_token")
      ) {
        nextIntent = ubFallback;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ??
            (nextIntent
              ? "Please review and confirm."
              : "I can help you send, bridge, or manage Unified Balance USDC."),
          ...(nextIntent ? { intent: nextIntent } : {}),
        },
      ]);

      if (nextIntent?.action && SUPPORTED_ACTIONS.includes(nextIntent.action)) {
        setIntent(nextIntent);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="appGrid">
      {/* LEFT: Chat console */}
      <div className="consolePanel">
        <div className="sectionLabel">Natural Language Transactions</div>

        <h1>AI Wallet Assistant</h1>

        <p className="subtitle">
          Send, bridge, and manage Unified Balance USDC with plain text — you
          always review and sign.
        </p>

        <div className="smallTitle" style={{ marginBottom: 8 }}>
          Supported App Kit Actions
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {["Send", "Bridge", "Swap", "Unified Balance", "Deposit", "Spend"].map(
            (c) => (
              <span
                key={c}
                style={{
                  background: "white",
                  border: "2px solid #111",
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#111",
                }}
              >
                {c}
              </span>
            )
          )}
        </div>

        <div
          className="smallTitle"
          style={{ borderTop: "2px solid #111", paddingTop: 16, marginBottom: 8 }}
        >
          Agent Console
        </div>

        {/* Messages */}
        <div className="messages" role="log" aria-live="polite">
          {messages.length === 0 && !loading && (
            <div className="emptyMessage">
              Ask your wallet assistant to prepare a transaction.
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <span>{msg.role === "user" ? "You" : "Assistant"}</span>
              <p>{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <span>Assistant</span>
              <div className="typingDots">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        <div className="quickActions">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => void sendMessage(p.message)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="composer">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send 1 USDC to 0x... or Spend 1 USDC from unified balance to 0x..."
            rows={2}
            disabled={loading}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={loading || !message.trim()}
            aria-label="Send"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : "↑"}
          </button>
        </div>
      </div>

      {/* RIGHT: Review panel */}
      <div className="reviewPanel">
        <div className="smallTitle">Transaction Review</div>

        {!intent && (
          <div className="emptyReview">
            <div className="reviewIcon">⌁</div>
            <h3>No pending action</h3>
            <p>Your transaction confirmation will appear here to review.</p>
          </div>
        )}

        {intent?.action === "send_token" && (
          <SendPanel intent={intent} />
        )}

        {intent?.action === "bridge_token" && (
          <BridgeConfirm intent={intent} />
        )}

        {intent?.action === "unified_balance" && (
          <UnifiedBalancePanel />
        )}

        {intent?.action === "unified_balance_deposit" && (
          <UnifiedBalancePanel intent={intent} defaultMode="deposit" />
        )}

        {intent?.action === "unified_balance_spend" && (
          <UnifiedBalancePanel intent={intent} defaultMode="spend" />
        )}

        {intent?.action === "swap_token" && (
          <SwapConfirm intent={intent} />
        )}

        <div className="statGrid">
          <div className="statCard">
            <span>Network</span>
            <b>Arc Testnet</b>
          </div>
          <div className="statCard">
            <span>Security</span>
            <b>User Signed</b>
          </div>
        </div>
      </div>
    </section>
  );
}
