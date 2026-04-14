import { useState, useRef } from "react";
import { useLang } from "@/lang";
import { T } from "@/translations";
import { audioManager } from "@/audioManager";

type Category = "funny" | "school" | "crazy";
type AiMode = "off" | "on";

const TRUTHS: Record<Category, string[]> = {
  funny: [
    "What's the most embarrassing thing you've ever done in public?",
    "Have you ever laughed so hard that you peed a little? When?",
    "What's the weirdest thing you've ever eaten?",
    "What's a silly fear you have that most people don't know about?",
    "What's the most cringe-worthy photo of you on your phone right now?",
    "Have you ever accidentally called a teacher 'mom' or 'dad'?",
    "What's the funniest excuse you've used to get out of trouble?",
    "Have you ever tripped and fallen in front of everyone and pretended it didn't happen?",
    "What's one thing you do that you'd be embarrassed if your friends found out?",
    "What's the most ridiculous reason you've ever cried?",
  ],
  school: [
    "Did you ever cheat on a test? How?",
    "Who was your secret crush in school and did anyone know?",
    "What's the biggest lie you told a teacher to avoid getting in trouble?",
    "Have you ever blamed someone else for something you did in class?",
    "What's the most embarrassing thing a teacher ever said about you?",
    "Did you ever pass notes in class? What was in them?",
    "Which subject did you pretend to like just to impress someone?",
    "Did you ever ditch class? Where did you go?",
    "Have you ever copied homework word for word? Did you get caught?",
    "Who was the teacher you were most scared of and why?",
  ],
  crazy: [
    "What's the craziest thing you've done on a dare?",
    "Have you ever sneaked out at night? Where did you go?",
    "What's one thing you've done that no one in this group knows about?",
    "Have you ever pretended to be sick to avoid something you were afraid of?",
    "What's the most rebellious thing you've ever done?",
    "Have you ever stolen something? What was it?",
    "What's the most dangerous thing you've done just for fun?",
    "Have you ever kept a secret for years that you're still hiding now?",
    "What's the worst thing you've done that your parents never found out about?",
    "Have you ever lied to get out of trouble and it worked perfectly?",
  ],
};

const DARES: Record<Category, string[]> = {
  funny: [
    "Do your best impression of a Bollywood villain for 30 seconds.",
    "Speak in a funny accent for the next 3 rounds.",
    "Act like a chicken for 1 full minute without stopping.",
    "Make up a rap about the person sitting next to you.",
    "Do the most dramatic cry you can for 20 seconds.",
    "Pretend to be a news anchor and announce today's events dramatically.",
    "Do your best signature Bollywood dance move.",
    "Say the alphabet backwards as fast as you can.",
    "Call someone 'Shrimaan ji' for the next 3 rounds.",
    "Make the funniest face you can and hold it for 15 seconds.",
  ],
  school: [
    "Recite the periodic table of elements (as far as you can).",
    "Write your name on an imaginary blackboard with your nose.",
    "Pretend to give a serious classroom lecture on bananas.",
    "Do 10 push-ups while reciting multiplication tables.",
    "Act like you just got your exam results — either joy or horror, you pick.",
    "Pretend to be a strict school teacher scolding the group.",
    "Sing the national anthem while doing jumping jacks.",
    "Do a standing presentation about why homework is actually fun.",
    "Mimic a teacher you all know for at least 30 seconds.",
    "Give a motivational speech about studying as if you're the principal.",
  ],
  crazy: [
    "Call someone random in your contacts and sing them a song.",
    "Let the group pick a ridiculous hairstyle you must wear for 10 minutes.",
    "Do your best moonwalk across the room — three times.",
    "Eat a spoonful of the spiciest condiment available.",
    "Post a random goofy selfie to your story right now.",
    "Let someone go through your camera roll for 30 seconds.",
    "Text your best friend 'I know what you did' and wait for a reply.",
    "Do 20 star jumps while screaming 'I am the champion!'",
    "Speak in rhymes for the next 5 minutes.",
    "Let the group give you a nickname you must accept for the rest of the game.",
  ],
};

const AI_TRUTH_TAUNTS = [
  "Sach bol 😏",
  "Jhooth mat bolna! 👀",
  "Haha! Yeh toh batana hi padega 😄",
  "Ab koi chhupa nahi sakte! 🤭",
  "Sach bologe toh baat bane 😂",
  "Arre, yeh toh easy hai na? 😜",
  "Seedha jawab chahiye! 😤",
  "No escape this time! 👁️",
];

const AI_DARE_TAUNTS = [
  "Darr gaya kya? 😈",
  "Yeh toh karna hi padega! 🔥",
  "Sahas hai toh karo! 💪",
  "Dare hai toh complete karo! 😂",
  "Ab bhaagna nahi chahiye 😄",
  "Mana kiya toh... double dare! 👀",
  "Yeh toh kuch bhi nahi hai! 😏",
  "Easy peasy! Bas karo! 🎉",
];

const AI_RESULT_PHRASES = [
  "Well played! Next! 🎯",
  "Kya scene hai yaar! 😂",
  "Bohot maza aaya! 🙌",
  "Ab agli baari kaun? 🎪",
  "Game on! 🎮",
];

export default function TruthDare({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const t = T[lang];

  const [category, setCategory] = useState<Category>("school");
  const [aiMode, setAiMode] = useState<AiMode>("off");
  const [popup, setPopup] = useState<{ type: "truth" | "dare"; text: string; taunt: string; result: string } | null>(null);
  const lastTruthRef = useRef<number>(-1);
  const lastDareRef = useRef<number>(-1);

  const getRandom = <T,>(arr: T[], last: number): { idx: number; val: T } => {
    if (arr.length === 1) return { idx: 0, val: arr[0] };
    let idx = last;
    while (idx === last) idx = Math.floor(Math.random() * arr.length);
    return { idx, val: arr[idx] };
  };

  const getRandomPhrase = (arr: string[]): string =>
    arr[Math.floor(Math.random() * arr.length)];

  const handleTruth = () => {
    audioManager.playSFX("turn");
    const list = TRUTHS[category];
    const { idx, val } = getRandom(list, lastTruthRef.current);
    lastTruthRef.current = idx;
    const taunt = aiMode === "on" ? getRandomPhrase(AI_TRUTH_TAUNTS) : "";
    const result = aiMode === "on" ? getRandomPhrase(AI_RESULT_PHRASES) : "";
    setPopup({ type: "truth", text: val, taunt, result });
  };

  const handleDare = () => {
    audioManager.playSFX("suspense");
    const list = DARES[category];
    const { idx, val } = getRandom(list, lastDareRef.current);
    lastDareRef.current = idx;
    const taunt = aiMode === "on" ? getRandomPhrase(AI_DARE_TAUNTS) : "";
    const result = aiMode === "on" ? getRandomPhrase(AI_RESULT_PHRASES) : "";
    setPopup({ type: "dare", text: val, taunt, result });
  };

  return (
    <div className="screen-fade-in flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{t.back}</button>
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">Sach ya Jhooth</h2>
        <div style={{ width: 72 }} />
      </div>

      <div className="flex gap-3 justify-center w-full">
        <button
          onClick={() => setAiMode("off")}
          className={`chalk-btn text-sm px-3 py-1 ${aiMode === "off" ? "chalk-btn-green" : "opacity-40 hover:opacity-70"}`}
        >
          {t.normalMode}
        </button>
        <button
          onClick={() => setAiMode("on")}
          className={`chalk-btn text-sm px-3 py-1 ${aiMode === "on" ? "chalk-btn-red" : "opacity-40 hover:opacity-70"}`}
        >
          {t.aiHost}
        </button>
      </div>

      {aiMode === "on" && (
        <div className="chalk-border rounded-lg px-4 py-2 text-center w-full"
          style={{ borderColor: 'rgba(255,200,50,0.3)' }}>
          <p className="chalk-hand text-yellow-400 text-sm">{t.aiHostDesc}</p>
        </div>
      )}

      <div className="chalk-border rounded-lg p-4 w-full text-center">
        <p className="chalk-hand text-gray-400 mb-3 text-sm tracking-wide uppercase">{t.chooseCategory}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {(["funny", "school", "crazy"] as Category[]).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={[
                "chalk-btn capitalize",
                category === cat
                  ? cat === "funny" ? "chalk-btn-green" : cat === "school" ? "chalk-btn-blue" : "chalk-btn-red"
                  : "opacity-40 hover:opacity-70",
              ].join(" ")}
              style={{ fontSize: '1.1rem', padding: '0.4rem 1.2rem' }}>
              {cat === "funny" ? t.funny : cat === "school" ? t.school : t.crazy}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 w-full justify-center mt-4">
        <button onClick={handleTruth} className="chalk-btn chalk-btn-blue flex-1 py-4 text-2xl" style={{ maxWidth: 180 }}>
          {t.truth}
        </button>
        <button onClick={handleDare} className="chalk-btn chalk-btn-red flex-1 py-4 text-2xl" style={{ maxWidth: 180 }}>
          {t.dare}
        </button>
      </div>

      <p className="chalk-hand text-gray-500 text-sm text-center mt-2">{t.tapInstruction}</p>

      {popup && (
        <div className="td-popup" onClick={() => setPopup(null)}>
          <div
            className="td-card chalk-border"
            style={{ borderColor: popup.type === "truth" ? "rgba(100,220,255,0.6)" : "rgba(255,100,100,0.6)" }}
            onClick={e => e.stopPropagation()}
          >
            {popup.taunt && (
              <div className="chalk-font text-lg text-yellow-300 mb-2 chalk-glow">{popup.taunt}</div>
            )}

            <div className={`chalk-font text-4xl mb-4 ${popup.type === "truth" ? "text-blue-300 chalk-glow-blue" : "text-red-400"}`}
              style={popup.type === "dare" ? { textShadow: '0 0 12px rgba(255,100,100,0.6)' } : {}}>
              {popup.type === "truth" ? t.truth.toUpperCase() : t.dare.toUpperCase()}
            </div>

            <div className="chalk-border rounded-lg p-4 mb-4"
              style={{ borderColor: popup.type === "truth" ? "rgba(100,220,255,0.3)" : "rgba(255,100,100,0.3)" }}>
              <p className="chalk-hand text-gray-100 text-lg leading-relaxed">{popup.text}</p>
            </div>

            {popup.result && (
              <div className="chalk-hand text-gray-500 text-sm mb-3 italic">{popup.result}</div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => popup.type === "truth" ? handleTruth() : handleDare()}
                className={`chalk-btn ${popup.type === "truth" ? "chalk-btn-blue" : "chalk-btn-red"}`}
              >
                {popup.type === "truth" ? t.newTruth : t.newDare}
              </button>
              <button onClick={() => setPopup(null)} className="chalk-btn">{t.done}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
