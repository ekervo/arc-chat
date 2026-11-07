import { useState } from "react";
import SendConfirm from "./SendConfirm";
import SendMainnetConfirm from "./SendMainnetConfirm";

interface SendIntent {
  token?: string;
  amount: string;
  to: string;
  /** Preselects the mainnet tab when the user typed "mainnet" in the chat. */
  network?: "mainnet";
}

type Network = "testnet" | "mainnet";

/**
 * The Send section: Arc Testnet (default, unchanged) and Arc Mainnet.
 * Mainnet is only shown when the user picks it or asks for it by name.
 */
export default function SendPanel({ intent }: { intent: SendIntent }) {
  const [network, setNetwork] = useState<Network>(
    intent.network === "mainnet" ? "mainnet" : "testnet"
  );

  return (
    <div>
      <div className="ubTabs" role="tablist" aria-label="Send network">
        <button
          role="tab"
          aria-selected={network === "testnet"}
          className={network === "testnet" ? "activeTab" : ""}
          onClick={() => setNetwork("testnet")}
        >
          Arc Testnet
        </button>
        <button
          role="tab"
          aria-selected={network === "mainnet"}
          className={`mainnetTab ${network === "mainnet" ? "activeTab" : ""}`}
          onClick={() => setNetwork("mainnet")}
        >
          Arc Mainnet
        </button>
      </div>

      {network === "testnet" ? (
        <SendConfirm intent={intent} />
      ) : (
        <SendMainnetConfirm intent={intent} />
      )}
    </div>
  );
}
