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
import baseLogo from "./assets/base-logo.svg";
import bnbLogo from "./assets/bnb-logo.svg";
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
  84532: "0x672C637dB6a81cD9f8d9E1e87f85218D1C52F6ff",
  97: "0xbc389c697272B375FbE0f6917D3B4327391a74ec",
} as const;

const PRODUCT_CARDS = [
  {
    title: "Freelance Escrow",
    subtitle: "Protected milestone payments",
    description:
      "A decentralized escrow flow for freelancers and clients to transact in stablecoins with transparent on-chain state, work submission, approval, revisions, and dispute handling.",
    bullets: [
      "Milestone-style payment protection",
      "Client and freelancer role separation",
      "On-chain status tracking and settlement",
    ],
    href: "https://escrow.afrilance.xyz/",
    cta: "Use Escrow",
    primary: true,
  },
  {
    title: "PayLinks",
    subtitle: "Shareable on-chain payment links",
    description:
      "Create stablecoin payment links that anyone can open and pay on-chain. Ideal for invoices, quick requests, remote services, and crypto-native collections.",
    bullets: [
      "Simple payment request flow",
      "Shareable URL-based payment experience",
      "Fast stablecoin settlement across supported chains",
    ],
    href: "https://pay.afrilance.xyz/",
    cta: "Create PayLink",
    primary: false,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create",
    text: "Set up an escrow or generate a paylink in a few clicks using supported stablecoins.",
  },
  {
    step: "02",
    title: "Share / Collaborate",
    text: "Invite the other party to interact through a secure workflow or a simple payment URL.",
  },
  {
    step: "03",
    title: "Settle On-Chain",
    text: "Payments, approvals, and status updates are recorded on-chain across Base and BNB Chain.",
  },
] as const;

const WHY_AFRILANCE = [
  {
    title: "Stablecoin-native",
    text: "Built for USDC and USDT payment flows instead of legacy invoicing rails.",
  },
  {
    title: "Multi-chain",
    text: "Supports Base and BNB Chain so users can operate where liquidity and convenience already exist.",
  },
  {
    title: "Self-custodial",
    text: "Users transact directly from their wallets without surrendering custody to a centralized platform.",
  },
  {
    title: "Transparent state",
    text: "Key payment lifecycle events are verifiable on-chain, improving trust and auditability.",
  },
] as const;

const USE_CASES = [
  "Freelance design and development contracts",
  "Remote service retainers and milestone payments",
  "Crypto-native invoice collection",
  "Simple payment requests via shareable links",
] as const;

const FAQS = [
  {
    q: "What can I use AfriLance for?",
    a: "AfriLance supports protected freelance escrow payments and simple shareable paylinks for stablecoin transfers.",
  },
  {
    q: "Which networks are supported?",
    a: "AfriLance currently supports Base and BNB Chain test environments in this version of the platform.",
  },
  {
    q: "Do payments happen on-chain?",
    a: "Yes. Core payment actions and state transitions are handled through smart contracts and can be verified on-chain.",
  },
  {
    q: "Who should use Escrow vs PayLinks?",
    a: "Use Escrow for client-freelancer work with approval and protection. Use PayLinks for lightweight payment requests and direct collections.",
  },
] as const;

function App() {
  const [, setInit] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---- Public clients (no wallet needed) ----
  const baseClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
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
    paylinksVolumeBase: string;
    paylinksVolumeBnb: string;
    escrowsBase: string;
    escrowsBnb: string;
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
    97: { usdc: 18, usdt: 18 },
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
    const run = async () => {
      await fetchPaylinksVolume();
      await fetchEscrowCounts();
    };

    void run();
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative bg-[#050816] text-white overflow-hidden">
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

      <header className="fixed top-0 left-0 right-0 z-40 py-5 sm:py-6">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <a href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="AfriLance Logo"
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
            </a>

            <div className="globalNav">
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
        </div>
      </header>

      <main className="flex-grow pt-28 sm:pt-32">
        {/* Hero */}
        <section className="relative min-h-[70vh] sm:min-h-[85vh] px-6 text-center overflow-hidden flex items-center justify-center">
          <Particles
            id="hero-particles"
            options={{
              fullScreen: { enable: false },
              background: {
                color: { value: "transparent" },
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
            className="absolute inset-0 z-0"
          />

          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-[#00ffea] to-[#0066ff] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,234,0.35)]">
              AfriLance
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mb-10 sm:mb-20 leading-relaxed">
              Get paid in stablecoins with shareable Paylinks and protected
              Escrow. Built for freelancers and crypto-native clients on Base
              and BNB Chain.
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
                  <div className="text-2xl font-bold mt-1 whitespace-nowrap">
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
                  <div className="text-2xl font-bold mt-1 whitespace-nowrap">
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
                  <div className="text-2xl font-bold mt-1 whitespace-nowrap">
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
                  <div className="text-2xl font-bold mt-1 whitespace-nowrap">
                    {metrics.escrowsBnb}
                  </div>
                </a>
              </div>

              <div className="text-xs text-gray-500 mt-3">
                Live on Base & BNB Chain — All payments verifiable on-chain.
              </div>
            </div>
          </div>
        </section>

        <div className="h-32 bg-gradient-to-b from-transparent via-[#050816]/80 to-[#050816]" />

        {/* Supported Chains */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 pb-8 sm:pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="supportedStrip rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-5 sm:px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80 mb-2">
                    Supported Chains
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 sm:justify-end">
                  <div className="chainBadge">
                    <img src={baseLogo} alt="Base" className="chainLogo" />
                    <div>
                      <div className="chainBadge__title">Base</div>
                      <div className="chainBadge__subtitle">Base Sepolia</div>
                    </div>
                  </div>

                  <div className="chainBadge">
                    <img src={bnbLogo} alt="BNB Chain" className="chainLogo" />
                    <div>
                      <div className="chainBadge__title">BNB Chain</div>
                      <div className="chainBadge__subtitle">BNB Testnet</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Infrastructure Band */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="trustBand">
              <div className="trustBand__intro">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80 mb-2">
                  Infrastructure
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Built for transparent internet payments
                </h2>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
                  AfriLance combines smart contract payment flows, stablecoin
                  settlement, and chain-native transparency to support freelance
                  work and direct payment collection.
                </p>
              </div>

              <div className="trustBand__grid">
                <div className="trustPill">
                  <div className="trustPill__kicker">Settlement</div>
                  <div className="trustPill__title">Stablecoin-native</div>
                  <div className="trustPill__text">
                    USDC and USDT payment flows designed for internet-native
                    work.
                  </div>
                </div>

                <div className="trustPill">
                  <div className="trustPill__kicker">Architecture</div>
                  <div className="trustPill__title">Smart contract powered</div>
                  <div className="trustPill__text">
                    Payment states and key actions are executed through
                    verifiable on-chain contracts.
                  </div>
                </div>

                <div className="trustPill">
                  <div className="trustPill__kicker">Visibility</div>
                  <div className="trustPill__title">Transparent by default</div>
                  <div className="trustPill__text">
                    Contracts and metrics are visible on explorers across
                    supported networks.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Split */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                Products
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Two ways to move stablecoins on-chain
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
                AfriLance gives you protected escrow for freelance work and
                lightweight paylinks for direct collections — both built for
                crypto-native payments across supported EVM networks.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {PRODUCT_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.18)]"
                >
                  <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/80 mb-3">
                    {card.subtitle}
                  </p>

                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                    {card.title}
                  </h3>

                  <p className="text-gray-300 leading-relaxed mb-6">
                    {card.description}
                  </p>

                  <div className="space-y-3 mb-7">
                    {card.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={card.href}
                    rel="noopener noreferrer"
                    className={
                      card.primary
                        ? "inline-flex items-center justify-center px-4 py-2 text-sm sm:text-base font-semibold rounded-xl bg-gradient-to-r from-[#00ffea] via-[#00cfff] to-[#0066ff] text-[#050816] shadow-md hover:shadow-[0_0_18px_rgba(0,255,234,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
                        : "inline-flex items-center justify-center px-4 py-2 text-sm sm:text-base font-semibold rounded-xl border border-white/30 text-white hover:border-[#00ffea] hover:text-[#00ffea] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
                    }
                  >
                    {card.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                How it works
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Built for simple, transparent payment flows
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Whether you need client protection or a fast payment request,
                AfriLance keeps the flow understandable, on-chain, and easy to
                share.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
                >
                  <div className="text-cyan-300 text-sm font-semibold tracking-[0.25em] mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why AfriLance */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                Why AfriLance
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Payment infrastructure for the on-chain economy
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
                AfriLance is designed for digital work and internet-native
                commerce where trust, settlement speed, and transparency matter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WHY_AFRILANCE.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-6"
                >
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                  Use cases
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Designed for real payment scenarios
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  From freelance work to invoice collection, AfriLance makes it
                  easier to move stablecoins through clear, purpose-built flows.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {USE_CASES.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Common questions
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Everything you need to understand the current AfriLance flow at
                a glance.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-6"
                >
                  <h3 className="text-lg font-semibold mb-2">{item.q}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative z-10 px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
          <div className="max-w-5xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 sm:p-10 lg:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
              Get started
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose the payment flow that fits your work
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Use escrow for protected freelance transactions or launch a
              paylink for direct stablecoin collections.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:justify-center">
              <a
                href="https://escrow.afrilance.xyz/"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-[#00ffea] via-[#00cfff] to-[#0066ff] text-[#050816] shadow-md hover:shadow-[0_0_20px_rgba(0,255,234,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
              >
                Use Escrow
              </a>

              <a
                href="https://pay.afrilance.xyz/"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold rounded-xl border border-white/30 text-white hover:border-[#00ffea] hover:text-[#00ffea] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02]"
              >
                Create PayLink
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-20 mt-8 pt-8 pb-10 px-6 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/logo.png"
                  alt="AfriLance Logo"
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="font-semibold text-lg">AfriLance</div>
                  <div className="text-sm text-gray-400">
                    On-chain payment infrastructure
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed max-w-sm">
                Secure stablecoin payment flows for freelance escrow and
                shareable paylinks across Base and BNB Chain.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">
                Products
              </h3>
              <div className="space-y-3">
                <a
                  href="https://escrow.afrilance.xyz/"
                  rel="noopener noreferrer"
                  className="block text-gray-200 hover:text-[#00ffea] transition"
                >
                  Freelance Escrow
                </a>
                <a
                  href="https://pay.afrilance.xyz/"
                  rel="noopener noreferrer"
                  className="block text-gray-200 hover:text-[#00ffea] transition"
                >
                  PayLinks
                </a>
                <a
                  href="https://wooded-budget-e6b.notion.site/AfriLance-Documentation-Hub-v2-301cdfc6438080048655cf726ec29eac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-200 hover:text-[#00ffea] transition"
                >
                  Read Docs <FaExternalLinkAlt size={12} />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">
                Connect with us
              </h3>

              <div className="flex gap-6 flex-wrap">
                <a
                  href="https://t.me/AfriLance_bot"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  <FaTelegramPlane size={28} />
                  <p className="text-xs mt-1 text-gray-400">Bot</p>
                </a>

                <a
                  href="https://t.me/AfriLanceCommunity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  <FaTelegramPlane size={28} />
                  <p className="text-xs mt-1 text-gray-400">Group</p>
                </a>

                <a
                  href="https://x.com/AfriLanceHQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300 transition"
                >
                  <FaTwitter size={28} />
                  <p className="text-xs mt-1 text-gray-400">X</p>
                </a>

                <a
                  href="https://www.youtube.com/@AfrilanceTube"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition"
                >
                  <FaYoutube size={28} />
                  <p className="text-xs mt-1 text-gray-400">YouTube</p>
                </a>

                <a
                  href="https://github.com/shihtzu299"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition"
                >
                  <FaGithub size={28} />
                  <p className="text-xs mt-1 text-gray-400">GitHub</p>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
            <p>support@afrilance.xyz</p>
            <p>© 2026 AfriLance — Work. Paid. Anywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
