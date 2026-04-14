import { useState, useMemo, useCallback } from "react";
import { useLang } from "@/lang";
import { T } from "@/translations";
import { audioManager } from "@/audioManager";

type Category = "heart" | "mind" | "dustbin";

const RELATIONS_EN = [
  "Mother", "Father", "Grandmother", "Grandfather",
  "Nani", "Nana", "Chacha", "Chachi",
  "Bua", "Fufa", "Mosi", "Mausa",
  "Bhai", "Behen", "Tau", "Tai",
  "Cousin", "Dada", "Dadi", "Mama",
];

const RELATIONS_HI: Record<string, string> = {
  "Mother": "माँ", "Father": "पापा", "Grandmother": "दादी", "Grandfather": "दादा",
  "Nani": "नानी", "Nana": "नाना", "Chacha": "चाचा", "Chachi": "चाची",
  "Bua": "बुआ", "Fufa": "फूफा", "Mosi": "मौसी", "Mausa": "मौसा",
  "Bhai": "भाई", "Behen": "बहन", "Tau": "ताऊ", "Tai": "ताई",
  "Cousin": "कज़िन", "Dada": "दादा जी", "Dadi": "दादी जी", "Mama": "मामा",
};

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRelations(): string[] {
  return fisherYates(RELATIONS_EN).slice(0, 3);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DUSTBIN_REACTIONS: Record<string, string[]> = {
  "Mother": ["Maa ko dustbin mein daal diya 😳 Kya baat hai beta!", "Maa dustbin mein?! Chai band ho gayi aaj se 😂"],
  "Father": ["Papa seedha dustbin 💀 Pocket money bhi gayi!", "Papa ko dustbin — pocket money ka toh bhool ja 😂"],
  "Grandmother": ["Dadi ko dustbin 😱 Mithai band ho gayi ab!", "Dadi dustbin mein — no more stories at night 😭"],
  "Grandfather": ["Dada ji dustbin mein 😂 Bohot himmat hai!"],
  "Nani": ["Nani ko dustbin?! Ghar ka khaana bandh 😂", "Nani dustbin mein — summer vacation cancelled 😅"],
  "Nana": ["Nana ji dustbin mein — arey yaar 😂"],
  "Chacha": ["Chacha ko seedha dustbin 😂 Savage!", "Chacha dustbin mein 🗑️ Uncle's feelings: 💔"],
  "Chachi": ["Chachi dustbin mein — aunty will remember this 😂"],
  "Bua": ["Bua ko dustbin 😂 Bua ki nazar lag gayi!", "Bua dustbin mein — next Diwali awkward ho gayi!"],
  "Fufa": ["Fufa ji dustbin mein 😅 Solid move!"],
  "Mosi": ["Mosi dustbin mein 😂 Mosi will have words for you!"],
  "Mausa": ["Mausa ji dustbin — fair enough 😂"],
  "Bhai": ["Bhai ko dustbin 😂 Bhai ne sab sun liya!", "Bhai dustbin mein — Raksha Bandhan cancelled 😅"],
  "Behen": ["Behen dustbin mein — drama incoming! 😂", "Behen dustbin — she's going to find out 😱"],
  "Tau": ["Tau ji dustbin mein 😂 100% correct decision!"],
  "Tai": ["Tai ji dustbin mein — sahi hai bhai 😂"],
  "Cousin": ["Cousin dustbin mein 😂 Family WhatsApp group mein share hoga!"],
  "Dada": ["Dada ji dustbin mein 😱 Himmat toh dekho!"],
  "Dadi": ["Dadi ji dustbin — arey yaar 😂"],
  "Mama": ["Mama ji dustbin mein 😂 Seedha savage!"],
};

const HEART_REACTIONS: Record<string, string[]> = {
  "Mother": ["Maa dil mein ❤️ Bilkul sahi! World's best choice!"],
  "Father": ["Papa dil mein ❤️ Pocket money pakki rahi!"],
  "Nani": ["Nani dil mein ❤️ Ghar ka khaana yaad aa gaya!"],
  "Behen": ["Behen dil mein ❤️ Aww, yaar bohot sweet!"],
  "Bhai": ["Bhai dil mein ❤️ Real ones always!"],
};

const MIND_LINES = [
  "dimag mein 🧠 — respect hai bhai!",
  "ko dimaag mein rakha — samajhdar insaan hai!",
  "— serious respect for this choice 🧠",
];

const CLOSINGS = [
  "Ek dum desi logic! 🔥",
  "Family approved! 🎉",
  "10/10 Indian family wisdom! 🇮🇳",
  "Yeh toh alag hi level hai! 😂",
  "Sahi hai bhai, sahi hai! 👏",
];

function getReaction(assignments: Record<Category, string>, isHindi: boolean): string {
  const { heart, mind, dustbin } = assignments;
  const displayName = (rel: string) => isHindi ? (RELATIONS_HI[rel] ?? rel) : rel;

  const dustbinLine = pickRandom(DUSTBIN_REACTIONS[dustbin] ?? [`${displayName(dustbin)} seedha dustbin 😂 Koi nahi poochega!`]);
  const heartLine = pickRandom(HEART_REACTIONS[heart] ?? [`${displayName(heart)} dil mein ❤️ Solid choice!`]);

  const mindTemplate = pickRandom(MIND_LINES);
  const mindLine = mindTemplate.startsWith("—")
    ? `${displayName(mind)} ${mindTemplate}`
    : `${displayName(mind)} ${mindTemplate}`;

  const closing = pickRandom(CLOSINGS);

  return [heartLine, mindLine, dustbinLine, closing].join("\n\n");
}

const CATEGORY_COLORS: Record<Category, { border: string; bg: string; text: string; glow: string }> = {
  heart: { border: "rgba(255,100,130,0.7)", bg: "rgba(255,100,130,0.1)", text: "text-pink-300", glow: "0 0 14px rgba(255,100,130,0.3)" },
  mind: { border: "rgba(100,200,255,0.7)", bg: "rgba(100,200,255,0.1)", text: "text-blue-300", glow: "0 0 14px rgba(100,200,255,0.3)" },
  dustbin: { border: "rgba(160,160,160,0.5)", bg: "rgba(160,160,160,0.07)", text: "text-gray-400", glow: "0 0 8px rgba(160,160,160,0.15)" },
};

export default function HeartMindDustbin({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = T[lang];
  const isHindi = lang === "HI";

  const [relations, setRelations] = useState<string[]>(pickRelations);
  const [assignments, setAssignments] = useState<Partial<Record<Category, string>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const assignedRelations = useMemo(() => new Set(Object.values(assignments)), [assignments]);
  const takenCategories = useMemo(() => new Set(Object.keys(assignments) as Category[]), [assignments]);

  const displayName = useCallback((rel: string) => isHindi ? (RELATIONS_HI[rel] ?? rel) : rel, [isHindi]);

  const handleRelationClick = (rel: string) => {
    if (result) return;
    setError(null);
    setSelected(prev => prev === rel ? null : rel);
  };

  const handleSlotClick = (cat: Category) => {
    if (result) return;
    setError(null);
    if (!selected) {
      if (assignments[cat]) {
        audioManager.playSFX("assign");
        setAssignments(prev => { const next = { ...prev }; delete next[cat]; return next; });
      }
      return;
    }
    audioManager.playSFX("assign");
    setAssignments(prev => {
      const next = { ...prev };
      const existingCat = (Object.entries(next) as [Category, string][]).find(([, v]) => v === selected)?.[0];
      if (existingCat) delete next[existingCat];
      next[cat] = selected;
      return next;
    });
    setSelected(null);
  };

  const handleSubmit = () => {
    if (takenCategories.size < 3) { setError(t.selectAll); return; }
    const reaction = getReaction(assignments as Record<Category, string>, isHindi);
    setResult(reaction);
    setStreak(s => s + 1);
    audioManager.playSFX("win");
  };

  const nextRound = () => {
    setRelations(pickRelations());
    setAssignments({});
    setSelected(null);
    setResult(null);
    setError(null);
  };

  const renderSlot = (cat: Category) => {
    const colors = CATEGORY_COLORS[cat];
    const content = assignments[cat];
    const isTarget = selected !== null && !takenCategories.has(cat);
    return (
      <button
        key={cat}
        onClick={() => handleSlotClick(cat)}
        className="rounded-lg p-3 text-center transition-all duration-200 flex flex-col items-center gap-1 cursor-pointer"
        style={{
          border: `2px solid ${content || isTarget ? colors.border : "rgba(255,255,255,0.1)"}`,
          background: content || isTarget ? colors.bg : "rgba(255,255,255,0.02)",
          boxShadow: content || isTarget ? colors.glow : undefined,
          transform: isTarget ? "scale(1.03)" : "scale(1)",
          minHeight: 90,
          justifyContent: "center",
        }}
      >
        <div className={`chalk-font text-xl ${content ? colors.text : "text-gray-500"}`}>
          {cat === "heart" ? t.heart : cat === "mind" ? t.mind : t.dustbin}
        </div>
        <div className="chalk-hand text-xs text-gray-600">
          {cat === "heart" ? t.heartDesc : cat === "mind" ? t.mindDesc : t.dustbinDesc}
        </div>
        {content ? (
          <div className={`chalk-font text-lg mt-1 ${colors.text}`} style={{ textShadow: colors.glow }}>
            {displayName(content)}
          </div>
        ) : (
          <div className="chalk-hand text-xs text-gray-700 mt-1">
            {isTarget ? t.tapToPlace : t.empty}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="screen-fade-in flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>
        <h2 className="chalk-font text-2xl text-yellow-200 chalk-glow leading-tight text-center">{t.hmdTitle}</h2>
        <div style={{ width: 72 }} />
      </div>

      {streak > 0 && (
        <div className="chalk-border rounded-lg px-4 py-1.5 flex items-center gap-2">
          <span className="chalk-font text-xl text-yellow-300 chalk-glow">🔥 {t.streak}: {streak}</span>
        </div>
      )}

      <p className="chalk-hand text-gray-500 text-sm text-center">{t.hmdSubtitle}</p>

      {result ? (
        <div className="screen-fade-in w-full flex flex-col items-center gap-5">
          <div className="chalk-border rounded-xl p-5 w-full text-center" style={{ borderColor: 'rgba(255,240,150,0.4)' }}>
            <div className="chalk-font text-2xl text-yellow-200 chalk-glow mb-4">{t.result}</div>

            <div className="flex gap-2 justify-center flex-wrap mb-4">
              {(["heart", "mind", "dustbin"] as Category[]).map(cat => {
                const colors = CATEGORY_COLORS[cat];
                const rel = (assignments as Record<Category, string>)[cat];
                return (
                  <div key={cat} className="rounded-lg px-3 py-2 text-center"
                    style={{ border: `1.5px solid ${colors.border}`, background: colors.bg, minWidth: 90 }}>
                    <div className={`chalk-font text-sm ${colors.text}`}>
                      {cat === "heart" ? t.heart : cat === "mind" ? t.mind : t.dustbin}
                    </div>
                    <div className={`chalk-font text-xl ${colors.text}`}>{displayName(rel)}</div>
                  </div>
                );
              })}
            </div>

            <div className="chalk-border rounded-lg p-4 text-left" style={{ borderColor: 'rgba(255,240,150,0.2)' }}>
              {result.split("\n\n").filter(Boolean).map((line, i) => (
                <p key={i} className="chalk-hand text-gray-200 text-base leading-relaxed mb-2 last:mb-0 last:font-semibold">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <button onClick={nextRound} className="chalk-btn chalk-btn-green text-xl px-8 py-3">
            {t.nextRound} →
          </button>
        </div>
      ) : (
        <>
          <div className="chalk-hand text-gray-500 text-xs text-center">
            {selected
              ? <span className="text-yellow-300">{t.nowTapSlot} <strong>{displayName(selected)}</strong></span>
              : t.tapRelInstruction}
          </div>

          <div className="flex gap-3 justify-center w-full">
            {relations.map(rel => {
              const isAssigned = assignedRelations.has(rel);
              const isSelectedRel = selected === rel;
              const assignedCat = (Object.entries(assignments) as [Category, string][]).find(([, v]) => v === rel)?.[0];
              const colors = assignedCat ? CATEGORY_COLORS[assignedCat] : null;
              return (
                <button
                  key={rel}
                  onClick={() => handleRelationClick(rel)}
                  className="flex-1 rounded-lg py-4 px-2 text-center transition-all duration-200"
                  style={{
                    border: `2px solid ${isSelectedRel ? "rgba(255,240,150,0.9)" : isAssigned && colors ? colors.border : "rgba(255,255,255,0.12)"}`,
                    background: isSelectedRel ? "rgba(255,240,150,0.1)" : isAssigned && colors ? colors.bg : "rgba(255,255,255,0.02)",
                    boxShadow: isSelectedRel ? "0 0 16px rgba(255,240,150,0.3)" : undefined,
                    transform: isSelectedRel ? "translateY(-4px) scale(1.04)" : "scale(1)",
                  }}
                >
                  <div className={`chalk-font text-2xl ${isAssigned && colors ? colors.text : "text-gray-200"} ${isSelectedRel ? "chalk-glow" : ""}`}>
                    {displayName(rel)}
                  </div>
                  {isAssigned && assignedCat && (
                    <div className={`chalk-hand text-xs mt-1 ${CATEGORY_COLORS[assignedCat].text}`}>
                      {assignedCat === "heart" ? t.heart : assignedCat === "mind" ? t.mind : t.dustbin}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {(["heart", "mind", "dustbin"] as Category[]).map(renderSlot)}
          </div>

          {error && <div className="chalk-hand text-red-400 text-sm text-center">{error}</div>}

          <button
            onClick={handleSubmit}
            className="chalk-btn chalk-btn-green text-xl px-8 py-3 w-full"
            style={{ opacity: takenCategories.size < 3 ? 0.5 : 1 }}
          >
            {t.submit}
          </button>
        </>
      )}
    </div>
  );
}
