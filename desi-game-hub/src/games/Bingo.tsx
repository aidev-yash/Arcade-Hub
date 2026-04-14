import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLang } from "@/lang";
import { T } from "@/translations";
import { audioManager } from "@/audioManager";

function generateBoard(): number[] {
  const nums = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

const ALL_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map(c => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map(r => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
})();

function checkCompletedLines(board: number[], marked: Set<number>): number[] {
  return ALL_LINES.reduce<number[]>((acc, line, li) => {
    if (line.every(idx => marked.has(board[idx]))) acc.push(li);
    return acc;
  }, []);
}

function getAIMove(
  aiBoard: number[],
  available: number[],
  aiMarked: Set<number>,
  difficulty: "easy" | "medium"
): number {
  if (difficulty === "easy" || available.length === 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  let bestLine: number[] = [];
  let bestCount = -1;
  for (const line of ALL_LINES) {
    const lineNums = line.map(idx => aiBoard[idx]);
    const markedCount = lineNums.filter(n => aiMarked.has(n)).length;
    const hasAvailable = lineNums.some(n => available.includes(n));
    if (hasAvailable && markedCount > bestCount) {
      bestCount = markedCount;
      bestLine = lineNums;
    }
  }
  const candidates = bestLine.filter(n => available.includes(n));
  if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  return available[Math.floor(Math.random() * available.length)];
}

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];
type Phase = "setup" | "playing" | "ended";

export default function Bingo({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = T[lang];

  const [difficulty, setDifficulty] = useState<"easy" | "medium">("medium");
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerBoard, setPlayerBoard] = useState<number[]>([]);
  const [aiBoard, setAiBoard] = useState<number[]>([]);
  const [calledNums, setCalledNums] = useState<number[]>([]);
  const [playerMarked, setPlayerMarked] = useState(new Set<number>());
  const [aiMarked, setAiMarked] = useState(new Set<number>());
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);
  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [showAiBoard, setShowAiBoard] = useState(false);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); }, []);

  const playerLines = useMemo(
    () => phase !== "setup" ? checkCompletedLines(playerBoard, playerMarked) : [],
    [phase, playerBoard, playerMarked]
  );
  const aiLines = useMemo(
    () => phase !== "setup" ? checkCompletedLines(aiBoard, aiMarked) : [],
    [phase, aiBoard, aiMarked]
  );

  const playerScore = Math.min(playerLines.length, 5);
  const aiScore = Math.min(aiLines.length, 5);

  const playerWinCells = useMemo(() => {
    const s = new Set<number>();
    playerLines.forEach(li => ALL_LINES[li].forEach(idx => s.add(idx)));
    return s;
  }, [playerLines]);

  const aiWinCells = useMemo(() => {
    const s = new Set<number>();
    aiLines.forEach(li => ALL_LINES[li].forEach(idx => s.add(idx)));
    return s;
  }, [aiLines]);

  const resolveWinner = (pLines: number[], aLines: number[]): "player" | "ai" | null => {
    if (pLines.length >= 5) return "player";
    if (aLines.length >= 5) return "ai";
    return null;
  };

  const startGame = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const pb = generateBoard();
    const ab = generateBoard();
    setPlayerBoard(pb);
    setAiBoard(ab);
    setCalledNums([]);
    setPlayerMarked(new Set());
    setAiMarked(new Set());
    setIsPlayerTurn(true);
    setAiThinking(false);
    setWinner(null);
    setLastCalled(null);
    setShowAiBoard(false);
    setPhase("playing");
  };

  const handlePlayerPick = useCallback((num: number) => {
    if (!isPlayerTurn || aiThinking || phase !== "playing") return;
    if (calledNums.includes(num)) return;

    audioManager.playSFX("mark");

    const newCalledNums = [...calledNums, num];
    const newPlayerMarked = new Set([...playerMarked, num]);
    const newAiMarked = new Set([...aiMarked, num]);

    setCalledNums(newCalledNums);
    setPlayerMarked(newPlayerMarked);
    setAiMarked(newAiMarked);
    setLastCalled(num);

    const prevPLines = checkCompletedLines(playerBoard, playerMarked).length;
    const pLines = checkCompletedLines(playerBoard, newPlayerMarked);
    const aLines = checkCompletedLines(aiBoard, newAiMarked);
    if (pLines.length > prevPLines) audioManager.playSFX("bingo");
    const w = resolveWinner(pLines, aLines);
    if (w) {
      setWinner(w);
      setPhase("ended");
      setShowAiBoard(true);
      audioManager.playSFX(w === "player" ? "win" : "lose");
      return;
    }

    setIsPlayerTurn(false);
    setAiThinking(true);

    const snapCalledNums = newCalledNums;
    const snapPlayerBoard = playerBoard;
    const snapAiBoard = aiBoard;
    const snapPlayerMarked = newPlayerMarked;
    const snapAiMarked = newAiMarked;
    const snapDifficulty = difficulty;

    aiTimerRef.current = setTimeout(() => {
      const avail = Array.from({ length: 25 }, (_, i) => i + 1)
        .filter(n => !snapCalledNums.includes(n));

      if (avail.length === 0) {
        setAiThinking(false);
        setIsPlayerTurn(true);
        return;
      }

      const aiPick = getAIMove(snapAiBoard, avail, snapAiMarked, snapDifficulty);
      const finalCalledNums = [...snapCalledNums, aiPick];
      const finalPlayerMarked = new Set([...snapPlayerMarked, aiPick]);
      const finalAiMarked = new Set([...snapAiMarked, aiPick]);

      setCalledNums(finalCalledNums);
      setPlayerMarked(finalPlayerMarked);
      setAiMarked(finalAiMarked);
      setLastCalled(aiPick);
      setAiThinking(false);

      const pLines2 = checkCompletedLines(snapPlayerBoard, finalPlayerMarked);
      const aLines2 = checkCompletedLines(snapAiBoard, finalAiMarked);
      const w2 = resolveWinner(pLines2, aLines2);
      if (w2) {
        setWinner(w2);
        setPhase("ended");
        setShowAiBoard(true);
        audioManager.playSFX(w2 === "player" ? "win" : "lose");
      } else {
        setIsPlayerTurn(true);
      }
    }, 500 + Math.random() * 600);
  }, [isPlayerTurn, aiThinking, phase, calledNums, playerBoard, aiBoard, playerMarked, aiMarked, difficulty]);

  const renderBoard = (
    board: number[],
    marked: Set<number>,
    winCells: Set<number>,
    isPlayer: boolean,
    hidden: boolean,
    onCellClick?: (num: number) => void
  ) => {
    const canClick = !!onCellClick && isPlayerTurn && !aiThinking && phase === "playing";
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
        {board.map((num, idx) => {
          const isMarked = marked.has(num);
          const isWin = winCells.has(idx);
          const isLast = num === lastCalled;
          const isTappable = canClick && !isMarked;
          return (
            <button
              key={idx}
              disabled={!isTappable}
              onClick={() => isTappable && onCellClick?.(num)}
              className={[
                "flex items-center justify-center rounded font-bold transition-all duration-150 chalk-font",
                isWin ? "scale-105" : "",
                isTappable ? "hover:scale-105 active:scale-95" : "",
              ].join(" ")}
              style={{
                aspectRatio: "1",
                fontSize: "clamp(0.75rem, 2.5vw, 1.1rem)",
                background: isWin
                  ? isPlayer ? "rgba(100,255,160,0.18)" : "rgba(255,100,100,0.18)"
                  : isMarked ? "rgba(255,240,150,0.12)" : isTappable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${
                  isWin
                    ? isPlayer ? "rgba(100,255,160,0.7)" : "rgba(255,100,100,0.7)"
                    : isLast ? "rgba(255,240,150,0.9)"
                    : isMarked ? "rgba(255,240,150,0.4)"
                    : isTappable ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"
                }`,
                color: isWin
                  ? isPlayer ? "rgba(100,255,160,0.95)" : "rgba(255,120,120,0.95)"
                  : isMarked ? "rgba(255,240,150,0.9)"
                  : hidden ? "rgba(255,255,255,0.2)"
                  : isTappable ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
                boxShadow: isWin
                  ? isPlayer ? "0 0 8px rgba(100,255,160,0.25)" : "0 0 8px rgba(255,100,100,0.25)"
                  : isLast ? "0 0 10px rgba(255,240,150,0.3)" : undefined,
                textDecoration: isMarked && !isWin ? "line-through" : undefined,
                opacity: hidden && !isMarked ? 0.15 : 1,
                cursor: isTappable ? "pointer" : "default",
              }}
            >
              {hidden && !isMarked ? "?" : num}
            </button>
          );
        })}
      </div>
    );
  };

  const renderBingo = (score: number, isPlayer: boolean) => (
    <div className="flex gap-1 justify-center">
      {BINGO_LETTERS.map((letter, i) => (
        <div
          key={letter}
          className="chalk-font text-xl font-bold flex items-center justify-center rounded"
          style={{
            width: 32, height: 32,
            background: i < score
              ? isPlayer ? "rgba(100,255,160,0.15)" : "rgba(255,100,100,0.15)"
              : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${
              i < score
                ? isPlayer ? "rgba(100,255,160,0.7)" : "rgba(255,100,100,0.6)"
                : "rgba(255,255,255,0.1)"
            }`,
            color: i < score
              ? isPlayer ? "rgba(100,255,160,0.95)" : "rgba(255,120,120,0.95)"
              : "rgba(255,255,255,0.2)",
            boxShadow: i < score
              ? isPlayer ? "0 0 8px rgba(100,255,160,0.2)" : "0 0 8px rgba(255,100,100,0.2)"
              : undefined,
            transition: "all 0.3s",
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );

  return (
    <div className="screen-fade-in flex flex-col items-center gap-4 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">Bingo</h2>
        <div style={{ width: 72 }} />
      </div>

      {phase === "setup" && (
        <div className="screen-fade-in flex flex-col items-center gap-6 w-full">
          <p className="chalk-hand text-gray-400 text-center">
            {t.bingoSetupDesc}<br />{t.firstTo5}
          </p>
          <div className="chalk-border rounded-lg p-5 w-full max-w-sm text-center flex flex-col gap-4">
            <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest">{t.aiDifficulty}</p>
            <div className="flex gap-3 justify-center">
              {(["easy", "medium"] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`chalk-btn capitalize ${difficulty === d ? d === "easy" ? "chalk-btn-green" : "chalk-btn-blue" : "opacity-40 hover:opacity-70"}`}
                  style={{ fontSize: '1.1rem', padding: '0.4rem 1.4rem' }}>
                  {d === "easy" ? t.easy : t.medium}
                </button>
              ))}
            </div>
            <p className="chalk-hand text-gray-600 text-xs">
              {difficulty === "easy" ? t.aiPicksRandom : t.aiTriesLines}
            </p>
          </div>
          <button onClick={startGame} className="chalk-btn chalk-btn-green text-2xl px-10 py-4">
            {t.startGame}
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "ended") && (
        <>
          {phase === "ended" && winner && (
            <div className="screen-fade-in chalk-border rounded-xl px-6 py-3 text-center w-full"
              style={{ borderColor: winner === "player" ? "rgba(100,255,160,0.6)" : "rgba(255,100,100,0.5)" }}>
              <div className={`chalk-font text-3xl ${winner === "player" ? "text-green-300 chalk-glow-green" : "text-red-400"}`}
                style={winner === "ai" ? { textShadow: '0 0 12px rgba(255,100,100,0.5)' } : {}}>
                {winner === "player" ? t.bingoWin : t.bingoLose}
              </div>
            </div>
          )}

          {phase === "playing" && (
            <div className="chalk-hand text-center text-gray-300 text-sm min-h-6">
              {aiThinking
                ? <span className="animate-pulse text-blue-300">🤖 {t.aiThinking}</span>
                : isPlayerTurn
                  ? <span>{t.yourTurnBingo} <span className="text-yellow-300">{t.tapBoardHint}</span></span>
                  : null}
              {lastCalled != null && (
                <span className="ml-3 chalk-font text-lg text-yellow-300 chalk-glow">
                  {t.lastCalled} {lastCalled}
                </span>
              )}
            </div>
          )}

          <div className={`w-full flex gap-4 ${phase === "ended" ? "flex-col sm:flex-row" : "flex-col"}`}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="chalk-hand text-gray-400 text-xs uppercase tracking-widest">
                  {t.yourBoard} {phase === "playing" && isPlayerTurn && !aiThinking && <span className="text-yellow-500 normal-case">{t.tapToCallHint}</span>}
                </span>
                {renderBingo(playerScore, true)}
              </div>
              <div className="chalk-border-green chalk-border rounded-lg p-3">
                {renderBoard(playerBoard, playerMarked, playerWinCells, true, false, handlePlayerPick)}
              </div>
            </div>

            {phase === "ended" && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="chalk-hand text-gray-400 text-xs uppercase tracking-widest">{t.aiBoard}</span>
                  {renderBingo(aiScore, false)}
                </div>
                <div className="chalk-border rounded-lg p-3" style={{ borderColor: "rgba(255,100,100,0.4)" }}>
                  {renderBoard(aiBoard, aiMarked, aiWinCells, false, false)}
                </div>
              </div>
            )}
          </div>

          {phase === "playing" && (
            <div className="w-full flex flex-col sm:flex-row gap-3 items-start">
              <div className="flex-1">
                <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest mb-1">{t.yourProgress}</p>
                {renderBingo(playerScore, true)}
                <p className="chalk-hand text-gray-600 text-xs mt-1">
                  {playerScore}/5 lines • {5 - playerScore > 0 ? `${5 - playerScore} ${t.moreToWin}` : "BINGO!"}
                </p>
              </div>
              <div className="flex-1 text-right">
                <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest mb-1">{t.aiProgress}</p>
                <div className="flex justify-end">{renderBingo(aiScore, false)}</div>
                <p className="chalk-hand text-gray-600 text-xs mt-1">{aiScore}/5 lines</p>
              </div>
            </div>
          )}

          {calledNums.length > 0 && (
            <div className="w-full">
              <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest mb-2">
                {t.calledLabel} ({calledNums.length}/25)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...calledNums].reverse().map((n, i) => (
                  <span key={n} className="called-number"
                    style={{
                      background: i === 0 ? "rgba(255,240,150,0.2)" : "rgba(100,220,255,0.08)",
                      borderColor: i === 0 ? "rgba(255,240,150,0.8)" : "rgba(100,220,255,0.25)",
                      color: i === 0 ? "rgba(255,240,150,1)" : "rgba(100,220,255,0.7)",
                      boxShadow: i === 0 ? "0 0 10px rgba(255,240,150,0.25)" : undefined,
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {phase === "ended" && (
            <div className="flex gap-4 justify-center mt-2">
              <button onClick={startGame} className="chalk-btn chalk-btn-green text-xl px-6 py-3">
                {t.playAgain}
              </button>
              <button onClick={() => setPhase("setup")} className="chalk-btn text-xl px-6 py-3">
                {t.changeDiff}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
