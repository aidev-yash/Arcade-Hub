import { useState, useRef, useEffect, useCallback } from "react";
import { audioManager } from "@/audioManager";
import { useLang } from "@/lang";
import { T } from "@/translations";

type Phase = "idle" | "waiting" | "active" | "early" | "result";

const LS_KEY = "firebox_highscores";

function getHighScores(): number[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHighScore(ms: number): number[] {
  const scores = getHighScores();
  scores.push(ms);
  scores.sort((a, b) => a - b);
  const best = scores.slice(0, 5);
  try { localStorage.setItem(LS_KEY, JSON.stringify(best)); } catch {}
  return best;
}

function getRating(ms: number): { label: string; color: string } {
  if (ms < 180) return { label: "Lightning Fast! ⚡", color: "text-yellow-300" };
  if (ms < 250) return { label: "Super Quick! 🔥", color: "text-orange-300" };
  if (ms < 350) return { label: "Pretty Good! 👍", color: "text-green-300" };
  if (ms < 500) return { label: "Average 😐", color: "text-blue-300" };
  return { label: "Too Slow 🐢", color: "text-red-400" };
}

export default function Firebox({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = T[lang];

  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [highScores, setHighScores] = useState<number[]>(getHighScores);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startGame = useCallback(() => {
    setPhase("waiting");
    setReactionTime(null);
    clearTimer();
    const delay = 1500 + Math.random() * 3500;
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      audioManager.playSFX("suspense");
      setPhase("active");
    }, delay);
  }, [clearTimer]);

  const handleBoxClick = useCallback(() => {
    if (phase === "idle" || phase === "result" || phase === "early") {
      audioManager.playSFX("click");
      startGame();
      return;
    }
    if (phase === "waiting") {
      clearTimer();
      audioManager.playSFX("lose");
      setPhase("early");
      return;
    }
    if (phase === "active") {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(elapsed);
      const updated = saveHighScore(elapsed);
      setHighScores(updated);
      audioManager.playSFX(elapsed < 350 ? "win" : "turn");
      setPhase("result");
    }
  }, [phase, startGame, clearTimer]);

  const boxText = () => {
    if (phase === "idle") return lang === "HI" ? "शुरू करने के लिए tap करें" : "Tap to Start";
    if (phase === "waiting") return lang === "HI" ? "रुको..." : "Get Ready...";
    if (phase === "active") return lang === "HI" ? "TAP करो!" : "TAP NOW!";
    if (phase === "early") return lang === "HI" ? "जल्दी हो गई!" : "Too Early!";
    if (phase === "result") return reactionTime !== null ? `${reactionTime}ms` : "";
    return "";
  };

  const isNewBest = phase === "result" && reactionTime !== null
    && highScores.length > 0 && highScores[0] === reactionTime;

  return (
    <div className="screen-fade-in flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">
          {t.back}
        </button>
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">{t.fireboxTitle}</h2>
        <div style={{ width: 72 }} />
      </div>

      {highScores.length > 0 && (
        <div className="chalk-border rounded-lg px-4 py-3 w-full text-center">
          <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest mb-2">
            {t.bestReactions}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {highScores.map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className={`called-number ${i === 0 ? "latest" : ""}`}
                  style={{ width: 52, height: 52, fontSize: "0.85rem", borderRadius: 8 }}
                >
                  {s}ms
                </div>
                <div className="chalk-hand text-xs text-gray-600 mt-1">
                  {i === 0 ? t.bestLabel : `#${i + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chalk-hand text-gray-400 text-center text-sm min-h-7">
        {phase === "idle" && t.fireboxIdle}
        {phase === "waiting" && t.fireboxWaiting}
        {phase === "active" && (
          <span className="text-yellow-300 chalk-font text-lg">{t.fireboxActive}</span>
        )}
        {phase === "early" && <span className="text-red-400">{t.fireboxEarly}</span>}
        {phase === "result" && reactionTime != null && (
          <span className={getRating(reactionTime).color + " chalk-font text-xl"}>
            {getRating(reactionTime).label}
          </span>
        )}
      </div>

      <div
        className={`firebox ${
          phase === "idle" ? "idle"
          : phase === "waiting" ? "waiting"
          : phase === "active" ? "active"
          : phase === "early" ? "idle"
          : "result"
        }`}
        onClick={handleBoxClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === " " || e.key === "Enter") && handleBoxClick()}
      >
        <span className="chalk-font text-center px-4 leading-tight">{boxText()}</span>
      </div>

      {phase === "result" && reactionTime !== null && (
        <div className="flex flex-col items-center gap-3">
          {isNewBest && (
            <div className="chalk-font text-yellow-300 text-xl chalk-glow animate-bounce">
              {t.newPersonalBest}
            </div>
          )}
          <button onClick={startGame} className="chalk-btn chalk-btn-green">
            {t.tryAgain}
          </button>
        </div>
      )}

      {phase === "idle" && highScores.length === 0 && (
        <div className="chalk-hand text-gray-600 text-xs text-center">
          {t.scoresAutoSaved}
        </div>
      )}
    </div>
  );
}
