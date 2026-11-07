import { serve } from "bun";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const SYSTEM_PROMPT = `You are an AI Wallet Assistant for Arc, powered by Arc App Kit.

Always return valid JSON only. No markdown. No extra text.

Schema when no intent:
{"reply":"message to user","intent":null}

Send token intent:
{"reply":"I understand. You want to send <amount> <token> to <to>. Please review and confirm.","intent":{"action":"send_token","token":"<token>","amount":"<amount>","to":"<wallet_address>"}}

Bridge token intent:
{"reply":"I understand. You want to bridge <amount> USDC from <fromChain> to <toChain>. Please review and confirm.","intent":{"action":"bridge_token","token":"USDC","amount":"<amount>","fromChain":"<source_chain>","toChain":"<destination_chain>"}}

Unified Balance check intent:
{"reply":"Opening your Unified Balance panel.","intent":{"action":"unified_balance"}}

Unified Balance deposit intent:
{"reply":"I understand. You want to deposit <amount> USDC from <fromChain> to Unified Balance. Please review and confirm.","intent":{"action":"unified_balance_deposit","amount":"<amount>","fromChain":"<source_chain>"}}

Unified Balance spend intent:
{"reply":"I understand. You want to spend <amount> USDC from Unified Balance to <to>. Please review and confirm.","intent":{"action":"unified_balance_spend","amount":"<amount>","to":"<wallet_address>"}}

Send supports Arc Testnet and Arc Mainnet. If the user says "mainnet", still return the normal send_token intent: the app shows its own mainnet warning and confirmation, so never refuse and never add a network field.

Swap token intent (same-chain swap on Arc Testnet):
{"reply":"I understand. You want to swap <amount> <tokenIn> to <tokenOut> on Arc Testnet. Please review the quote and confirm.","intent":{"action":"swap_token","tokenIn":"<tokenIn>","tokenOut":"<tokenOut>","amount":"<amount>"}}

Supported swap tokens: USDC, EURC, USDT, PYUSD, DAI, WBTC, WETH, NATIVE
Swap chain: Arc_Testnet only (on testnet).
IMPORTANT: On Arc, USDC and NATIVE are the same asset. Never suggest swapping USDC <-> NATIVE.

Supported bridge chains (use exact key):
- Arc_Testnet
- Arbitrum_Sepolia
- Avalanche_Fuji
- Base_Sepolia
- Ethereum_Sepolia
- Polygon_Amoy_Testnet
- Optimism_Sepolia

Chain name mapping:
- arc, arc testnet, arc network => Arc_Testnet
- arbitrum sepolia, arb sepolia => Arbitrum_Sepolia
- avalanche fuji, fuji => Avalanche_Fuji
- base sepolia, base => Base_Sepolia
- ethereum sepolia, sepolia, eth sepolia => Ethereum_Sepolia
- polygon amoy, amoy, polygon => Polygon_Amoy_Testnet
- optimism sepolia, op sepolia, optimism => Optimism_Sepolia

Rules:
- The user may write in any language (Vietnamese, English, etc.) and may make typos. Understand the meaning, and write the "reply" text in the same language the user used.
- You receive the recent conversation. Use it to complete requests across several messages: if an earlier message gave the action, amount, token, chain or address, and the latest message supplies the missing piece (for example only a wallet address, only a number, or only a chain name), combine them and return the full intent.
- Phrases such as "the address I just sent", "that wallet", "địa chỉ ví vừa gửi" or "ví đó" refer to the most recent wallet address found in the conversation. Only use an address that really appears in the conversation, never invent one.
- If the latest message has no language signal (only an address, a number or a chain name), keep using the language of the earlier messages for the reply.
- When you still miss something, ask for exactly the missing detail in one short question and set intent to null. NEVER return an intent with an empty, placeholder or zero value: "amount" must be a positive number string, addresses must be real 0x addresses from the conversation, and bridge chains must be two different supported chains.
- Always keep the JSON keys and the intent values ("action", chain keys such as Base_Sepolia, token symbols) exactly as specified above, in English.
- Never execute transactions.
- Never invent amounts.
- Never invent wallet addresses.
- Bridge supports USDC only.
- Unified Balance supports USDC only.
- If amount is missing, ask for the amount and set intent to null.
- If recipient address is missing for send/spend, ask for the address and set intent to null.
- If source/destination chain is missing for bridge, ask for the chain names and set intent to null.
- For general questions about supported features, explain Send, Bridge, and Unified Balance briefly.`;

const CHAIN_KEYS = [
  "Arc_Testnet",
  "Arbitrum_Sepolia",
  "Avalanche_Fuji",
  "Base_Sepolia",
  "Ethereum_Sepolia",
  "Polygon_Amoy_Testnet",
  "Optimism_Sepolia",
];
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const VIETNAMESE_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function isPositive(value: unknown): boolean {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/**
 * Check an intent returned by the model before it reaches the UI.
 * Returns the list of missing/invalid details (empty = intent is usable).
 * Wallet addresses must literally appear in something the user typed.
 */
function missingIntentFields(intent: unknown, userText: string): string[] {
  if (!intent || typeof intent !== "object") return [];
  const i = intent as Record<string, unknown>;
  const missing: string[] = [];
  const typedAddresses = new Set(
    (userText.match(/0x[a-fA-F0-9]{40}/g) ?? []).map((a) => a.toLowerCase())
  );
  const addressOk = (v: unknown) =>
    typeof v === "string" &&
    ADDRESS_RE.test(v) &&
    typedAddresses.has(v.toLowerCase());

  switch (i.action) {
    case "send_token":
      if (!isPositive(i.amount)) missing.push("amount");
      if (!addressOk(i.to)) missing.push("address");
      break;
    case "bridge_token":
      if (!isPositive(i.amount)) missing.push("amount");
      if (!CHAIN_KEYS.includes(String(i.fromChain))) missing.push("source");
      if (!CHAIN_KEYS.includes(String(i.toChain))) missing.push("destination");
      else if (i.fromChain === i.toChain) missing.push("destination");
      break;
    case "swap_token": {
      if (!isPositive(i.amount)) missing.push("amount");
      const a = String(i.tokenIn ?? "").toUpperCase();
      const b = String(i.tokenOut ?? "").toUpperCase();
      const usdcNative =
        (a === "USDC" && b === "NATIVE") || (a === "NATIVE" && b === "USDC");
      if (!a || !b || a === b || usdcNative) missing.push("tokens");
      break;
    }
    case "unified_balance_deposit":
      if (!isPositive(i.amount)) missing.push("amount");
      if (!CHAIN_KEYS.includes(String(i.fromChain))) missing.push("source");
      break;
    case "unified_balance_spend":
      if (!isPositive(i.amount)) missing.push("amount");
      if (!addressOk(i.to)) missing.push("address");
      break;
    default:
      break;
  }
  return missing;
}

const MISSING_LABELS: Record<"en" | "vi", Record<string, string>> = {
  en: {
    amount: "the amount",
    address: "the recipient wallet address",
    source: "the source chain",
    destination: "a different destination chain",
    tokens: "two different tokens (USDC and NATIVE are the same asset on Arc)",
  },
  vi: {
    amount: "số lượng",
    address: "địa chỉ ví người nhận",
    source: "chain nguồn",
    destination: "chain đích (khác chain nguồn)",
    tokens: "hai token khác nhau (USDC và NATIVE là cùng một tài sản trên Arc)",
  },
};

async function handleChat(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      message?: string;
      history?: Array<{ role?: string; content?: string; intent?: unknown }>;
    };
    const message = body.message;

    // Keep only well-formed, recent history turns. Assistant turns are replayed
    // in the same JSON shape the model must answer with.
    const history = (Array.isArray(body.history) ? body.history : [])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-10)
      .map((m) =>
        m.role === "assistant"
          ? {
              role: "assistant" as const,
              content: JSON.stringify({
                reply: (m.content ?? "").slice(0, 1000),
                intent: m.intent ?? null,
              }),
            }
          : { role: "user" as const, content: (m.content ?? "").slice(0, 1000) }
      );

    if (!message?.trim()) {
      return Response.json({ reply: "Please enter a message.", intent: null });
    }

    if (!DEEPSEEK_API_KEY) {
      // Fallback: parse intents locally when no API key configured
      const reply = parseIntentLocally(message);
      return Response.json(reply, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const rawText = data.choices[0]?.message?.content || "{}";
    // Strip a possible ```json fence before parsing
    const raw = rawText
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "");

    let parsed: { reply?: string; intent?: unknown };
    try {
      parsed = JSON.parse(raw) as { reply?: string; intent?: unknown };
    } catch {
      parsed = { reply: raw, intent: null };
    }

    // Never let an incomplete or invented intent reach the UI: ask for the
    // missing details instead.
    const userText = [...history.filter((h) => h.role === "user").map((h) => h.content), message].join("\n");
    const missing = missingIntentFields(parsed.intent, userText);
    if (missing.length > 0) {
      const lang = VIETNAMESE_RE.test(userText) ? "vi" : "en";
      const list = [...new Set(missing)].map((k) => MISSING_LABELS[lang][k]).join(", ");
      parsed = {
        reply:
          lang === "vi"
            ? `Mình còn thiếu thông tin: ${list}. Bạn bổ sung giúp mình nhé.`
            : `I still need: ${list}. Please provide it.`,
        intent: null,
      };
    }

    return Response.json(parsed, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return Response.json(
      { reply: "AI processing failed. Please try again.", intent: null },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

// Local fallback parser when no API key is set
function parseIntentLocally(message: string): {
  reply: string;
  intent: unknown;
} {
  const lower = message.toLowerCase();

  // Bridge
  if (lower.includes("bridge")) {
    const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch?.[1];

    const chainMap: Record<string, string> = {
      "arc testnet": "Arc_Testnet",
      "arc network": "Arc_Testnet",
      arc: "Arc_Testnet",
      "base sepolia": "Base_Sepolia",
      base: "Base_Sepolia",
      "arbitrum sepolia": "Arbitrum_Sepolia",
      "arb sepolia": "Arbitrum_Sepolia",
      arbitrum: "Arbitrum_Sepolia",
      arb: "Arbitrum_Sepolia",
      "ethereum sepolia": "Ethereum_Sepolia",
      "eth sepolia": "Ethereum_Sepolia",
      ethereum: "Ethereum_Sepolia",
      sepolia: "Ethereum_Sepolia",
      "avalanche fuji": "Avalanche_Fuji",
      avalanche: "Avalanche_Fuji",
      fuji: "Avalanche_Fuji",
      "polygon amoy": "Polygon_Amoy_Testnet",
      polygon: "Polygon_Amoy_Testnet",
      amoy: "Polygon_Amoy_Testnet",
      "optimism sepolia": "Optimism_Sepolia",
      "op sepolia": "Optimism_Sepolia",
      optimism: "Optimism_Sepolia",
    };

    // Find every chain mentioned (longest alias wins) and decide source vs
    // destination from the words right before it ("from", "to", "sang"...).
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const aliases = Object.keys(chainMap).sort((a, b) => b.length - a.length);
    const chainRe = new RegExp(
      `(?<![a-z])(${aliases.map(escapeRe).join("|")})(?![a-z])`,
      "g"
    );
    const toRe = /(?<![\p{L}])(to|into|sang|qua|đến|den)(?![\p{L}])|->|→/u;
    const fromRe = /(?<![\p{L}])(from|từ|tu)(?![\p{L}])/u;

    let fromChain = "";
    let toChain = "";
    const unresolved: string[] = [];
    let prevEnd = 0;

    for (const m of lower.matchAll(chainRe)) {
      const start = m.index ?? 0;
      const chain = chainMap[m[1]];
      const gap = lower.slice(prevEnd, start);
      prevEnd = start + m[0].length;

      if (toRe.test(gap) && !toChain) toChain = chain;
      else if (fromRe.test(gap) && !fromChain) fromChain = chain;
      else unresolved.push(chain);
    }

    for (const chain of unresolved) {
      if (!fromChain && chain !== toChain) fromChain = chain;
      else if (!toChain && chain !== fromChain) toChain = chain;
    }

    if (!fromChain || !toChain) {
      const known = fromChain || toChain;
      return {
        reply: known
          ? `I understood ${known.replace(/_/g, " ")}, but I also need the ${
              fromChain ? "destination" : "source"
            } chain. For example: 'Bridge 1 USDC from Base Sepolia to Arc Testnet'.`
          : "To bridge USDC, I need the source chain and destination chain. For example: 'Bridge 1 USDC from Base Sepolia to Arc Testnet'.",
        intent: null,
      };
    }

    if (fromChain === toChain) {
      return {
        reply:
          "The source and destination chains must be different. Which chain do you want to bridge to?",
        intent: null,
      };
    }

    if (!amount) {
      return {
        reply:
          "How much USDC would you like to bridge? Please specify an amount.",
        intent: null,
      };
    }

    return {
      reply: `I understand. You want to bridge ${amount} USDC from ${fromChain} to ${toChain}. Please review and confirm.`,
      intent: {
        action: "bridge_token",
        token: "USDC",
        amount,
        fromChain,
        toChain,
      },
    };
  }

  // Send
  if (lower.includes("send")) {
    const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);

    if (!amountMatch?.[1]) {
      return {
        reply: "How much USDC would you like to send?",
        intent: null,
      };
    }

    if (!addressMatch?.[0]) {
      return {
        reply:
          "What is the recipient wallet address? Please provide a 0x address.",
        intent: null,
      };
    }

    return {
      reply: `I understand. You want to send ${amountMatch[1]} USDC to ${addressMatch[0]}. Please review and confirm.`,
      intent: {
        action: "send_token",
        token: "USDC",
        amount: amountMatch[1],
        to: addressMatch[0],
      },
    };
  }

  // Unified balance
  if (lower.includes("unified balance") || lower.includes("unified")) {
    if (lower.includes("deposit")) {
      const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
      return {
        reply: amountMatch?.[1]
          ? `I understand. You want to deposit ${amountMatch[1]} USDC to Unified Balance. Please review and confirm.`
          : "Opening the Unified Balance deposit panel.",
        intent: {
          action: "unified_balance_deposit",
          amount: amountMatch?.[1] || "1",
          fromChain: lower.includes("base")
            ? "Base_Sepolia"
            : lower.includes("arbitrum")
            ? "Arbitrum_Sepolia"
            : lower.includes("ethereum")
            ? "Ethereum_Sepolia"
            : "Base_Sepolia",
        },
      };
    }

    if (lower.includes("spend") || lower.includes("pay")) {
      const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
      return {
        reply: `Opening the Unified Balance spend panel.`,
        intent: {
          action: "unified_balance_spend",
          amount: amountMatch?.[1] || "1",
          to: addressMatch?.[0] || "",
        },
      };
    }

    return {
      reply: "Opening your Unified Balance panel.",
      intent: { action: "unified_balance" },
    };
  }

  // Swap
  if (lower.includes("swap")) {
    const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch?.[1];

    const allTokens = ["USDC", "EURC", "USDT", "PYUSD", "DAI", "WBTC", "WETH"];
    let tokenIn = "USDC";
    let tokenOut = "EURC";

    for (const t of allTokens) {
      if (lower.includes(`swap ${t.toLowerCase()}`)) tokenIn = t;
      if (lower.includes(`to ${t.toLowerCase()}`)) tokenOut = t;
      if (lower.includes(`for ${t.toLowerCase()}`)) tokenOut = t;
    }

    if (tokenIn === tokenOut) {
      return {
        reply: "The swap tokens must be different. Please specify different From and To tokens.",
        intent: null,
      };
    }

    if (!amount) {
      return {
        reply: "How much would you like to swap? Please specify an amount.",
        intent: null,
      };
    }

    return {
      reply: `I understand. You want to swap ${amount} ${tokenIn} to ${tokenOut} on Arc Testnet. Please review the quote and confirm.`,
      intent: {
        action: "swap_token",
        tokenIn,
        tokenOut,
        amount,
      },
    };
  }

  return {
    reply:
      "I can help you: Send USDC, Bridge USDC across chains, Swap tokens on Arc Testnet, or manage your Unified Balance (deposit & spend). What would you like to do?",
    intent: null,
  };
}

const port = 3001;
console.log(`Chat API server running on port ${port}`);

serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      return handleChat(req);
    }
    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    return new Response("Not found", { status: 404 });
  },
});
