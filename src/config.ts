/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import {
  arc,
  arcTestnet,
  arbitrumSepolia,
  avalancheFuji,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
} from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { getChain } from './onchain-facts'

// Arc mainnet RPC comes from the generated onchain facts, never typed by hand.
const arcMainnetRpc = getChain(arc.id)?.rpcUrls[0]

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  // Source chains for Unified Balance deposits are registered so the wallet can
  // be switched to (or asked to add) each of them through wagmi.
  chains: [
    arcTestnet,
    arc, // Arc mainnet: used only by the explicit "Send on mainnet" tab
    baseSepolia,
    sepolia,
    arbitrumSepolia,
    avalancheFuji,
    optimismSepolia,
    polygonAmoy,
    mainnet, // mainnet needed for ENS resolution
  ],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [arc.id]: http(arcMainnetRpc),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
