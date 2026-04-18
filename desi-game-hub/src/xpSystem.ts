// ── XP & Rank System ──────────────────────────────────────────────────────────
// Persists total XP in localStorage under the key "dgh_xp".
// Dispatches "xp-updated" and "level-up" custom events on window so any
// component can react without direct coupling.

const XP_KEY = "dgh_xp";

export interface Rank {
  name: string;
  icon: string;
  minXP: number;
}

export const RANKS: Rank[] = [
  { name: "Noob",       icon: "🌱",   minXP: 0 },
  { name: "Starter",    icon: "🎮",   minXP: 100 },
  { name: "Rookie",     icon: "⚡",   minXP: 300 },
  { name: "Fighter",    icon: "🥊",   minXP: 700 },
  { name: "Pro Player", icon: "😎",   minXP: 1500 },
  { name: "Elite",      icon: "🔥",   minXP: 3000 },
  { name: "Master",     icon: "🧠",   minXP: 6000 },
  { name: "Champion",   icon: "🏆",   minXP: 10000 },
  { name: "Mythic",     icon: "💎",   minXP: 20000 },
  { name: "Legend",     icon: "👑🔥", minXP: 50000 },
];

/** Read current XP from localStorage (never negative). */
export function getXP(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(XP_KEY) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

/** Return the Rank object that corresponds to the given XP total. */
export function getRank(xp: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXP) current = r;
    else break;
  }
  return current;
}

/** Return the next Rank after the current one, or null if at max rank. */
export function getNextRank(xp: number): Rank | null {
  const current = getRank(xp);
  const idx = RANKS.findIndex(r => r.minXP === current.minXP);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

/**
 * Return progress (0–1) toward the next rank.
 * Returns 1 if already at max rank.
 */
export function getRankProgress(xp: number): number {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return 1;
  return Math.min(1, (xp - current.minXP) / (next.minXP - current.minXP));
}

/**
 * Add XP, persist it, and fire custom events:
 *   "xp-updated"  → { xp: number, gained: number }
 *   "level-up"    → { rank: Rank }  (only when rank tier increases)
 */
export function addXP(amount: number): void {
  if (amount <= 0) return;

  const prev = getXP();
  const prevRank = getRank(prev);
  const next = prev + amount;

  try {
    localStorage.setItem(XP_KEY, String(next));
  } catch {
    // Silently ignore storage errors (private-browsing, quota, etc.)
  }

  window.dispatchEvent(
    new CustomEvent("xp-updated", { detail: { xp: next, gained: amount } }),
  );

  const newRank = getRank(next);
  if (newRank.minXP !== prevRank.minXP) {
    window.dispatchEvent(
      new CustomEvent("level-up", { detail: { rank: newRank } }),
    );
  }
}
