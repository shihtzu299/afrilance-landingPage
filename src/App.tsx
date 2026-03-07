import { useEffect, useMemo, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia, bscTestnet } from "viem/chains";

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import {
  FaTelegramPlane,
  FaYoutube,
  FaGithub,
  FaTwitter,
  FaExternalLinkAlt,
} from "react-icons/fa";
import "./App.css";

// ---- Minimal ABI for PaylinkVault analytics ----
const PAYLINK_VAULT_ANALYTICS_ABI = [
  {
    type: "function",
    name: "totalPaidUSDC",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalPaidUSDT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const ESCROW_FACTORY_ABI = [
  {
    type: "function",
    name: "totalEscrowsDeployed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const EXPLORER_CONTRACT_URL = {
  84532: (address: string) =>
    `https://base-sepolia.blockscout.com/address/${address}`,
  97: (address: string) => `https://testnet.bscscan.com/address/${address}`,
} as const;

const PAYLINK_VAULT_ADDRESS = {
  // Base Sepolia
  84532: "0x7a0f5a8147039653E5D6DeD693d55F6bca980aF4",
  // BNB Testnet
  97: "0x314911F3FE16e2c7BA18fe76450DD5Ad993eaDE2",
} as const;

// Escrow factory addresses
const ESCROW_FACTORY_ADDRESS = {
  84532: "0x672C637dB6a81cD9f8d9E1e87f85218D1C52F6ff", // replace with Base factory
  97: "0xbc389c697272B375FbE0f6917D3B4327391a74ec", // replace with BNB factory
} as const;

function App() {
  const [, setInit] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---- Public clients (no wallet needed) ----
  const baseClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(), // uses default RPC; replace with your own RPC for reliability
      }),
    [],
  );

  const bnbClient = useMemo(
    () =>
      createPublicClient({
        chain: bscTestnet,
        transport: http(),
      }),
    [],
  );

  const [metrics, setMetrics] = useState<{
    paylinksVolumeBase: string; // formatted
    paylinksVolumeBnb: string; // formatted
    escrowsBase: string; // formatted
    escrowsBnb: string; // formatted
  }>({
    paylinksVolumeBase: "—",
    paylinksVolumeBnb: "—",
    escrowsBase: "—",
    escrowsBnb: "—",
  });

  function isZeroAddress(a: string) {
    return /^0x0{40}$/i.test(a);
  }

  const TOKEN_DECIMALS = {
    84532: { usdc: 6, usdt: 6 },
    97: { usdc: 18, usdt: 18 }, // update these to match your actual BNB test token decimals
  } as const;

  function formatNumberLikeUsd(value: number): string {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  async function fetchPaylinksVolume() {
    // Base
    try {
      const addr = PAYLINK_VAULT_ADDRESS[84532];
      if (!isZeroAddress(addr)) {
        const [usdc, usdt] = await Promise.all([
          baseClient.readContract({
            address: addr as `0x${string}`,
            abi: PAYLINK_VAULT_ANALYTICS_ABI,
            functionName: "totalPaidUSDC",
          }),
          baseClient.readContract({
            address: addr as `0x${string}`,
            abi: PAYLINK_VAULT_ANALYTICS_ABI,
            functionName: "totalPaidUSDT",
          }),
        ]);

        const usdcValue = Number(
          formatUnits(usdc as bigint, TOKEN_DECIMALS[84532].usdc),
        );
        const usdtValue = Number(
          formatUnits(usdt as bigint, TOKEN_DECIMALS[84532].usdt),
        );
        const formatted = formatNumberLikeUsd(usdcValue + usdtValue);
        setMetrics((m) => ({ ...m, paylinksVolumeBase: formatted }));
      }
    } catch {
      setMetrics((m) => ({ ...m, paylinksVolumeBase: "—" }));
    }

    // BNB
    try {
      const addr = PAYLINK_VAULT_ADDRESS[97];
      if (!isZeroAddress(addr)) {
        const [usdc, usdt] = await Promise.all([
          bnbClient.readContract({
            address: addr as `0x${string}`,
            abi: PAYLINK_VAULT_ANALYTICS_ABI,
            functionName: "totalPaidUSDC",
          }),
          bnbClient.readContract({
            address: addr as `0x${string}`,
            abi: PAYLINK_VAULT_ANALYTICS_ABI,
            functionName: "totalPaidUSDT",
          }),
        ]);

        const usdcValue = Number(
          formatUnits(usdc as bigint, TOKEN_DECIMALS[97].usdc),
        );
        const usdtValue = Number(
          formatUnits(usdt as bigint, TOKEN_DECIMALS[97].usdt),
        );
        const formatted = formatNumberLikeUsd(usdcValue + usdtValue);
        setMetrics((m) => ({ ...m, paylinksVolumeBnb: formatted }));
      }
    } catch {
      setMetrics((m) => ({ ...m, paylinksVolumeBnb: "—" }));
    }
  }

  async function fetchEscrowCounts() {
    // Base
    try {
      const addr = ESCROW_FACTORY_ADDRESS[84532];
      if (!isZeroAddress(addr)) {
        const count = await baseClient.readContract({
          address: addr as `0x${string}`,
          abi: ESCROW_FACTORY_ABI,
          functionName: "totalEscrowsDeployed",
        });

        setMetrics((m) => ({
          ...m,
          escrowsBase: Number(count).toLocaleString(),
        }));
      } else {
        setMetrics((m) => ({ ...m, escrowsBase: "—" }));
      }
    } catch {
      setMetrics((m) => ({ ...m, escrowsBase: "—" }));
    }

    // BNB
    try {
      const addr = ESCROW_FACTORY_ADDRESS[97];
      if (!isZeroAddress(addr)) {
        const count = await bnbClient.readContract({
          address: addr as `0x${string}`,
          abi: ESCROW_FACTORY_ABI,
          functionName: "totalEscrowsDeployed",
        });

        setMetrics((m) => ({
          ...m,
          escrowsBnb: Number(count).toLocaleString(),
        }));
      } else {
        setMetrics((m) => ({ ...m, escrowsBnb: "—" }));
      }
    } catch {
      setMetrics((m) => ({ ...m, escrowsBnb: "—" }));
    }
  }

  useEffect(() => {
    // initial load + refresh interval
    const run = async () => {
      await fetchPaylinksVolume();
      await fetchEscrowCounts();
    };

    void run();

    const t = setInterval(() => {
      void run();
    }, 25000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  useEffect(() => {
    if (!showChainMenu && !showNavMenu) return;

    const handleClickOutside = () => {
      setShowChainMenu(false);
      setShowNavMenu(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showChainMenu, showNavMenu]);

  // Loading fade out after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative bg-[#050816] text-white overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050816]">
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#00ffea] to-[#0066ff] bg-clip-text text-transparent animate-pulse">
              Initializing Blockchain...
            </h2>
            <p className="text-gray-400">Connecting to AfriLance network</p>
          </div>
        </div>
      )}

      <Particles
        id="tsparticles"
        options={{
          background: {
            color: { value: "#050816" },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              resize: { enable: true },
            },
            modes: { repulse: { distance: 180, duration: 0.5 } },
          },
          particles: {
            color: { value: ["#00ffea", "#0066ff"] },
            links: {
              color: "#00ffea",
              distance: 150,
              enable: true,
              opacity: 0.3,
              width: 1,
            },
            move: { enable: true, speed: 2 },
            number: {
              density: { enable: true, width: 1920, height: 1080 },
              value: 80,
            },
            opacity: { value: 0.5 },
            size: { value: { min: 1, max: 5 } },
          },
          detectRetina: true,
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -10,
        }}
      />

      {/* Header - Logo top left + Nav top right */}
      <header className="absolute top-0 left-0 right-0 z-20 py-5 sm:py-6">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="AfriLance Logo" className="h-12 w-12" />
          </a>

          {/* ===== GLOBAL TOP-RIGHT NAV ===== */}
          <div className="globalNav">
            {/* Desktop */}
            <a
              href="https://wooded-budget-e6b.notion.site/AfriLance-Documentation-Hub-v2-301cdfc6438080048655cf726ec29eac"
              target="_blank"
              rel="noopener noreferrer"
              className="globalNav__docs"
              onClick={() => setShowNavMenu(false)}
            >
              Read Docs
              <FaExternalLinkAlt className="opacity-80" size={14} />
            </a>

            <div className="globalNav__mobile">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNavMenu((v) => !v);
                }}
                className="globalNav__hamburger"
                aria-label="Open menu"
              >
                ☰
              </button>

              {showNavMenu && (
                <div
                  className="globalNav__dropdown"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <a
                    href="https://wooded-budget-e6b.notion.site/AfriLance-Documentation-Hub-v2-301cdfc6438080048655cf726ec29eac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="globalNav__item"
                    onClick={() => setShowNavMenu(false)}
                  >
                    Read Docs
                    <FaExternalLinkAlt className="opacity-80" size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-28 sm:pt-32">
        {/* Hero */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[85vh] px-6 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-[#00ffea] to-[#0066ff] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,234,0.35)]">
            AfriLance
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mb-10 sm:mb-20 leading-relaxed">
            Get paid in stablecoins with shareable Paylinks and protected
            Escrow. Built for freelancers and crypto-native clients on Base and
            BNB Chain.
          </p>

          {/* Live counters */}
          <div className="w-full max-w-4xl mb-10 sm:mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href={EXPLORER_CONTRACT_URL[84532](
                  PAYLINK_VAULT_ADDRESS[84532],
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="metricCard"
              >
                <div className="text-xs text-gray-400">
                  Paylinks Volume (Base)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {metrics.paylinksVolumeBase}{" "}
                  <span className="text-sm text-gray-300">USDC/USDT</span>
                </div>
              </a>

              <a
                href={EXPLORER_CONTRACT_URL[97](PAYLINK_VAULT_ADDRESS[97])}
                target="_blank"
                rel="noopener noreferrer"
                className="metricCard"
              >
                <div className="text-xs text-gray-400">
                  Paylinks Volume (BNB)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {metrics.paylinksVolumeBnb}{" "}
                  <span className="text-sm text-gray-300">USDC/USDT</span>
                </div>
              </a>

              <a
                href={EXPLORER_CONTRACT_URL[84532](
                  ESCROW_FACTORY_ADDRESS[84532],
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="metricCard"
              >
                <div className="text-xs text-gray-400">
                  Escrows Deployed (Base)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {metrics.escrowsBase}
                </div>
              </a>

              <a
                href={EXPLORER_CONTRACT_URL[97](ESCROW_FACTORY_ADDRESS[97])}
                target="_blank"
                rel="noopener noreferrer"
                className="metricCard"
              >
                <div className="text-xs text-gray-400">
                  Escrows Deployed (BNB)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {metrics.escrowsBnb}
                </div>
              </a>
            </div>

            <div className="text-xs text-gray-500 mt-3">
              Live on Base & BNB Chain — All payments verifiable on-chain.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full sm:w-auto">
            <a
              href="https://escrow.afrilance.xyz/"
              rel="noopener noreferrer"
              className="ctaBtn w-full sm:w-auto px-4 py-2 text-base sm:text-lg font-semibold rounded-xl
bg-gradient-to-r from-[#00ffea] via-[#00cfff] to-[#0066ff]
text-[#050816] shadow-md hover:shadow-[0_0_20px_rgba(0,255,234,0.5)]
transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              Use Escrow
            </a>

            <a
              href="https://pay.afrilance.xyz/"
              rel="noopener noreferrer"
              className="ctaBtn w-full sm:w-auto px-4 py-2 text-base sm:text-lg font-semibold rounded-xl
bg-gradient-to-r from-[#184d1f] via-[#1c6b4a] to-[#2ea66f]
text-[#f8f8fa] shadow-md hover:shadow-[0_0_20px_rgba(46,166,111,0.5)]
transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              Create PayLink
            </a>
          </div>
        </div>
      </main>

      <footer className="relative z-20 mt-12 pb-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Connect with us</p>
        <div className="relative z-20 flex justify-center gap-8 flex-wrap">
          <a
            href="https://t.me/AfriLance_bot"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition"
          >
            <FaTelegramPlane size={32} />
            <p className="text-xs mt-1 text-gray-400">Bot</p>
          </a>

          <a
            href="https://t.me/AfriLanceCommunity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition"
          >
            <FaTelegramPlane size={32} />
            <p className="text-xs mt-1 text-gray-400">Group</p>
          </a>

          <a
            href="https://x.com/AfriLanceHQ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-300 transition"
          >
            <FaTwitter size={32} />
            <p className="text-xs mt-1 text-gray-400">X</p>
          </a>

          <a
            href="https://www.youtube.com/@AfrilanceTube"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 transition"
          >
            <FaYoutube size={32} />
            <p className="text-xs mt-1 text-gray-400">YouTube</p>
          </a>

          <a
            href="https://github.com/shihtzu299"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition"
          >
            <FaGithub size={32} />
            <p className="text-xs mt-1 text-gray-400">GitHub</p>
          </a>
        </div>

        <p className="text-gray-600 text-xs mt-4">support@afrilance.xyz</p>

        <p className="text-gray-600 text-xs mt-8">
          © 2026 AfriLance — Work. Paid. Anywhere.
        </p>
      </footer>
    </div>
  );
}

export default App;
