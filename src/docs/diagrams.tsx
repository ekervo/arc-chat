import { Fragment, type ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";

type Tone = "you" | "ai" | "app" | "chain";

export interface FlowStep {
  title: string;
  text: string;
  tone?: Tone;
}

const TONE_LABEL: Record<Tone, string> = {
  you: "You",
  ai: "Assistant",
  app: "App",
  chain: "Blockchain",
};

/** Colour key shared by every diagram. */
export function DiagramLegend({ tones }: { tones: Tone[] }) {
  return (
    <div className="docLegend">
      {tones.map((t) => (
        <span key={t}>
          <i className={`docDot tone-${t}`} />
          {TONE_LABEL[t]}
        </span>
      ))}
    </div>
  );
}

function Figure({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}) {
  return (
    <figure className="docFigure">
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Numbered left-to-right steps joined by arrows (wraps on small screens). */
export function FlowDiagram({
  steps,
  caption,
}: {
  steps: FlowStep[];
  caption?: string;
}) {
  const tones = [...new Set(steps.map((s) => s.tone ?? "app"))];
  return (
    <Figure caption={caption}>
      <DiagramLegend tones={tones} />
      <div className="docFlow">
        {steps.map((s, i) => (
          <Fragment key={s.title}>
            <div className={`docStep tone-${s.tone ?? "app"}`}>
              <span className="docStepNo">{i + 1}</span>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="docArrow" size={22} aria-hidden />
            )}
          </Fragment>
        ))}
      </div>
    </Figure>
  );
}

const DEPOSIT_SOURCES = [
  "Base Sepolia",
  "Ethereum Sepolia",
  "Arbitrum Sepolia",
  "Avalanche Fuji",
  "Optimism Sepolia",
  "Polygon Amoy",
];

/** Many chains feed one pool, the pool pays out on Arc Testnet. */
export function UnifiedBalanceDiagram() {
  return (
    <Figure caption="USDC stays on the chains you deposit from. The app adds it up into one balance you can spend on Arc Testnet.">
      <DiagramLegend tones={["you", "app", "chain"]} />
      <div className="docUB">
        <div className="docUBCol">
          <div className="docUBLabel">1. Deposit from any chain</div>
          {DEPOSIT_SOURCES.map((s) => (
            <div className="docChip" key={s}>
              {s}
            </div>
          ))}
        </div>
        <div className="docUBMid">
          <ArrowRight className="docArrow" size={22} aria-hidden />
          <div className="docPool">
            <b>Unified Balance</b>
            <span>one pool of USDC</span>
          </div>
          <ArrowRight className="docArrow" size={22} aria-hidden />
        </div>
        <div className="docUBCol">
          <div className="docUBLabel">2. Spend on Arc Testnet</div>
          <div className="docChip tone-chain">Arc Testnet</div>
          <div className="docNote">The recipient receives USDC</div>
        </div>
      </div>
    </Figure>
  );
}

/** Who can do what: the assistant only suggests, the user signs. */
export function TrustDiagram() {
  return (
    <Figure caption="The assistant never holds keys and never sends a transaction. Nothing moves until you approve it in your wallet.">
      <div className="docTrust">
        <div className="docTrustCard tone-ai">
          <h4>The assistant can</h4>
          <ul>
            <li>Understand what you typed, in any language</li>
            <li>Ask for missing details</li>
            <li>Prepare a transaction for review</li>
          </ul>
        </div>
        <div className="docTrustGate" aria-hidden>
          <ArrowRight className="docArrow" size={22} />
          <span>Review card</span>
        </div>
        <div className="docTrustCard tone-you">
          <h4>Only you can</h4>
          <ul>
            <li>Confirm the details on the review card</li>
            <li>Sign in your own wallet</li>
            <li>Choose to reject at any time</li>
          </ul>
        </div>
      </div>
    </Figure>
  );
}

function Layer({
  label,
  tone,
  items,
}: {
  label: string;
  tone: Tone;
  items: string[];
}) {
  return (
    <div className="docLayer">
      <div className="docLayerLabel">{label}</div>
      <div className="docLayerItems">
        {items.map((i) => (
          <span key={i} className={`docBox tone-${tone}`}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Stack of the pieces the app is built from. */
export function ArchitectureDiagram() {
  return (
    <Figure caption="The browser talks to a small chat service for language understanding, and to Circle App Kit for everything that touches a blockchain.">
      <DiagramLegend tones={["you", "ai", "app", "chain"]} />
      <div className="docStack">
        <Layer
          label="Your browser"
          tone="you"
          items={["React app", "Wallet connection (wagmi, ConnectKit)", "Review cards"]}
        />
        <ArrowDown className="docArrowDown" size={22} aria-hidden />
        <Layer
          label="Chat service"
          tone="ai"
          items={["Chat API (Bun)", "DeepSeek (optional)", "Safety checks"]}
        />
        <ArrowDown className="docArrowDown" size={22} aria-hidden />
        <Layer
          label="Circle App Kit"
          tone="app"
          items={["Send", "Bridge", "Swap", "Unified Balance"]}
        />
        <ArrowDown className="docArrowDown" size={22} aria-hidden />
        <Layer
          label="Networks"
          tone="chain"
          items={[
            "Arc Testnet",
            "Base Sepolia",
            "Ethereum Sepolia",
            "Arbitrum Sepolia",
            "Avalanche Fuji",
            "Optimism Sepolia",
            "Polygon Amoy",
          ]}
        />
      </div>
    </Figure>
  );
}

/** Two ways a conversation can finish: ask again, or show the review card. */
export function ConversationDiagram() {
  return (
    <Figure caption="If something is missing, the assistant asks for exactly that detail. Earlier messages are remembered, so you can answer in pieces.">
      <DiagramLegend tones={["you", "ai", "app"]} />
      <div className="docConv">
        <div className="docBubble you">gửi 2 usdc</div>
        <div className="docBubble ai">Bạn muốn gửi đến địa chỉ ví nào?</div>
        <div className="docBubble you">0x3703…cc0e</div>
        <div className="docBubble app">Review card: Send 2 USDC → 0x3703…cc0e</div>
      </div>
    </Figure>
  );
}
