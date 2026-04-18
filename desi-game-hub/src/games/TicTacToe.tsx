import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLang } from "@/lang";
import { T } from "@/translations";
import { audioManager } from "@/audioManager";
import { addXP } from "@/xpSystem";

type Player = "X" | "O";
type Board = (Player | null)[];
type Mode = "2player" | "ai";
type Difficulty = "easy" | "medium" | "hard";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

function getAvailableMoves(board: Board): number[] {
  return board.reduce<number[]>((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);
}

function checkWinner(board: Board): { winner: Player; line: number[] } | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line: [a, b, c] };
    }
  }
  return null;
}

function getBoardScore(board: Board): number | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === "O" ? 10 : -10;
    }
  }
  if (board.every(Boolean)) return 0;
  return null;
}

function minimax(board: Board, isMaximizing: boolean, alpha: number, beta: number): number {
  const score = getBoardScore(board);
  if (score !== null) return score;

  const moves = getAvailableMoves(board);
  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      board[move] = "O";
      best = Math.max(best, minimax(board, false, alpha, beta));
      board[move] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      board[move] = "X";
      best = Math.min(best, minimax(board, true, alpha, beta));
      board[move] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  const moves = getAvailableMoves(board);
  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const move of moves) {
    board[move] = "O";
    const score = minimax(board, false, -Infinity, Infinity);
    board[move] = null;
    if (score > bestScore) { bestScore = score; bestMoves = [move]; }
    else if (score === bestScore) bestMoves.push(move);
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function getWinOrBlockMove(board: Board, player: Player): number | null {
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]];
    const idxs = [a, b, c];
    if (line.filter(v => v === player).length === 2 && line.includes(null)) {
      return idxs[line.indexOf(null)];
    }
  }
  return null;
}

function getAIMove(board: Board, difficulty: Difficulty): number {
  const moves = getAvailableMoves(board);
  if (moves.length === 0) return -1;
  if (difficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];
  if (difficulty === "medium") {
    return getWinOrBlockMove(board, "O") ?? getWinOrBlockMove(board, "X") ?? moves[Math.floor(Math.random() * moves.length)];
  }
  return getBestMove(board);
}

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = T[lang];

  const [mode, setMode] = useState<Mode>("2player");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = useMemo(() => checkWinner(board), [board]);
  const winLine = result?.line ?? [];
  const isDraw = !result && board.every(Boolean);

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearTimer(), []);

  const runAI = useCallback((b: Board, diff: Difficulty) => {
    setAiThinking(true);
    timerRef.current = setTimeout(() => {
      setAiThinking(false);
      const move = getAIMove([...b], diff);
      if (move === -1) return;
      setBoard(prev => {
        const next = [...prev];
        next[move] = "O";
        const w = checkWinner(next);
        if (w) {
          setScores(s => ({ ...s, O: s.O + 1 }));
          setGameOver(true);
        } else if (next.every(Boolean)) {
          setGameOver(true);
        } else {
          setCurrent("X");
        }
        return next;
      });
    }, 300 + Math.random() * 400);
  }, []);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || result || gameOver || aiThinking) return;
    if (mode === "ai" && current === "O") return;

    audioManager.playSFX("click");

    const next = [...board];
    next[idx] = current;
    setBoard(next);

    const w = checkWinner(next);
    if (w) {
      setScores(s => ({ ...s, [w.winner]: s[w.winner] + 1 }));
      setGameOver(true);
      if (mode === "ai") {
        audioManager.playSFX(w.winner === "X" ? "win" : "lose");
        // ── XP reward: player wins vs AI ──
        if (w.winner === "X") addXP(10);
      } else {
        audioManager.playSFX("win");
      }
    } else if (next.every(Boolean)) {
      setGameOver(true);
      audioManager.playSFX("turn");
    } else {
      const nextPlayer: Player = current === "X" ? "O" : "X";
      setCurrent(nextPlayer);
      if (mode === "ai" && nextPlayer === "O") runAI(next, difficulty);
    }
  }, [board, current, result, gameOver, aiThinking, mode, difficulty, runAI]);

  const reset = useCallback(() => {
    clearTimer();
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setGameOver(false);
    setAiThinking(false);
  }, []);

  const fullReset = useCallback(() => {
    reset();
    setScores({ X: 0, O: 0 });
  }, [reset]);

  const statusText = useMemo(() => {
    if (aiThinking) return <span className="text-gray-400 chalk-font text-xl animate-pulse">{t.aiThinking}</span>;
    if (gameOver) {
      if (result) {
        if (mode === "ai") {
          return result.winner === "X"
            ? <span className="text-green-300 chalk-font text-2xl chalk-glow-green">{t.youWin}</span>
            : <span className="text-red-400 chalk-font text-2xl" style={{ textShadow: '0 0 10px rgba(255,100,100,0.6)' }}>{t.aiWins}</span>;
        }
        return <span className="text-yellow-300 chalk-font text-2xl chalk-glow">
          {result.winner === "X" ? t.p1Wins : t.p2Wins}
        </span>;
      }
      return <span className="text-gray-400 chalk-font text-2xl">{t.draw}</span>;
    }
    if (isDraw) return <span className="text-gray-400 chalk-font text-2xl">{t.draw}</span>;
    if (mode === "ai") {
      return current === "X"
        ? <span className="chalk-hand text-gray-300">{t.yourTurnTTT} <span className="text-red-400" style={{ fontFamily: 'Caveat, cursive' }}>✕</span></span>
        : <span className="chalk-hand text-gray-400">{t.aiTurnTTT}</span>;
    }
    return <span className="chalk-hand text-gray-300">
      Turn: <span className={current === "X" ? "text-red-400" : "text-blue-300"}
        style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem' }}>
        {current === "X" ? `✕ ${t.player1}` : `○ ${t.player2}`}
      </span>
    </span>;
  }, [aiThinking, gameOver, result, isDraw, mode, current, t]);

  return (
    <div className="screen-fade-in flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">Cut-Cross</h2>
        <div style={{ width: 72 }} />
      </div>

      <div className="flex gap-3 justify-center w-full">
        <button
          onClick={() => { setMode("2player"); fullReset(); }}
          className={`chalk-btn text-sm px-3 py-1 ${mode === "2player" ? "chalk-btn-green" : "opacity-40 hover:opacity-70"}`}
        >
          {t.twoPlayer}
        </button>
        <button
          onClick={() => { setMode("ai"); fullReset(); }}
          className={`chalk-btn text-sm px-3 py-1 ${mode === "ai" ? "chalk-btn-blue" : "opacity-40 hover:opacity-70"}`}
        >
          {t.vsAI}
        </button>
      </div>

      {mode === "ai" && (
        <div className="flex gap-2 justify-center">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); fullReset(); }}
              className={[
                "chalk-btn capitalize",
                difficulty === d
                  ? d === "easy" ? "chalk-btn-green" : d === "medium" ? "" : "chalk-btn-red"
                  : "opacity-35 hover:opacity-60",
              ].join(" ")}
              style={{ fontSize: '1rem', padding: '0.3rem 0.9rem' }}
            >
              {d === "easy" ? t.easy : d === "medium" ? t.medium : t.hard}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-6 w-full justify-center">
        <div className="chalk-border px-5 py-2 text-center rounded">
          <div className="chalk-font text-xl text-red-400" style={{ textShadow: '0 0 8px rgba(255,100,100,0.5)' }}>
            ✕ {mode === "ai" ? t.you : t.player1}
          </div>
          <div className="chalk-font text-4xl text-yellow-200">{scores.X}</div>
        </div>
        <div className="chalk-border chalk-border-blue px-5 py-2 text-center rounded">
          <div className="chalk-font text-xl text-blue-300 chalk-glow-blue">
            ○ {mode === "ai" ? t.ai : t.player2}
          </div>
          <div className="chalk-font text-4xl text-yellow-200">{scores.O}</div>
        </div>
      </div>

      <div className="text-lg text-gray-300 min-h-8 flex items-center">{statusText}</div>

      <div className="grid gap-2 w-full" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 320 }}>
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={(aiThinking && mode === "ai") || !!cell || gameOver}
            className={[
              "ttt-cell",
              cell === "X" ? "x-mark filled" : cell === "O" ? "o-mark filled" : "",
              winLine.includes(i) ? "win-cell" : "",
            ].join(" ")}
          >
            {cell === "X" ? "✕" : cell === "O" ? "○" : ""}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mt-2">
        <button onClick={reset} className="chalk-btn chalk-btn-green">{t.newRound}</button>
        <button onClick={fullReset} className="chalk-btn chalk-btn-red">{t.resetScores}</button>
      </div>

      {mode === "ai" && (
        <p className="chalk-hand text-gray-600 text-xs text-center">
          {t.diffDesc[difficulty]}
        </p>
      )}
    </div>
  );
}
