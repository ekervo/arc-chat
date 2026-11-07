import type { ReactNode } from "react";
import {
  ArchitectureDiagram,
  ConversationDiagram,
  FlowDiagram,
  TrustDiagram,
  UnifiedBalanceDiagram,
} from "./diagrams";

export interface DocItem {
  id: string;
  title: string;
  keywords: string;
  render: () => ReactNode;
}

export interface DocGroup {
  label: string;
  items: DocItem[];
}

const NETWORKS: Array<[string, string]> = [
  ["Arc Mainnet", "Send only (real funds)"],
  ["Arc Testnet", "Send, Swap, Bridge, Unified Balance spend"],
  ["Base Sepolia", "Bridge, Unified Balance deposit"],
  ["Ethereum Sepolia", "Bridge, Unified Balance deposit"],
  ["Arbitrum Sepolia", "Bridge, Unified Balance deposit"],
  ["Avalanche Fuji", "Bridge, Unified Balance deposit"],
  ["Optimism Sepolia", "Bridge, Unified Balance deposit"],
  ["Polygon Amoy", "Bridge, Unified Balance deposit"],
];

function Overview() {
  return (
    <>
      <p className="eyebrow">Introduction</p>
      <h1>Overview</h1>
      <p className="docsLead">
        AI Wallet for Arc is a chat-based wallet assistant. You type what you
        want to do, in any language, and the app prepares a transaction for you
        to review. You approve it with your own wallet. The assistant never
        signs anything.
      </p>

      <div className="docsStats">
        <div className="docsStat">
          <span>Actions</span>
          <b>4</b>
        </div>
        <div className="docsStat">
          <span>Networks</span>
          <b>7 testnets</b>
        </div>
        <div className="docsStat">
          <span>Asset</span>
          <b>USDC</b>
        </div>
        <div className="docsStat">
          <span>Signing</span>
          <b>You</b>
        </div>
      </div>

      <h2>What the app does</h2>
      <ul>
        <li>
          <b>Send.</b> Send USDC to any address on Arc Testnet, or on Arc Mainnet.
        </li>
        <li>
          <b>Bridge.</b> Move USDC between Arc Testnet and six other testnets.
        </li>
        <li>
          <b>Swap.</b> Swap between USDC and EURC on Arc Testnet.
        </li>
        <li>
          <b>Unified Balance.</b> Deposit USDC from many chains into one
          balance, then spend it on Arc Testnet.
        </li>
      </ul>

      <h2>The big picture</h2>
      <FlowDiagram
        steps={[
          { title: "You type", text: "“Bridge 2 USDC from Base to Arc”", tone: "you" },
          { title: "Assistant understands", text: "Works out the action and the details", tone: "ai" },
          { title: "Review card", text: "Shows amount, chains and recipient", tone: "app" },
          { title: "You sign", text: "Approve in your own wallet", tone: "you" },
          { title: "Onchain", text: "The transaction runs and you get a receipt", tone: "chain" },
        ]}
      />

      <div className="docsCallout">
        <p>
          Everything in this app runs on <b>testnets</b> with test tokens, except
          one feature: <b>Send on Arc Mainnet</b>, which moves real USDC. See
          its page before you use it.
        </p>
      </div>
    </>
  );
}

function GettingStarted() {
  return (
    <>
      <p className="eyebrow">Introduction</p>
      <h1>Getting started</h1>
      <p className="docsLead">
        You need a browser wallet and a little testnet USDC. It takes about two
        minutes.
      </p>

      <FlowDiagram
        steps={[
          { title: "Connect", text: "Press Connect Wallet at the top right", tone: "you" },
          { title: "Fund", text: "Get testnet USDC from the Circle testnet faucet", tone: "you" },
          { title: "Ask", text: "Type a request or press a quick button", tone: "you" },
          { title: "Review", text: "Check the card on the right", tone: "app" },
          { title: "Confirm", text: "Approve in your wallet", tone: "you" },
        ]}
      />

      <h2>Step by step</h2>
      <ol>
        <li>
          Install a browser wallet such as MetaMask and press{" "}
          <b>Connect Wallet</b>.
        </li>
        <li>
          Arc uses USDC to pay network fees, so one balance covers both your
          transfers and your gas. Fund your wallet with testnet USDC.
        </li>
        <li>
          Type a request in the chat, for example{" "}
          <code>Send 1 USDC to 0x…</code>, or press a quick button.
        </li>
        <li>
          Check the <b>Transaction Review</b> card on the right. Change the
          amount if you want.
        </li>
        <li>Confirm. Your wallet asks you to sign. Nothing happens before that.</li>
      </ol>
    </>
  );
}

function Chat() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Chat assistant</h1>
      <p className="docsLead">
        Talk to the assistant the way you would talk to a person. You do not
        need special commands.
      </p>

      <h2>Things you can say</h2>
      <ul>
        <li>
          <code>Send 1 USDC to 0x468867c8…</code>
        </li>
        <li>
          <code>Bridge 2 USDC from Base Sepolia to Arc</code>
        </li>
        <li>
          <code>Swap 1 USDC to EURC</code>
        </li>
        <li>
          <code>Deposit 3 USDC from Arbitrum to my unified balance</code>
        </li>
        <li>
          <code>chuyển 2 usdc từ base sang arc</code> (any language works)
        </li>
      </ul>

      <h2>Answer in pieces</h2>
      <p>
        The assistant remembers the recent conversation. If you leave something
        out, it asks for exactly that detail, and you can reply with just the
        missing part.
      </p>
      <ConversationDiagram />

      <h2>Built-in safety checks</h2>
      <ul>
        <li>A review card only appears when every detail is complete.</li>
        <li>
          Wallet addresses must be ones you typed yourself. The assistant cannot
          invent a recipient.
        </li>
        <li>Source and destination chains must be different for a bridge.</li>
      </ul>
    </>
  );
}

function Send() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Send</h1>
      <p className="docsLead">
        Send USDC from your wallet to another address on Arc Testnet, or on Arc
        Mainnet with real funds.
      </p>
      <FlowDiagram
        steps={[
          { title: "Ask", text: "“Send 2 USDC to 0x…”", tone: "you" },
          { title: "Review", text: "Amount, token, recipient, network", tone: "app" },
          { title: "Sign", text: "Confirm Transaction, then approve in wallet", tone: "you" },
          { title: "Receipt", text: "Transaction hash and explorer link", tone: "chain" },
        ]}
      />
      <h2>Good to know</h2>
      <ul>
        <li>Send has two tabs: Arc Testnet (default, test money) and Arc Mainnet.</li>
        <li>
          Arc Mainnet moves real USDC and cannot be undone. It shows a warning,
          your balance and the full recipient address, and it only unlocks
          after you tick a confirmation box. Typing “mainnet” in the chat opens
          that tab for you, but nothing is sent until you confirm.
        </li>
        <li>Read <a href="#/docs/send-mainnet">Send on Arc Mainnet</a> before using real funds.</li>
        <li>Try Arc Testnet first, or send a small amount to a new address before a large one.</li>
        <li>Check the recipient carefully. Onchain transfers cannot be undone.</li>
        <li>The network fee is paid in USDC.</li>
      </ul>
    </>
  );
}

function SendMainnet() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Send on Arc Mainnet</h1>
      <p className="docsLead">
        Send real USDC to another address on Arc Mainnet. This is the only
        feature in the app that works with real funds.
      </p>

      <div className="docsCallout">
        <p>
          <b>Mainnet transactions are real and cannot be undone.</b> Test the
          same steps on Arc Testnet first, and double-check the recipient
          address before you confirm.
        </p>
      </div>

      <h2>How a mainnet send works</h2>
      <FlowDiagram
        steps={[
          { title: "Ask", text: "“Send 5 USDC to 0x… on mainnet”", tone: "you" },
          { title: "Open the tab", text: "The Send card opens on the Arc Mainnet tab", tone: "app" },
          { title: "Review", text: "Warning, amount, full recipient, your balance", tone: "app" },
          { title: "Confirm", text: "Tick the box, then approve in your wallet", tone: "you" },
          { title: "Settled", text: "The app waits for the network, then shows the receipt", tone: "chain" },
        ]}
        caption="Nothing is sent until you tick the box, press the button and approve in your wallet."
      />

      <h2>Checks before anything is sent</h2>
      <FlowDiagram
        steps={[
          { title: "Wallet", text: "Connected, and switched to Arc Mainnet if needed", tone: "app" },
          { title: "Recipient", text: "A valid address that is not the zero address", tone: "app" },
          { title: "Amount", text: "A valid number that fits within your USDC balance", tone: "app" },
          { title: "Your OK", text: "Confirmation box ticked", tone: "you" },
        ]}
        caption="If a check fails, the Send button stays locked and the card says why."
      />

      <h2>Step by step</h2>
      <ol>
        <li>Open the Send card. Choose the <b>Arc Mainnet</b> tab, or type “mainnet” in the chat and it opens for you.</li>
        <li>Read the red banner, then check the amount, the full recipient address and your balance.</li>
        <li>Tick the box to confirm that you checked the recipient and the amount and that the transfer cannot be undone.</li>
        <li>Press <b>Send on Arc Mainnet</b> and approve in your wallet. Your wallet may first ask to add or switch to Arc Mainnet.</li>
        <li>Wait for the network to confirm. The card shows the receipt and an explorer link when it is final. If the transfer fails, the card says so instead of showing success.</li>
      </ol>

      <h2>Good to know</h2>
      <ul>
        <li>You need real USDC on Arc Mainnet. Test USDC from Arc Testnet does not work here.</li>
        <li>The network fee is paid in USDC from the same balance, so keep a little extra beyond the amount you send.</li>
        <li>Amounts above 100 USDC show an extra warning.</li>
        <li>The chat only prepares the card. It never signs, and it never picks the recipient: the address must come from what you typed.</li>
        <li>The Arc Testnet tab behaves exactly as before and uses test money.</li>
      </ul>

      <h2>Mainnet limits</h2>
      <ul>
        <li>Mainnet is available for <b>Send only</b>. Swap, Bridge and Unified Balance stay on testnets.</li>
        <li>Only USDC can be sent from this tab.</li>
      </ul>
    </>
  );
}

function Bridge() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Bridge</h1>
      <p className="docsLead">
        Move USDC from one network to another. The USDC is burned on the source
        chain and the same amount is created on the destination chain.
      </p>
      <FlowDiagram
        steps={[
          { title: "Ask", text: "“Bridge 2 USDC from Base to Arc”", tone: "you" },
          { title: "Review", text: "Amount, source, destination", tone: "app" },
          { title: "Sign", text: "Approve on the source chain", tone: "you" },
          { title: "Burn", text: "USDC leaves the source chain", tone: "chain" },
          { title: "Mint", text: "USDC arrives on the destination chain", tone: "chain" },
        ]}
        caption="Bridging uses Circle's cross-chain transfer protocol through App Kit."
      />
      <h2>Good to know</h2>
      <ul>
        <li>The review card shows each step and links to the explorer.</li>
        <li>Settlement can take a few minutes. Keep the page open.</li>
        <li>Your wallet may ask to switch networks. This is normal.</li>
      </ul>
    </>
  );
}

function Swap() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Swap</h1>
      <p className="docsLead">
        Swap between USDC and EURC on Arc Testnet. You see a quote first and
        decide whether to go ahead.
      </p>
      <FlowDiagram
        steps={[
          { title: "Ask", text: "“Swap 1 USDC to EURC”", tone: "you" },
          { title: "Get Quote", text: "See how much you would receive and the fee", tone: "app" },
          { title: "Confirm Swap", text: "Approve in your wallet", tone: "you" },
          { title: "Done", text: "Tokens are exchanged in one transaction", tone: "chain" },
        ]}
      />
      <h2>Good to know</h2>
      <ul>
        <li>Slippage tolerance is 3%. The swap fails if the price moves more.</li>
        <li>
          Swaps are routed through a third-party aggregator (currently LiFi),
          which may change over time. Its terms of service apply.
        </li>
        <li>
          On Arc, USDC and the native gas token are the same asset, so there is
          nothing to swap between them.
        </li>
        <li>Quotes are estimates. The final amount can differ slightly.</li>
      </ul>
    </>
  );
}

function UnifiedBalance() {
  return (
    <>
      <p className="eyebrow">Using the app</p>
      <h1>Unified Balance</h1>
      <p className="docsLead">
        Hold USDC on several chains and use it as one balance. Deposit from any
        supported chain, then spend on Arc Testnet.
      </p>
      <UnifiedBalanceDiagram />

      <h2>Deposit</h2>
      <p>
        Pick the source chain and the amount. The app switches your wallet to
        that chain, adds the network if your wallet does not have it, and asks
        you to sign. The panel shows your total and the balance on each chain.
      </p>

      <h2>Spend</h2>
      <p>
        Enter the amount and the recipient. You do not choose which chains
        supply the USDC. The app picks them for you:
      </p>
      <ol>
        <li>It draws from Arc Testnet first, because that is where the money is delivered.</li>
        <li>If more is needed, it takes from your other chains, largest balance first.</li>
        <li>Fees depend on the route and are applied automatically.</li>
      </ol>

      <div className="docsCallout">
        <p>
          A deposit becomes spendable once it is confirmed. Recent deposits can
          take a little while to show up in the total.
        </p>
      </div>
    </>
  );
}

function HowItWorks() {
  return (
    <>
      <p className="eyebrow">Concepts</p>
      <h1>How it works</h1>
      <p className="docsLead">
        Every request goes through the same path, so you always know what will
        happen before you sign.
      </p>
      <FlowDiagram
        steps={[
          { title: "Message", text: "You write a request in the chat", tone: "you" },
          { title: "Understand", text: "The assistant turns it into an action with details", tone: "ai" },
          { title: "Check", text: "The app rejects anything incomplete or unsafe", tone: "app" },
          { title: "Review", text: "A card shows exactly what will happen", tone: "app" },
          { title: "Sign", text: "Your wallet asks for approval", tone: "you" },
          { title: "Execute", text: "App Kit sends the transaction", tone: "chain" },
        ]}
      />
      <h2>Who is in control</h2>
      <TrustDiagram />
    </>
  );
}

function Networks() {
  return (
    <>
      <p className="eyebrow">Concepts</p>
      <h1>Supported networks</h1>
      <p className="docsLead">
        Every network is a testnet, except Arc Mainnet, which is available for
        Send only. Arc Testnet is the home network of the app.
      </p>
      <table className="docsTable">
        <thead>
          <tr>
            <th>Network</th>
            <th>Used for</th>
          </tr>
        </thead>
        <tbody>
          {NETWORKS.map(([name, use]) => (
            <tr key={name}>
              <td>
                <b>{name}</b>
              </td>
              <td>{use}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Arc is Circle's blockchain where USDC is the native gas token. Fees are
        paid in USDC and transactions finalize in under a second.
      </p>
    </>
  );
}

function Security() {
  return (
    <>
      <p className="eyebrow">Concepts</p>
      <h1>Risks and limits</h1>
      <h2>Safety</h2>
      <ul>
        <li>The assistant never has access to your keys or funds.</li>
        <li>Every transaction needs your signature in your own wallet.</li>
        <li>Recipient addresses come from what you type, never from the assistant.</li>
      </ul>
      <h2>Limits</h2>
      <ul>
        <li>Arc Mainnet is available for Send only (see Send on Arc Mainnet). Everything else is testnet.</li>
        <li>Swap runs on Arc Testnet. Send runs on Arc Testnet and Arc Mainnet.</li>
        <li>The swap card supports USDC and EURC.</li>
        <li>Unified Balance spends are delivered on Arc Testnet.</li>
        <li>Bridge and Unified Balance handle USDC only.</li>
      </ul>
      <h2>Risks to keep in mind</h2>
      <ul>
        <li>
          Onchain transactions are final. Double-check the recipient and the
          amount on the review card.
        </li>
        <li>Swap quotes are estimates and prices can move before you sign.</li>
        <li>Bridges and deposits take time. Do not close the page while one is running.</li>
      </ul>
      <div className="docsCallout">
        <p>
          Before using any similar app with real money, get an independent
          review. This app is a testnet demo.
        </p>
      </div>
    </>
  );
}

function Architecture() {
  return (
    <>
      <p className="eyebrow">Developers</p>
      <h1>Architecture</h1>
      <p className="docsLead">
        A React front end, a small chat service, and Circle App Kit for every
        onchain action.
      </p>
      <ArchitectureDiagram />
      <h2>Pieces</h2>
      <ul>
        <li>
          <b>React app.</b> The chat, the review cards and the wallet button.
        </li>
        <li>
          <b>Chat service.</b> Receives each message with the recent
          conversation, asks the language model for an action, and validates
          the result before the app sees it.
        </li>
        <li>
          <b>Circle App Kit.</b> Runs Send, Bridge, Swap and Unified Balance
          with the wallet you connected.
        </li>
      </ul>
      <h2>Configuration</h2>
      <p>
        One optional environment variable, <code>DEEPSEEK_API_KEY</code>, lets
        the assistant understand free-form messages in any language. Without it,
        a built-in parser handles common English commands. The key stays on the
        server.
      </p>
    </>
  );
}

function Faq() {
  const items: Array<[string, string]> = [
    [
      "Does the assistant hold my funds?",
      "No. Your funds stay in your wallet. The assistant only prepares a request, and nothing moves until you sign.",
    ],
    [
      "Why does my wallet ask to switch or add a network?",
      "Bridge and Unified Balance deposits sign on the source chain, so the wallet must be on that chain. If it is missing, your wallet offers to add it.",
    ],
    [
      "Why was I asked for more details?",
      "The assistant only shows a review card when the amount, the chains and the recipient are all clear. Reply with the missing detail.",
    ],
    [
      "I see two USDC balances on Arc. Which is real?",
      "They are the same money shown two ways. Arc uses USDC as its gas token, so wallets may show it with more decimals. Count it once.",
    ],
    [
      "My bridge is still pending.",
      "Cross-chain transfers can take a few minutes. Open the explorer link on the review card to follow progress.",
    ],
    [
      "Can I use real money in this app?",
      "Only for Send on Arc Mainnet. It has its own tab with a warning and a confirmation box. Everything else runs on testnets with test tokens.",
    ],
    [
      "Do I need an API key to use the app?",
      "No. The AI key is optional and only improves how well the assistant understands free-form text.",
    ],
  ];
  return (
    <>
      <p className="eyebrow">Help</p>
      <h1>FAQ</h1>
      <div className="docsFaq">
        {items.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </>
  );
}

export const DOC_GROUPS: DocGroup[] = [
  {
    label: "Introduction",
    items: [
      { id: "overview", title: "Overview", keywords: "intro about what", render: Overview },
      { id: "getting-started", title: "Getting started", keywords: "start connect wallet faucet begin", render: GettingStarted },
    ],
  },
  {
    label: "Using the app",
    items: [
      { id: "chat", title: "Chat assistant", keywords: "ai language vietnamese examples commands", render: Chat },
      { id: "send", title: "Send", keywords: "transfer pay usdc", render: Send },
      { id: "send-mainnet", title: "Send on Arc Mainnet", keywords: "mainnet real funds production live send usdc 5042", render: SendMainnet },
      { id: "bridge", title: "Bridge", keywords: "cross-chain cctp move", render: Bridge },
      { id: "swap", title: "Swap", keywords: "exchange eurc usdc quote slippage", render: Swap },
      { id: "unified-balance", title: "Unified Balance", keywords: "deposit spend pool gateway", render: UnifiedBalance },
    ],
  },
  {
    label: "Concepts",
    items: [
      { id: "how-it-works", title: "How it works", keywords: "flow diagram trust sign", render: HowItWorks },
      { id: "networks", title: "Supported networks", keywords: "chains testnet arc base sepolia", render: Networks },
      { id: "security", title: "Risks and limits", keywords: "safety security limits risk", render: Security },
    ],
  },
  {
    label: "Developers",
    items: [
      { id: "architecture", title: "Architecture", keywords: "stack app kit deepseek api env", render: Architecture },
    ],
  },
  {
    label: "Help",
    items: [{ id: "faq", title: "FAQ", keywords: "questions help problems", render: Faq }],
  },
];
