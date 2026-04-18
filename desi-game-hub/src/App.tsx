import { useState, useEffect } from "react";
import TicTacToe from "@/games/TicTacToe";
import Bingo from "@/games/Bingo";
import TruthDare from "@/games/TruthDare";
import HeartMindDustbin from "@/games/HeartMindDustbin";
import Firebox from "@/games/Firebox";
import RajaMantriChorSipai from "@/games/RajaMantriChorSipai";
import SnakeGame from "@/games/SnakeGame";
import { LangProvider, useLang } from "@/lang";
import { T } from "@/translations";
import AudioControls from "@/AudioControls";
import { audioManager } from "@/audioManager";
import XPWidget from "@/components/XPWidget";

type Screen = "home" | "tictactoe" | "bingo" | "truthdare" | "heartmind" | "firebox" | "rmcs" | "snake";

const GAMES = [
  {
    id: "tictactoe" as const,
    slug: "cut-cross",
    title: "Cut-Cross",
    subtitle: "Tic Tac Toe",
    icon: "✕○",
    accent: "text-red-400",
    border: "rgba(255,100,100,0.4)",
    glow: "0 0 20px rgba(255,100,100,0.1)",
  },
  {
    id: "bingo" as const,
    slug: "bingo",
    title: "Bingo",
    subtitle: "Tambola",
    icon: "🎱",
    accent: "text-blue-300",
    border: "rgba(100,220,255,0.4)",
    glow: "0 0 20px rgba(100,220,255,0.1)",
  },
  {
    id: "truthdare" as const,
    slug: "truth-there",
    title: "Sach ya Jhooth",
    subtitle: "Truth & Dare",
    icon: "🎭",
    accent: "text-purple-300",
    border: "rgba(200,150,255,0.4)",
    glow: "0 0 20px rgba(200,150,255,0.1)",
  },
  {
    id: "heartmind" as const,
    slug: "firebox",
    title: "Firebox",
    subtitle: "Heart · Mind · Dustbin",
    icon: "❤️🧠🗑️",
    accent: "text-pink-300",
    border: "rgba(255,100,150,0.4)",
    glow: "0 0 20px rgba(255,100,150,0.1)",
  },
  {
    id: "firebox" as const,
    slug: "reflex-rush",
    title: "Reflex Rush",
    subtitle: "Reaction Time Test",
    icon: "⚡",
    accent: "text-yellow-300",
    border: "rgba(255,220,50,0.4)",
    glow: "0 0 20px rgba(255,220,50,0.1)",
  },
  {
    id: "rmcs" as const,
    slug: "raja-mantri",
    title: "Raja Mantri",
    subtitle: "Chor Sipai",
    icon: "👑",
    accent: "text-yellow-200",
    border: "rgba(255,220,80,0.45)",
    glow: "0 0 20px rgba(255,200,50,0.12)",
  },
  {
    id: "snake" as const,
    slug: "snake",
    title: "Saanp Wala",
    subtitle: "Snake Game",
    icon: "🐍",
    accent: "text-green-300",
    border: "rgba(74,222,128,0.45)",
    glow: "0 0 20px rgba(74,222,128,0.12)",
  },
];

function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      className="chalk-btn text-sm px-3 py-1"
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 100,
        fontSize: "0.85rem",
        padding: "0.3rem 0.75rem",
        background: "rgba(255,240,150,0.07)",
        borderColor: "rgba(255,240,150,0.35)",
      }}
      title="Toggle language / भाषा बदलें"
    >
      {lang === "EN" ? "हिंदी" : "EN"}
    </button>
  );
}

function HomeScreen({ onSelect }: { onSelect: (s: Screen) => void }) {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <div className="screen-fade-in min-h-screen flex flex-col items-center px-4 py-8 gap-8">
      <div className="text-center">
        <div className="chalk-font text-5xl sm:text-6xl text-yellow-200 chalk-glow mb-1 leading-tight">
          Desi Game Hub
        </div>
        <div className="chalk-hand text-gray-500 text-base tracking-wider">
          {t.tagline}
        </div>
        <div
          className="mt-3 mx-auto"
          style={{
            width: 200,
            height: 2,
            background: "linear-gradient(to right, transparent, rgba(255,240,150,0.4), transparent)",
          }}
        />
      </div>

      <div className="chalk-hand text-gray-600 text-sm text-center italic">
        {t.chooseGame}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        {GAMES.map(game => (
          <a
            key={game.id}
            href={`/games/${game.slug}`}
            className="game-card group text-left"
            style={{ borderColor: "rgba(255,255,255,0.08)", textDecoration: "none" }}
            onClick={e => {
              e.preventDefault();
              audioManager.playSFX("click");
              localStorage.setItem("dgh_last_game", game.id);
              onSelect(game.id);
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = game.border;
              (e.currentTarget as HTMLElement).style.boxShadow = game.glow;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <div className="text-4xl mb-3">{game.icon}</div>
            <div className={`chalk-font text-2xl ${game.accent} mb-0.5`}>{game.title}</div>
            <div className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-2">
              {game.subtitle}
            </div>
            <div className="chalk-hand text-gray-400 text-sm">
              {t.gameDescs[game.id]}
            </div>
            <div className={`mt-4 text-sm chalk-hand ${game.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
              {t.playNow}
            </div>
          </a>
        ))}

        {/* Discord / Community card */}
        <a
          href="https://discord.gg/fQfa24ewKA"
          target="_blank"
          rel="noopener noreferrer"
          className="game-card group text-left no-underline"
          style={{ borderColor: "rgba(255,255,255,0.08)", textDecoration: "none" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(114,137,218,0.6)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 28px rgba(114,137,218,0.25)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.01)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.boxShadow = "";
            (e.currentTarget as HTMLElement).style.transform = "";
          }}
        >
          <div className="text-4xl mb-3" style={{ position: "relative", display: "inline-block" }}>
            💬
            <span style={{
              position: "absolute",
              top: -4,
              right: -6,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#57F287",
              border: "2px solid #1a1a1a",
              animation: "discord-pulse 2s ease-in-out infinite",
            }} />
          </div>
          <div className="chalk-font text-2xl mb-0.5" style={{ color: "#7289DA" }}>
            {t.discord.title}
          </div>
          <div className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-2">
            {t.discord.subtitle}
          </div>
          <div className="chalk-hand text-gray-400 text-sm">
            {t.discord.desc}
          </div>
          <div
            className="mt-4 text-sm chalk-hand opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "#7289DA" }}
          >
            {t.discord.cta}
          </div>
        </a>
      </div>

      <div className="mt-auto pt-4">
        <div
          className="mx-auto mb-3"
          style={{
            width: 160,
            height: 1,
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)",
          }}
        />
        <p className="chalk-hand text-gray-600 text-xs text-center">
          {t.footer}
        </p>
      </div>
    </div>
  );
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>("home");
  const [offline, setOffline] = useState(!navigator.onLine);
  const goHome = () => setScreen("home");

  // ── Offline detection ────────────────────────────────────────────────────
  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline  = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get("game");
    if (gameParam) {
      const matched = GAMES.find(g => g.id === gameParam || g.slug === gameParam);
      if (matched) setScreen(matched.id);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <LangToggle />
      <AudioControls />
      {/* ── XP / Rank widget (non-destructive overlay) ── */}
      <XPWidget />
      {/* ── Offline mode banner ── */}
      {offline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            background: "rgba(30,15,0,0.92)",
            borderBottom: "1px solid rgba(255,160,50,0.5)",
            textAlign: "center",
            padding: "0.3rem 1rem",
            fontFamily: "Patrick Hand, cursive",
            fontSize: "0.78rem",
            color: "rgba(255,200,80,0.95)",
            backdropFilter: "blur(6px)",
          }}
        >
          Offline Mode 🔥 — Playing from cache
        </div>
      )}
      {screen === "home" && <HomeScreen onSelect={setScreen} />}
      {screen === "tictactoe" && <TicTacToe onBack={goHome} />}
      {screen === "bingo" && <Bingo onBack={goHome} />}
      {screen === "truthdare" && <TruthDare onBack={goHome} />}
      {screen === "heartmind" && <HeartMindDustbin onBack={goHome} />}
      {screen === "firebox" && <Firebox onBack={goHome} />}
      {screen === "rmcs" && <RajaMantriChorSipai onBack={goHome} />}
      {screen === "snake" && <SnakeGame onBack={goHome} />}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
