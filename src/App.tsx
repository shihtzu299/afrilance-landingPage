import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { FaTelegramPlane, FaTwitter } from 'react-icons/fa';

function App() {
  const [init, setInit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Loading fade out after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050816] text-white overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050816]">
          {/* Intense loading particles */}
          {init && (
            <Particles
              id="loading-particles"
              options={{
                background: { color: { value: "#050816" } },
                fpsLimit: 120,
                particles: {
                  color: { value: ["#00ffea", "#0066ff"] },
                  links: { color: "#00ffea", distance: 120, enable: true, opacity: 0.6, width: 1.5 },
                  move: { enable: true, speed: 4 },
                  number: { value: 120 },
                  opacity: { value: 0.3 },
                  size: { value: { min: 2, max: 6 } },
                },
              }}
              className="absolute inset-0"
            />
          )}
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#00ffea] to-[#0066ff] bg-clip-text text-transparent animate-pulse">
              Initializing Blockchain...
            </h2>
            <p className="text-gray-400">Connecting to AfriLance network</p>
          </div>
        </div>
      )}

        return (
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
                modes: { repulse: { distance: 100, duration: 0.4 } },
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
                number: { density: { enable: true, width: 1920, height: 1080 }, value: 80 },
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
        );
      

      {/* Header - Logo top left + Nav top right */}
  <header className="absolute top-0 left-0 right-0 z-20 px-6 py-6 flex justify-between items-center">
    <a href="/" className="flex items-center gap-3">
    <img src="/logo.png" alt="AfriLance Logo" className="h-12 w-12" />
  </a>

  <div className="flex gap-10">
    <a href="/pitchdeck.pdf" className="text-lg font-semibold text-gray-300 hover:text-[#00ffea] transition">
      Pitchdeck
    </a>
    <a href="https://afrilance.gitbook.io/afrilance-docs/" className="text-lg font-semibold text-gray-300 hover:text-[#00ffea] transition">
      Whitepaper
    </a>
  </div>
</header>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-[#00ffea] to-[#0066ff] bg-clip-text text-transparent">
          AfriLance
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mb-16 leading-relaxed">
          AI powered decentralized gigs marketplace and freelance payments powered by BNB chain for African talent, using stablecoins (USDT/USDC) as settlement tokens.
        </p>

        <div className="flex flex-col sm:flex-row gap-8">
          <a
            href="https://escrow.afrilance.xyz/"
            className="px-5 py-2.5 text-xl font-bold rounded-2xl bg-gradient-to-r from-[#00ffea] to-[#0066ff] text-[#050816] shadow-2xl hover:shadow-[#00ffea]/50 transition-all duration-300"
          >
            Launch Escrow
          </a>
          <button
            className="px-5 py-2.5 text-xl font-bold rounded-2xl bg-gray-800/60 backdrop-blur border border-gray-700 hover:bg-gray-700/50 transition-all duration-300"
            disabled
          >
            Gigs Marketplace
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Connect with us</p>
        <div className="flex justify-center gap-8">
          <a href="https://t.me/AfriLance_bot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition">
            <FaTelegramPlane size={32} />
            <p className="text-xs mt-1 text-gray-400">Bot</p>
          </a>
          <a href="https://t.me/AfriLanceCommunity" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition">
            <FaTelegramPlane size={32} />
            <p className="text-xs mt-1 text-gray-400">Group</p>
          </a>
          <a href="https://x.com/AfriLanceHQ" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition">
            <FaTwitter size={32} />
            <p className="text-xs mt-1 text-gray-400">X</p>
          </a>
        </div>

        <p className="text-gray-600 text-xs mt-4">
          support@afrilance.xyz
        </p>

        <p className="text-gray-600 text-xs mt-8">
          © 2025 AfriLance - Empowering African Freelancers
        </p>
      </footer>
    </div>
  );
}

export default App;