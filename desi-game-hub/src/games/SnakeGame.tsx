import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "@/lang";
import { audioManager } from "@/audioManager";
import { addXP } from "@/xpSystem";

const COLS = 20, ROWS = 20, CELL = 15;
const W = COLS * CELL, H = ROWS * CELL;
const INIT_SPEED = 160, MIN_SPEED = 65;
const SPEED_INC = 5;

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Mode = "classic" | "battle";
type Phase = "menu" | "playing" | "over";
type Pt = { x: number; y: number };
type Result = "win" | "lose" | "draw" | "over";

const DIRS: Record<Dir, Pt> = { UP:{x:0,y:-1}, DOWN:{x:0,y:1}, LEFT:{x:-1,y:0}, RIGHT:{x:1,y:0} };
const OPP: Record<Dir, Dir> = { UP:"DOWN", DOWN:"UP", LEFT:"RIGHT", RIGHT:"LEFT" };

const UI = {
  EN: {
    back:"← Back", title:"Saanp Wala", sub:"Snake Game",
    classic:"🐍 Classic Mode", battle:"⚔️ AI Battle",
    classicDesc:"Eat food, grow longer, don't crash!",
    battleDesc:"Your snake vs the AI snake — outwit the bot!",
    score:"Score", best:"Best", aiLabel:"AI",
    over:"Game Over!", win:"You Win! 🎉", lose:"AI Wins! 🤖", draw:"Draw! 🤝",
    again:"Play Again", menuBtn:"Menu",
    you:"🟢 You", ai:"🔴 AI", newBest:"🏆 New Best!",
    swipeHint:"Swipe or use buttons",
  },
  HI: {
    back:"← वापस", title:"साँप वाला", sub:"Snake Game",
    classic:"🐍 Classic Mode", battle:"⚔️ AI Battle",
    classicDesc:"खाना खाओ, बड़े होते जाओ, दीवार से मत टकराओ!",
    battleDesc:"आपका साँप vs AI साँप — bot को हराओ!",
    score:"स्कोर", best:"Best", aiLabel:"AI",
    over:"खेल समाप्त!", win:"आप जीत गए! 🎉", lose:"AI जीत गया! 🤖", draw:"बराबरी! 🤝",
    again:"फिर खेलो", menuBtn:"Menu",
    you:"🟢 आप", ai:"🔴 AI", newBest:"🏆 नया रिकॉर्ड!",
    swipeHint:"Swipe करो या buttons दबाओ",
  },
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function ptEq(a: Pt, b: Pt) { return a.x === b.x && a.y === b.y; }
function inBody(p: Pt, body: Pt[]) { return body.some(b => ptEq(b, p)); }
function step(h: Pt, d: Dir): Pt { const v = DIRS[d]; return { x: h.x + v.x, y: h.y + v.y }; }
function isWall(p: Pt) { return p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS; }
function rand(n: number) { return Math.floor(Math.random() * n); }

function spawnFood(snake: Pt[], ai?: Pt[]): Pt {
  let p: Pt;
  let tries = 0;
  do {
    p = { x: rand(COLS), y: rand(ROWS) };
    tries++;
  } while ((inBody(p, snake) || (ai && inBody(p, ai))) && tries < 400);
  return p;
}

// AI: greedy toward food + 35% randomness → beatable but competent
function aiMove(aiSnake: Pt[], player: Pt[], food: Pt, cur: Dir): Dir {
  const head = aiSnake[0];
  const aiObs = aiSnake.slice(0, -1);
  const pObs = player.slice(0, -1);
  const dirs: Dir[] = ["UP", "DOWN", "LEFT", "RIGHT"];

  const valid = dirs.filter(d => {
    if (d === OPP[cur]) return false;
    const n = step(head, d);
    return !isWall(n) && !inBody(n, aiObs) && !inBody(n, pObs);
  });

  if (!valid.length) return cur;
  if (Math.random() < 0.35) return valid[rand(valid.length)];

  return valid
    .map(d => { const n = step(head, d); return { d, dist: Math.abs(n.x - food.x) + Math.abs(n.y - food.y) }; })
    .sort((a, b) => a.dist - b.dist)[0].d;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SnakeGame({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = lang === "HI" ? UI.HI : UI.EN;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [hs, setHs] = useState(() => {
    try { return +localStorage.getItem("dgh_snake_hs")! || 0; } catch { return 0; }
  });
  const hsRef = useRef(hs);

  // All mutable game state lives in a ref — zero re-renders during play
  const g = useRef({
    snake: [] as Pt[],
    aiSnake: [] as Pt[],
    dir: "RIGHT" as Dir,
    nextDir: "RIGHT" as Dir,
    aiDir: "LEFT" as Dir,
    food: { x: 10, y: 10 } as Pt,
    score: 0, aiScore: 0,
    speed: INIT_SPEED, foodEaten: 0,
    active: false, mode: "classic" as Mode,
  });
  const rafRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // ── End game ─────────────────────────────────────────────────────────────────
  const endGame = useCallback((res: Result) => {
    g.current.active = false;
    const s = g.current.score;
    const as = g.current.aiScore;
    if (g.current.mode === "classic" && s > hsRef.current) {
      hsRef.current = s;
      setHs(s);
      try { localStorage.setItem("dgh_snake_hs", String(s)); } catch {}
    }
    setScore(s);
    setAiScore(as);
    setResult(res);
    setPhase("over");
    if (res === "win") audioManager.playSFX("win");
    else if (res === "lose" || res === "over") audioManager.playSFX("lose");
    else audioManager.playSFX("turn");
    // ── XP reward: snake battle win ──
    if (res === "win") addXP(3000);
  }, []);

  // ── Game tick ─────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = g.current;
    if (!s.active) return;

    s.dir = s.nextDir;
    const newHead = step(s.snake[0], s.dir);

    if (s.mode === "classic") {
      if (isWall(newHead) || inBody(newHead, s.snake.slice(0, -1))) { endGame("over"); return; }
      s.snake.unshift(newHead);
      if (ptEq(newHead, s.food)) {
        s.score++;
        setScore(s.score);
        s.foodEaten++;
        if (s.foodEaten % SPEED_INC === 0) s.speed = Math.max(MIN_SPEED, s.speed - 12);
        s.food = spawnFood(s.snake);
        audioManager.playSFX("chomp");
      } else {
        s.snake.pop();
      }
      return;
    }

    // ── Battle mode ─────────────────────────────────────────────────────────────
    s.aiDir = aiMove(s.aiSnake, s.snake, s.food, s.aiDir);
    const aiHead = step(s.aiSnake[0], s.aiDir);

    const pEats = ptEq(newHead, s.food);
    const aEats = ptEq(aiHead, s.food);

    s.snake.unshift(newHead);
    if (!pEats) s.snake.pop();
    s.aiSnake.unshift(aiHead);
    if (!aEats) s.aiSnake.pop();

    if (pEats || aEats) {
      if (pEats) { s.score++; setScore(s.score); audioManager.playSFX("chomp"); }
      if (aEats) { s.aiScore++; setAiScore(s.aiScore); }
      s.foodEaten++;
      if (s.foodEaten % SPEED_INC === 0) s.speed = Math.max(MIN_SPEED, s.speed - 12);
      s.food = spawnFood(s.snake, s.aiSnake);
    }

    const h2h = ptEq(newHead, aiHead);
    const pBody = s.snake.slice(1);
    const aBody = s.aiSnake.slice(1);
    const pDead = isWall(newHead) || inBody(newHead, pBody) || (!h2h && inBody(newHead, aBody));
    const aDead = isWall(aiHead) || inBody(aiHead, aBody) || (!h2h && inBody(aiHead, pBody));

    if (h2h || (pDead && aDead)) { endGame("draw"); return; }
    if (pDead) { endGame("lose"); return; }
    if (aDead) { endGame("win"); return; }
  }, [endGame]);

  // ── Render helpers ────────────────────────────────────────────────────────────
  const drawSnake = (
    ctx: CanvasRenderingContext2D,
    segs: { x: number; y: number }[],
    dir: string,
    headClr: string,
    bodyClr: string,
    bodyClr2: string,
    glowClr: string,
  ) => {
    if (!segs.length) return;
    const R = CELL / 2 - 1;

    // 1. connecting bars between adjacent segments
    ctx.shadowBlur = 0;
    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i];
      const b = segs[i + 1];
      const cx1 = a.x * CELL + CELL / 2;
      const cy1 = a.y * CELL + CELL / 2;
      const cx2 = b.x * CELL + CELL / 2;
      const cy2 = b.y * CELL + CELL / 2;
      const t = i / Math.max(segs.length - 1, 1);
      const alpha = 0.95 - t * 0.45;
      ctx.fillStyle = i % 2 === 0
        ? bodyClr.replace(")", `,${alpha})`)
        : bodyClr2.replace(")", `,${alpha})`);
      if (a.x === b.x) {
        const minY = Math.min(cy1, cy2);
        ctx.fillRect(cx1 - R, minY, R * 2, Math.abs(cy2 - cy1));
      } else {
        const minX = Math.min(cx1, cx2);
        ctx.fillRect(minX, cy1 - R, Math.abs(cx2 - cx1), R * 2);
      }
    }

    // 2. body circles (back to front so head draws on top)
    for (let i = segs.length - 1; i >= 0; i--) {
      const pt = segs[i];
      const cx = pt.x * CELL + CELL / 2;
      const cy = pt.y * CELL + CELL / 2;
      const isHead = i === 0;
      const t = i / Math.max(segs.length - 1, 1);
      const alpha = isHead ? 1 : 0.95 - t * 0.45;
      ctx.shadowColor = isHead ? glowClr : "transparent";
      ctx.shadowBlur  = isHead ? 14 : 0;
      ctx.fillStyle   = isHead
        ? headClr
        : (i % 2 === 0
          ? bodyClr.replace(")", `,${alpha})`)
          : bodyClr2.replace(")", `,${alpha})`));
      ctx.beginPath();
      ctx.arc(cx, cy, isHead ? R + 1.5 : R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. eyes on head
    const h  = segs[0];
    const hx = h.x * CELL + CELL / 2;
    const hy = h.y * CELL + CELL / 2;
    const eyeR = 1.8;
    const eyeOff = R * 0.48;
    let e1 = { x: hx, y: hy }, e2 = { x: hx, y: hy };
    if (dir === "RIGHT") { e1 = { x: hx + eyeOff * 0.6, y: hy - eyeOff }; e2 = { x: hx + eyeOff * 0.6, y: hy + eyeOff }; }
    if (dir === "LEFT")  { e1 = { x: hx - eyeOff * 0.6, y: hy - eyeOff }; e2 = { x: hx - eyeOff * 0.6, y: hy + eyeOff }; }
    if (dir === "UP")    { e1 = { x: hx - eyeOff, y: hy - eyeOff * 0.6 }; e2 = { x: hx + eyeOff, y: hy - eyeOff * 0.6 }; }
    if (dir === "DOWN")  { e1 = { x: hx - eyeOff, y: hy + eyeOff * 0.6 }; e2 = { x: hx + eyeOff, y: hy + eyeOff * 0.6 }; }
    ctx.fillStyle = "#fff";
    [e1, e2].forEach(e => { ctx.beginPath(); ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#111";
    [e1, e2].forEach(e => { ctx.beginPath(); ctx.arc(e.x + (dir === "RIGHT" ? 0.7 : dir === "LEFT" ? -0.7 : 0), e.y + (dir === "DOWN" ? 0.7 : dir === "UP" ? -0.7 : 0), eyeR * 0.55, 0, Math.PI * 2); ctx.fill(); });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = g.current;

    // Background
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Food — glowing circle with a tiny stem
    const fp = s.food;
    const fcx = fp.x * CELL + CELL / 2;
    const fcy = fp.y * CELL + CELL / 2;
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(fcx, fcy, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fcx, fcy - (CELL / 2 - 2));
    ctx.quadraticCurveTo(fcx + 4, fcy - CELL / 2 - 3, fcx + 3, fcy - CELL / 2 - 5);
    ctx.stroke();

    // Player snake — green
    drawSnake(ctx, s.snake, s.dir,
      "#4ade80", "rgba(74,222,128", "rgba(52,198,108", "#4ade80");

    // AI snake — red (battle only)
    if (s.mode === "battle") {
      drawSnake(ctx, s.aiSnake, s.aiDir,
        "#f87171", "rgba(248,113,113", "rgba(220,80,80", "#f87171");
    }
  }, []);

  // ── Start game ────────────────────────────────────────────────────────────────
  const startGame = useCallback((m: Mode) => {
    const s = g.current;
    s.mode = m;
    s.snake = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    s.dir = "RIGHT"; s.nextDir = "RIGHT";
    s.aiSnake = [{ x: 15, y: 10 }, { x: 16, y: 10 }, { x: 17, y: 10 }];
    s.aiDir = "LEFT";
    s.food = spawnFood(s.snake, m === "battle" ? s.aiSnake : undefined);
    s.score = 0; s.aiScore = 0;
    s.speed = INIT_SPEED; s.foodEaten = 0;
    s.active = true;
    setScore(0); setAiScore(0); setResult(null);
    setPhase("playing");
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last >= g.current.speed) {
        last = ts;
        tick();
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, tick, draw]);

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
        W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); if (d !== OPP[g.current.dir]) g.current.nextDir = d; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // ── Touch / swipe ─────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : (dy > 0 ? "DOWN" : "UP");
    if (d !== OPP[g.current.dir]) g.current.nextDir = d;
  };

  const pressDir = (d: Dir) => {
    if (phase === "playing" && d !== OPP[g.current.dir]) g.current.nextDir = d;
  };

  // ── MENU ─────────────────────────────────────────────────────────────────────
  if (phase === "menu") return (
    <div className="screen-fade-in flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>
        <div className="text-center">
          <h2 className="chalk-font text-2xl text-yellow-200 chalk-glow">{t.title}</h2>
          <p className="chalk-hand text-xs text-gray-500 uppercase tracking-widest">{t.sub}</p>
        </div>
        <div style={{ width: 72 }} />
      </div>

      <div className="text-6xl select-none">🐍</div>

      <div className="flex flex-col gap-3 w-full">
        <button onClick={() => startGame("classic")}
          className="chalk-btn chalk-btn-green py-5 flex flex-col items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <span className="chalk-font text-xl">{t.classic}</span>
          <span className="chalk-hand text-xs text-green-200 opacity-75">{t.classicDesc}</span>
        </button>
        <button onClick={() => startGame("battle")}
          className="chalk-btn chalk-btn-red py-5 flex flex-col items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <span className="chalk-font text-xl">{t.battle}</span>
          <span className="chalk-hand text-xs text-red-200 opacity-75">{t.battleDesc}</span>
        </button>
      </div>

      {hs > 0 && (
        <div className="chalk-border rounded-lg px-5 py-2 text-center">
          <span className="chalk-hand text-gray-500 text-sm">{t.best}: </span>
          <span className="chalk-font text-xl text-yellow-200">{hs}</span>
        </div>
      )}

      <div className="chalk-border rounded-lg px-4 py-3 w-full text-xs chalk-hand text-gray-600 space-y-1">
        <div>⌨️ Arrow keys / WASD to move</div>
        <div>📱 Swipe on canvas or use D-pad buttons</div>
        <div>🍎 Eat food to grow · 💀 Don't hit walls or yourself</div>
      </div>
    </div>
  );

  // ── GAME OVER ─────────────────────────────────────────────────────────────────
  if (phase === "over") {
    const isBattle = g.current.mode === "battle";
    const isNewBest = !isBattle && score >= hs && score > 0;
    return (
      <div className="screen-fade-in flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto">
        <h2 className="chalk-font text-3xl chalk-glow"
          style={{ color: result === "win" ? "#4ade80" : result === "lose" ? "#f87171" : result === "draw" ? "#fbbf24" : "#e5e7eb" }}>
          {result === "win" ? t.win : result === "lose" ? t.lose : result === "draw" ? t.draw : t.over}
        </h2>

        <div className="chalk-border rounded-2xl px-6 py-5 w-full text-center"
          style={{ borderColor: result === "win" ? "rgba(74,222,128,0.5)" : result === "lose" ? "rgba(248,113,113,0.5)" : "rgba(255,220,50,0.35)" }}>
          {isBattle ? (
            <div className="flex gap-8 justify-center">
              <div>
                <div className="chalk-hand text-xs text-gray-500 mb-1">{t.you}</div>
                <div className="chalk-font text-4xl text-green-300">{score}</div>
                <div className="chalk-hand text-xs text-gray-600 mt-1">{t.score}</div>
              </div>
              <div className="chalk-hand text-2xl self-center text-gray-700">vs</div>
              <div>
                <div className="chalk-hand text-xs text-gray-500 mb-1">{t.ai}</div>
                <div className="chalk-font text-4xl text-red-400">{aiScore}</div>
                <div className="chalk-hand text-xs text-gray-600 mt-1">{t.score}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-1">{t.score}</div>
              <div className="chalk-font text-5xl text-yellow-300">{score}</div>
              {isNewBest && <div className="chalk-hand text-green-400 text-sm mt-2">{t.newBest}</div>}
              <div className="chalk-hand text-xs text-gray-600 mt-2">{t.best}: {hs}</div>
            </>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={() => startGame(g.current.mode)}
            className="chalk-btn chalk-btn-green flex-1 py-3 text-lg">{t.again}</button>
          <button onClick={() => setPhase("menu")}
            className="chalk-btn flex-1 py-3 text-lg">{t.menuBtn}</button>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────────
  const isBattle = g.current.mode === "battle";
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-3 max-w-md mx-auto select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => { g.current.active = false; cancelAnimationFrame(rafRef.current); setPhase("menu"); }}
          className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>

        <div className="flex gap-5 items-center">
          {isBattle ? (
            <>
              <div className="text-center">
                <div className="chalk-hand" style={{ fontSize: "0.6rem", color: "rgba(74,222,128,0.7)" }}>{t.you}</div>
                <div className="chalk-font text-xl text-green-300">{score}</div>
              </div>
              <div className="chalk-hand text-gray-700 text-xs">vs</div>
              <div className="text-center">
                <div className="chalk-hand" style={{ fontSize: "0.6rem", color: "rgba(248,113,113,0.7)" }}>{t.ai}</div>
                <div className="chalk-font text-xl text-red-400">{aiScore}</div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="chalk-hand text-xs text-gray-500">{t.score}</div>
              <div className="chalk-font text-xl text-yellow-200">{score}</div>
            </div>
          )}
        </div>

        {!isBattle ? (
          <div className="text-center" style={{ minWidth: 40 }}>
            <div className="chalk-hand text-xs text-gray-600">{t.best}</div>
            <div className="chalk-font text-sm text-gray-400">{hs}</div>
          </div>
        ) : <div style={{ width: 48 }} />}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          border: "1.5px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          maxWidth: "100%",
          touchAction: "none",
          display: "block",
        }}
      />

      {/* D-Pad */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <button
          onPointerDown={() => pressDir("UP")}
          className="chalk-btn text-lg w-14 py-2 active:scale-90 transition-transform"
          style={{ userSelect: "none" }}>▲</button>
        <div className="flex gap-1">
          <button onPointerDown={() => pressDir("LEFT")}
            className="chalk-btn text-lg w-14 py-2 active:scale-90 transition-transform">◄</button>
          <button onPointerDown={() => pressDir("DOWN")}
            className="chalk-btn text-lg w-14 py-2 active:scale-90 transition-transform">▼</button>
          <button onPointerDown={() => pressDir("RIGHT")}
            className="chalk-btn text-lg w-14 py-2 active:scale-90 transition-transform">►</button>
        </div>
      </div>

      {isBattle && (
        <div className="flex gap-4 chalk-hand text-xs text-gray-600">
          <span><span className="text-green-400">●</span> {t.you}</span>
          <span><span className="text-red-400">●</span> {t.ai}</span>
          <span className="text-gray-700">🍎 food</span>
        </div>
      )}
    </div>
  );
}
