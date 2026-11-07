import { useEffect, useSyncExternalStore } from "react";
import { ConnectKitButton } from "connectkit";
import { BookOpen } from "lucide-react";
import { NetworkArc } from "@web3icons/react";
import ChatBox from "./components/ChatBox";
import DocsPage, { docsSectionFromHash, isDocsHash } from "./docs/DocsPage";

const CAPABILITIES = [
  {
    title: "Send",
    status: "Live",
    desc: "Send USDC from one wallet to another on the same blockchain.",
  },
  {
    title: "Bridge",
    status: "Live",
    desc: "Move USDC across supported blockchains using Arc App Kit.",
  },
  {
    title: "Swap",
    status: "Live",
    desc: "Swap USDC, EURC, and other supported tokens on Arc Testnet via App Kit.",
  },
  {
    title: "Unified Balance",
    status: "Live",
    desc: "Combine USDC balances across chains into one spendable balance.",
  },
];

const NETWORKS = [
  "Arc Testnet",
  "Arbitrum Sepolia",
  "Avalanche Fuji",
  "Base Sepolia",
  "Ethereum Sepolia",
  "Polygon Amoy Testnet",
  "Optimism Sepolia",
];

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Tiny hash router: "#/docs/..." shows the documentation, anything else the app. */
export default function App() {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => ""
  );
  const showDocs = isDocsHash(hash);
  const section = docsSectionFromHash(hash);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [showDocs, section]);

  return (
    <main className="site">
      {showDocs ? <DocsPage section={section} /> : <Home />}
    </main>
  );
}

function Home() {
  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="brand">
          <div className="brandMark" />
          <span>AI Wallet for Arc</span>
        </div>
        <div className="navLinks">
          <a className="navDocs" href="#/docs">
            <BookOpen size={16} aria-hidden />
            Docs
          </a>
          <ConnectKitButton />
          <a
            className="navArcLogo"
            href="https://www.arc.io"
            target="_blank"
            rel="noreferrer"
            aria-label="Arc"
            title="Arc"
          >
            <NetworkArc variant="branded" size={40} aria-hidden />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="heroNew">
        <div className="heroCopy">
          <p className="eyebrow">Powered by Arc App Kit</p>
          <h1>
            Chat with your wallet.
            <br />
            Send and bridge USDC with AI.
          </h1>
          <p className="heroText">
            A natural-language wallet agent that uses Arc App Kit to prepare
            stablecoin transactions. The AI never signs. You always review and
            confirm with your own wallet.
          </p>
          <div className="heroActions">
            <span>Send USDC</span>
            <span>Bridge USDC</span>
            <span>ArcScan Links</span>
            <span>User-Signed</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="cardTop">
            <span className="pulse" />
            <span>Transaction Agent</span>
          </div>
          <div className="mockCommand">
            Bridge 1 USDC from Base Sepolia to Arc
          </div>
          <div className="mockReview">
            <div>
              <span>Intent</span>
              <b>bridge_token</b>
            </div>
            <div>
              <span>Asset</span>
              <b>USDC</b>
            </div>
            <div>
              <span>Security</span>
              <b>User signs in wallet</b>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="capabilities">
        <div className="sectionHead">
          <p className="eyebrow">Arc App Kit Capabilities</p>
          <h2>One AI interface for stablecoin actions</h2>
          <p>
            Arc App Kit provides Send, Bridge, Swap, and Unified Balance through
            a unified SDK interface.
          </p>
        </div>
        <div className="capGrid">
          {CAPABILITIES.map((item) => (
            <div className="capCard" key={item.title}>
              <div className="capTop">
                <h3>{item.title}</h3>
                <span>{item.status}</span>
              </div>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Networks */}
      <section className="supportedNetworks">
        <p className="eyebrow">Supported Bridge Networks</p>
        <div className="networkRow">
          {NETWORKS.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </section>

      {/* Chat */}
      <ChatBox />
    </>
  );
}
