import { useState, useEffect } from "react";
import { getXP, getRank, getNextRank, getRankProgress, type Rank } from "@/xpSystem";

/** Small fixed widget (top-left) showing XP, rank, and progress to the next rank.
 *  A "LEVEL UP" popup is shown for 3 s whenever the player gains a new rank tier.
 *  This component is purely additive — it does not modify any existing UI.
 */
export default function XPWidget() {
  const [xp, setXp] = useState<number>(getXP);
  const [levelUpRank, setLevelUpRank] = useState<Rank | null>(null);
  const [visible, setVisible] = useState(false);
  const [rankBoxOpen, setRankBoxOpen] = useState(false);

  // Listen for XP and level-up events dispatched by xpSystem.ts
  useEffect(() => {
    const onXpUpdated = (e: Event) => {
      const { xp: newXp } = (e as CustomEvent<{ xp: number; gained: number }>).detail;
      setXp(newXp);
      setVisible(true);
    };
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    const onLevelUp = (e: Event) => {
      const { rank } = (e as CustomEvent<{ rank: Rank }>).detail;
      setLevelUpRank(rank);
      if (dismissTimer) clearTimeout(dismissTimer);
      // Auto-dismiss after 3 s
      dismissTimer = setTimeout(() => setLevelUpRank(null), 3000);
    };
    window.addEventListener("xp-updated", onXpUpdated);
    window.addEventListener("level-up", onLevelUp);
    return () => {
      window.removeEventListener("xp-updated", onXpUpdated);
      window.removeEventListener("level-up", onLevelUp);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

  // Show widget once XP has been earned at least once
  useEffect(() => {
    if (xp > 0) setVisible(true);
  }, [xp]);

  const rank = getRank(xp);
  const nextRank = getNextRank(xp);
  const progress = getRankProgress(xp);

  return (
    <>
      {/* ── 🏆 toggle button (bottom-right, all devices) ─────────────────── */}
      <button
        className={`rank-toggle-btn${rankBoxOpen ? " rank-btn-hidden" : ""}`}
        onClick={() => setRankBoxOpen(true)}
        title="Toggle rank"
        aria-label="Toggle rank panel"
      >
        🏆
      </button>

      {/* ── XP / Rank badge (top-left) ─────────────────────────────────────── */}
      <div
        id="rank-box"
        role="button"
        tabIndex={0}
        onClick={() => { setRankBoxOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRankBoxOpen(false); } }}
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 100,
          background: "rgba(10,10,14,0.88)",
          border: "1.5px solid rgba(255,240,150,0.22)",
          borderRadius: 10,
          padding: "0.4rem 0.65rem",
          backdropFilter: "blur(8px)",
          minWidth: 120,
          opacity: visible ? 1 : 0.45,
          transition: "opacity 0.4s ease, transform 0.25s ease",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
        className={rankBoxOpen ? undefined : "rank-box-hidden"}
      >
        {/* Label row */}
        <div
          className="chalk-hand"
          style={{
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          XP · Rank
        </div>

        {/* Rank name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.15rem" }}>
          <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{rank.icon}</span>
          <span
            className="chalk-font"
            style={{ fontSize: "0.9rem", color: "rgba(255,240,150,0.92)", lineHeight: 1 }}
          >
            {rank.name}
          </span>
        </div>

        {/* XP total */}
        <div
          className="chalk-hand"
          style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", marginTop: "0.1rem" }}
        >
          {xp.toLocaleString()} XP
        </div>

        {/* Progress bar toward next rank */}
        {nextRank ? (
          <div style={{ marginTop: "0.35rem" }}>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  background:
                    "linear-gradient(to right, rgba(255,200,50,0.75), rgba(255,240,150,0.9))",
                  borderRadius: 2,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div
              className="chalk-hand"
              style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.22)", marginTop: "0.15rem" }}
            >
              Next: {nextRank.icon} {nextRank.name}
            </div>
          </div>
        ) : (
          <div
            className="chalk-hand"
            style={{ fontSize: "0.6rem", color: "rgba(255,220,50,0.65)", marginTop: "0.2rem" }}
          >
            Max Rank! 🎉
          </div>
        )}
      </div>

      {/* ── Level-Up popup (centered overlay) ────────────────────────────── */}
      {levelUpRank && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            background: "rgba(10,10,14,0.96)",
            border: "2px solid rgba(255,220,50,0.75)",
            borderRadius: 16,
            padding: "1.75rem 2.5rem",
            textAlign: "center",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 48px rgba(255,220,50,0.28)",
            animation: "levelUpAnim 0.35s ease",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>🎉</div>
          <div
            className="chalk-font"
            style={{
              fontSize: "2rem",
              color: "rgba(255,240,150,0.97)",
              marginTop: "0.3rem",
              textShadow: "0 0 18px rgba(255,220,50,0.6)",
            }}
          >
            LEVEL UP!
          </div>
          <div style={{ fontSize: "1.8rem", marginTop: "0.25rem", lineHeight: 1 }}>
            {levelUpRank.icon}
          </div>
          <div
            className="chalk-font"
            style={{ fontSize: "1.3rem", color: "rgba(255,255,255,0.9)", marginTop: "0.15rem" }}
          >
            {levelUpRank.name}
          </div>
        </div>
      )}
    </>
  );
}
