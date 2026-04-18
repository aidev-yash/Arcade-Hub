import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "@/lang";
import { audioManager } from "@/audioManager";
import { addXP } from "@/xpSystem";

type Role = "raja" | "mantri" | "sipai" | "chor";
type Difficulty = "easy" | "medium" | "hard";
type Phase = "setup" | "picking" | "reveal" | "dialogue" | "result" | "gameover";
type DialogueStep = "raja_cmd" | "mantri_resp" | "sipai_hint" | "chor_msg" | "mantri_guess" | null;

const TOTAL_ROUNDS = 5;
const ROLE_POINTS: Record<Role, number> = { raja: 1000, mantri: 500, sipai: 100, chor: 0 };
const ROLE_LABEL_EN: Record<Role, string> = { raja: "Raja 👑", mantri: "Mantri 📜", sipai: "Sipai ⚔️", chor: "Chor 🦹" };
const ROLE_LABEL_HI: Record<Role, string> = { raja: "राजा 👑", mantri: "मंत्री 📜", sipai: "सिपाई ⚔️", chor: "चोर 🦹" };
const ROLE_COLOR: Record<Role, string> = { raja: "text-yellow-300", mantri: "text-blue-300", sipai: "text-green-300", chor: "text-red-400" };
const ROLE_BG: Record<Role, string> = { raja: "rgba(255,220,50,0.12)", mantri: "rgba(100,200,255,0.12)", sipai: "rgba(100,255,160,0.12)", chor: "rgba(255,100,100,0.12)" };
const ROLE_BORDER: Record<Role, string> = { raja: "rgba(255,220,50,0.55)", mantri: "rgba(100,200,255,0.55)", sipai: "rgba(100,255,160,0.55)", chor: "rgba(255,100,100,0.55)" };

const PLAYER_NAMES_EN = ["Aap", "Rahul", "Priya", "Bunty"];
const PLAYER_NAMES_HI = ["आप", "Rahul", "Priya", "Bunty"];

// ── Shared message pools ─────────────────────────────────────────────────────
// neutral: could come from anyone; helpful: genuine clue; misleading: deflection/confusion
const MSG_POOL = {
  EN: {
    neutral: [
      "Sabka chehra ek jaisa dikh raha hai aaj...",
      "Pata nahi, sab kuch bahut normal lag raha hai.",
      "Mujhe kuch samajh nahi aa raha.",
      "Darbaar mein bahut sannata hai aaj.",
      "Sab log apna apna kaam kar rahe hain.",
      "Kuch toh hai yahan, par pakad nahi aata.",
      "Aaj ka mausam bhi bada strange hai.",
      "Ek cheez toh confirm hai — sab jhooth bol rahe hain ya sach.",
      "Koi baat nahi, dekhte hain kya hota hai.",
      "Har roz aisa hi hota hai darbaar mein.",
    ],
    helpful: [
      "Jo zyada comfortable lag raha hai, wahi dhyan dene wala hai.",
      "Ek banda bahut zyada seedha saadha dikhne ki koshish kar raha hai.",
      "Kaan khol ke suno — jo nahi bola woh bhi baat karta hai.",
      "Body language dhyan se dekho, aankhein jhooth nahi bolti.",
      "Jo sabse pehle dusron pe shaq kare... wahi suspect hota hai sometimes.",
      "Thoda aur dhyan do — answer mein gap chhupa hai.",
      "Jo bahut smooth jawab de raha hai, uspe nazar rakho.",
      "Ek chehra thoda forced lagta hai aaj — pakad sakte ho.",
      "Shuruaat mein jo chup tha, uska naam zehan mein rakho.",
      "Darr ka ek alag andaz hota hai — dekhte rehna.",
    ],
    misleading: [
      "Mujhe toh seedha saadha insaan lagta hai har koi yahan.",
      "Sab kuch theek lag raha hai mujhe toh.",
      "Main confirm kar sakta hoon — main bilkul sahi jagah hoon.",
      "Itna obvious question kyun pooch rahe ho?",
      "Zyada socho mat — simple answer hi sahi hoga.",
      "Jo hint de raha hai woh bhi toh galat ho sakta hai na?",
      "Evidence ke bina kuch nahi keh sakte.",
      "Main toh bas apna kaam kar raha hoon yahan.",
      "Koi bhi chor ho sakta hai — including jo hint de raha hai.",
      "Shaq karo toh sab pe karo, ek pe kyun?",
    ],
    rajaCmd: [
      "Mantri! Darbaar mein chor chhupa hua hai — dhundo!",
      "Sach batao — kaun hai gaddaar hamare beech?",
      "Mantri ji, ye aapki zimmedari hai. Galti mat karna!",
      "Darbaar ki izzat daav pe hai. Mantri, kaam karo!",
      "Hukum hai — chor ko abhi pesh karo!",
      "Seedha jawab chahiye, baat ghumao mat!",
      "Mantri, ankhein kholo — sach saamne hai.",
      "Darbaar mein kohraam hai — Mantri, faisla karo!",
    ],
    mantriOk: [
      "Ji Maharaj! Abhi pata karta hoon.",
      "Zaroor Maharaj! Apna farz nibhaunga.",
      "Huzoor, dhyan se dekhunga — koi bache nahi.",
      "Bilkul Sarkar! Poori koshish karunga.",
      "Maharaj, meri nazar mein hai sab kuch.",
      "Aapka hukum sir aankhon par.",
      "Thoda waqt do Huzoor — sach saamne aayega.",
      "Ji, main soch raha hoon... kuch toh gadbad hai.",
    ],
    mantriWrong: "Arey Maharaj... aap khud hi thode chor lagte ho! 😏",
    rajaAngry: "😡 KHABARDAR! Mantri ne meri beizzati ki! Is naasamajhi ki saza — Chor ko seedha inaam!",
    guessPrompt: "Mantri ji, faisla karo — kaun hai Chor?",
  },
  HI: {
    neutral: [
      "सबका चेहरा एक जैसा दिख रहा है आज...",
      "पता नहीं, सब कुछ बहुत normal लग रहा है।",
      "मुझे कुछ समझ नहीं आ रहा।",
      "दरबार में बहुत सन्नाटा है आज।",
      "सब लोग अपना-अपना काम कर रहे हैं।",
      "कुछ तो है यहाँ, पर पकड़ में नहीं आता।",
      "एक बात तो confirm है — सब या झूठ बोल रहे हैं या सच।",
      "कोई बात नहीं, देखते हैं क्या होता है।",
      "हर रोज़ ऐसा ही होता है दरबार में।",
      "आज माहौल थोड़ा अजीब है।",
    ],
    helpful: [
      "जो ज़्यादा comfortable लग रहा है, वही ध्यान देने वाला है।",
      "एक बंदा बहुत ज़्यादा सीधा-साधा दिखने की कोशिश कर रहा है।",
      "कान खोल के सुनो — जो नहीं बोला वो भी बात करता है।",
      "Body language ध्यान से देखो, आँखें झूठ नहीं बोलतीं।",
      "जो सबसे पहले दूसरों पे शक करे — वही कभी-कभी suspect होता है।",
      "थोड़ा और ध्यान दो — जवाब में gap छुपा है।",
      "जो बहुत smooth जवाब दे रहा है, उस पर नज़र रखो।",
      "एक चेहरा थोड़ा forced लगता है आज — पकड़ सकते हो।",
      "शुरुआत में जो चुप था, उसका नाम ज़ेहन में रखो।",
      "डर का एक अलग अंदाज़ होता है — देखते रहना।",
    ],
    misleading: [
      "मुझे तो सीधा-साधा इंसान लगता है यहाँ हर कोई।",
      "सब कुछ ठीक लग रहा है मुझे तो।",
      "मैं confirm कर सकता हूं — मैं बिल्कुल सही जगह हूं।",
      "इतना obvious सवाल क्यों पूछ रहे हो?",
      "ज़्यादा सोचो मत — simple answer ही सही होगा।",
      "जो hint दे रहा है वो भी तो गलत हो सकता है ना?",
      "Evidence के बिना कुछ नहीं कह सकते।",
      "मैं तो बस अपना काम कर रहा हूं यहाँ।",
      "कोई भी चोर हो सकता है — जिसमें hint देने वाला भी।",
      "शक करो तो सब पे करो, एक पे क्यों?",
    ],
    rajaCmd: [
      "मंत्री! दरबार में चोर छुपा हुआ है — ढूंढो!",
      "सच बताओ — हमारे बीच गद्दार कौन है?",
      "मंत्री जी, यह आपकी ज़िम्मेदारी है। गलती मत करना!",
      "दरबार की इज़्ज़त दाँव पे है। मंत्री, काम करो!",
      "हुक्म है — चोर को अभी पेश करो!",
      "सीधा जवाब चाहिए, बात घुमाओ मत!",
      "मंत्री, आँखें खोलो — सच सामने है।",
      "दरबार में कोहराम है — मंत्री, फ़ैसला करो!",
    ],
    mantriOk: [
      "जी महाराज! अभी पता करता हूं।",
      "ज़रूर महाराज! अपना फ़र्ज़ निभाऊंगा।",
      "हुज़ूर, ध्यान से देखूंगा — कोई बचे नहीं।",
      "बिल्कुल सरकार! पूरी कोशिश करूंगा।",
      "महाराज, मेरी नज़र में है सब कुछ।",
      "आपका हुक्म सिर आँखों पर।",
      "थोड़ा वक़्त दो हुज़ूर — सच सामने आएगा।",
      "जी, मैं सोच रहा हूं... कुछ तो गड़बड़ है।",
    ],
    mantriWrong: "अरे महाराज... आप खुद ही थोड़े चोर लगते हो! 😏",
    rajaAngry: "😡 खबरदार! मंत्री ने मेरी बेइज़्ज़ती की! इस नासमझी की सज़ा — चोर को सीधा इनाम!",
    guessPrompt: "मंत्री जी, फ़ैसला करो — चोर कौन है?",
  },
};

// Weighted random: picks from pool based on weights
function weightedPick(pools: string[][], weights: number[]): string {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return pickRand(pools[i]);
  }
  return pickRand(pools[pools.length - 1]);
}

function getSipaiMsg(l: "EN" | "HI"): string {
  const p = MSG_POOL[l];
  // 70% helpful, 15% neutral, 15% misleading
  return weightedPick([p.helpful, p.neutral, p.misleading], [0.70, 0.15, 0.15]);
}

function getChorMsg(l: "EN" | "HI"): string {
  const p = MSG_POOL[l];
  // 70% misleading, 30% neutral
  return weightedPick([p.misleading, p.neutral], [0.70, 0.30]);
}

interface ChoiceOpt { text: string; isWrong?: boolean }

// Player options are ambiguous — drawn from shared pools, shuffled each game
// All roles get a mix of neutral + role-leaning + opposite-lean options
const PLAYER_CHOICES: Record<string, Record<Role, ChoiceOpt[]>> = {
  EN: {
    raja: [
      { text: "Mantri, is darbaar mein sach dhundho — galti mat karna." },
      { text: "Seedha jawab chahiye. Kaun hai jo chhup raha hai?" },
      { text: "Main dekh raha hoon — koi ek bahut zyada innocent lag raha hai." },
      { text: "Jaldi karo Mantri, warna main khud faisla karunga!" },
    ],
    mantri: [
      { text: "Ji Huzoor, apni poori koshish karunga." },
      { text: "Maharaj, kuch toh andar se gadbad lag raha hai." },
      { text: "Aapka hukum sir aankhon par — dhyan se sochta hoon." },
      { text: "Arey Maharaj... aap khud hi thode suspicious lagte ho! 😏", isWrong: true },
    ],
    sipai: [
      { text: "Mantri ji, jo bahut zyada bol raha hai — uspe nazar rakho." },
      { text: "Kuch obvious lag raha hai... par sach nahi bataunga abhi." },
      { text: "Body language bolta hai — aankhein dhyaan se dekho." },
      { text: "Mujhe toh sab ek jaisa lag raha hai, honestly." },
    ],
    chor: [
      { text: "Mantri ji, mujhe koi shak nahi hai apne aap pe." },
      { text: "Jo zyada hint de raha hai — woh khud suspicious hai." },
      { text: "Main seedha saadha insaan hoon, apna kaam karo." },
      { text: "Sach batata hoon — mujhe bhi kisi pe shak hai." },
    ],
  },
  HI: {
    raja: [
      { text: "मंत्री, इस दरबार में सच ढूंढो — गलती मत करना।" },
      { text: "सीधा जवाब चाहिए। कौन है जो छुप रहा है?" },
      { text: "मैं देख रहा हूं — कोई एक बहुत ज़्यादा innocent लग रहा है।" },
      { text: "जल्दी करो मंत्री, वरना मैं खुद फ़ैसला करूंगा!" },
    ],
    mantri: [
      { text: "जी हुज़ूर, अपनी पूरी कोशिश करूंगा।" },
      { text: "महाराज, कुछ तो अंदर से गड़बड़ लग रहा है।" },
      { text: "आपका हुक्म सिर आँखों पर — ध्यान से सोचता हूं।" },
      { text: "अरे महाराज... आप खुद ही थोड़े suspicious लगते हो! 😏", isWrong: true },
    ],
    sipai: [
      { text: "मंत्री जी, जो बहुत ज़्यादा बोल रहा है — उस पर नज़र रखो।" },
      { text: "कुछ obvious लग रहा है... पर सच नहीं बताऊंगा अभी।" },
      { text: "Body language बोलता है — आँखें ध्यान से देखो।" },
      { text: "मुझे तो सब एक जैसा लग रहा है, honestly।" },
    ],
    chor: [
      { text: "मंत्री जी, मुझे कोई शक नहीं है अपने आप पे।" },
      { text: "जो ज़्यादा hint दे रहा है — वो खुद suspicious है।" },
      { text: "मैं सीधा-सादा इंसान हूं, अपना काम करो।" },
      { text: "सच बताता हूं — मुझे भी किसी पे शक है।" },
    ],
  },
};

const STEP_PROMPT: Record<string, Partial<Record<string, string>>> = {
  EN: {
    raja_cmd: "👑 Your turn as Raja — give your royal command:",
    mantri_resp: "📜 Your turn as Mantri — respond to the Raja:",
    sipai_hint: "⚔️ Your turn as Sipai — give Mantri a hint (stay indirect!):",
    chor_msg: "🦹 Your turn as Chor — confuse the Mantri:",
    mantri_guess: "📜 Mantri ji — who do you think is the Chor?",
  },
  HI: {
    raja_cmd: "👑 राजा के रूप में आपकी बारी — हुक्म दीजिए:",
    mantri_resp: "📜 मंत्री के रूप में आपकी बारी — राजा को जवाब दो:",
    sipai_hint: "⚔️ सिपाई के रूप में आपकी बारी — मंत्री को hint दो:",
    chor_msg: "🦹 चोर के रूप में आपकी बारी — मंत्री को confuse करो:",
    mantri_guess: "📜 मंत्री जी — चोर कौन है?",
  },
};

const UI = {
  EN: {
    back: "← Wapas", round: "Baazi", of: "ka", chooseChit: "Apni chit chuno!", botsPicking: "Bots apni chit chunte hain...",
    yourRole: "Aapka role:", revealTitle: "Raja aur Mantri sab ke samne!", correctGuess: "✅ Bilkul sahi! Mantri ne Chor ko pakad liya!",
    wrongGuess: "❌ Galat andaza! Chor bhaag gaya!", sipaiBonus: "⚔️ Sipai ke sanket kaam aaye! +100 bonus!",
    rajaAngryNote: "😡 Raja ka gussa — Chor ko bonus inaam!", nextRound: "Agli Baazi", playAgain: "Naya Khel",
    roundScores: "Is Baazi Ke Points", totalScores: "Kul Score", picked: "✓ Chit li", available: "Chit lo",
    difficulty: "Mushkil", diffEasyDesc: "Aaram se chuno", diffMediumDesc: "Balanced timing", diffHardDesc: "Bots jhapat te hain — jo bacha woh aapka",
    gameOver: "Khel Khatam! 🏆", winner: "Vijeta", finalScores: "Final Scoreboard", playAgainFull: "Phir Khelo",
    youWin: "🎉 Aap Jeete!", tieGame: "🤝 Barabar!",
    roundOf: "Baazi",
  },
  HI: {
    back: "← वापस", round: "बाज़ी", of: "की", chooseChit: "अपनी चिट चुनो!", botsPicking: "Bots अपनी चिट चुनते हैं...",
    yourRole: "आपका रोल:", revealTitle: "राजा और मंत्री सब के सामने!", correctGuess: "✅ बिल्कुल सही! मंत्री ने चोर को पकड़ लिया!",
    wrongGuess: "❌ गलत अंदाज़ा! चोर भाग गया!", sipaiBonus: "⚔️ सिपाई के संकेत काम आए! +100 bonus!",
    rajaAngryNote: "😡 राजा का गुस्सा — चोर को bonus इनाम!", nextRound: "अगली बाज़ी", playAgain: "नया खेल",
    roundScores: "इस बाज़ी के Points", totalScores: "कुल Score", picked: "✓ चिट ली", available: "चिट लो",
    difficulty: "मुश्किल", diffEasyDesc: "आराम से चुनो", diffMediumDesc: "Balanced timing", diffHardDesc: "Bots झपट्टा मारते हैं — जो बचे वो आपका",
    gameOver: "खेल खत्म! 🏆", winner: "विजेता", finalScores: "Final Scoreboard", playAgainFull: "फिर खेलो",
    youWin: "🎉 आप जीते!", tieGame: "🤝 बराबर!",
    roundOf: "बाज़ी",
  },
};

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pickRand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

interface ChatEntry { id: number; speakerIdx: number; text: string; isSystem?: boolean; }

export default function RajaMantriChorSipai({ onBack }: { onBack: () => void }) {
  const { lang } = useLang();
  const ui = lang === "HI" ? UI.HI : UI.EN;
  const playerChoices = PLAYER_CHOICES[lang];
  const roleLabel = lang === "HI" ? ROLE_LABEL_HI : ROLE_LABEL_EN;
  const playerNames = lang === "HI" ? PLAYER_NAMES_HI : PLAYER_NAMES_EN;
  const stepPrompt = STEP_PROMPT[lang];

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState(1);

  const [chitOwners, setChitOwners] = useState<(number | null)[]>([null, null, null, null]);
  const [playerRoles, setPlayerRoles] = useState<(Role | null)[]>([null, null, null, null]);
  const [totalScores, setTotalScores] = useState([0, 0, 0, 0]);
  const [roundScores, setRoundScores] = useState([0, 0, 0, 0]);

  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [dialogueStep, setDialogueStep] = useState<DialogueStep>(null);
  const [awaitingChoice, setAwaitingChoice] = useState(false);
  const [guessedPlayerId, setGuessedPlayerId] = useState<number | null>(null);
  const [guessCorrect, setGuessCorrect] = useState<boolean | null>(null);
  const [sipaiWasHelpful, setSipaiWasHelpful] = useState(false);
  const [mantriAngryFlag, setMantriAngryFlag] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [revealedRoles, setRevealedRoles] = useState(false);

  const gameRef = useRef({
    shuffledRoles: [] as Role[],
    chitOwners: [null, null, null, null] as (number | null)[],
    playerRoles: [null, null, null, null] as (Role | null)[],
    difficulty: "medium" as Difficulty,
    mantriAngry: false,
    sipaiHelpful: false,
    sipaiFirst: true,
    lang: "EN" as "EN" | "HI",
  });
  const chatIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const executeStepRef = useRef<((step: DialogueStep) => void) | null>(null);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => () => clearTimers(), []);
  const sched = (fn: () => void, ms: number) => { timersRef.current.push(setTimeout(fn, ms)); };

  // ── XP reward: award 2000 XP when the player wins the overall RMCS game ──
  // A ref tracks whether XP was already awarded for the current game session
  // to prevent double-awarding if the component re-renders during "gameover".
  const xpAwardedRef = useRef(false);
  useEffect(() => {
    if (phase === "gameover" && !xpAwardedRef.current) {
      const maxScore = Math.max(...totalScores);
      const winnerIdx = totalScores.indexOf(maxScore);
      const isTie = totalScores.filter(s => s === maxScore).length > 1;
      if (!isTie && winnerIdx === 0) {
        xpAwardedRef.current = true;
        addXP(2000);
      }
    }
    // Reset the guard whenever a new game starts (phase goes back to "setup")
    if (phase === "setup") xpAwardedRef.current = false;
  }, [phase, totalScores]);

  const addChat = (speakerIdx: number, text: string, isSystem = false) => {
    const id = ++chatIdRef.current;
    setChat(prev => [...prev, { id, speakerIdx, text, isSystem }]);
  };

  const assignChit = useCallback((chitIdx: number, playerIdx: number) => {
    gameRef.current.chitOwners[chitIdx] = playerIdx;
    gameRef.current.playerRoles[playerIdx] = gameRef.current.shuffledRoles[chitIdx];
    setChitOwners([...gameRef.current.chitOwners]);
    setPlayerRoles([...gameRef.current.playerRoles]);
  }, []);

  const pickAvailableChitForBot = (botIdx: number) => {
    const available = [0, 1, 2, 3].filter(i => gameRef.current.chitOwners[i] === null);
    if (available.length === 0) return;
    const chitIdx = available[Math.floor(Math.random() * available.length)];
    assignChit(chitIdx, botIdx);
  };

  const calcScores = (roles: (Role | null)[], mantriCorrect: boolean, angry: boolean, helpful: boolean) => {
    const s = [0, 0, 0, 0];
    const ri = roles.indexOf("raja"), mi = roles.indexOf("mantri"), si = roles.indexOf("sipai"), ci = roles.indexOf("chor");
    if (mantriCorrect) {
      if (ri >= 0) s[ri] = ROLE_POINTS.raja;
      if (mi >= 0) s[mi] = angry ? 0 : ROLE_POINTS.mantri;
      if (si >= 0) s[si] = ROLE_POINTS.sipai + (helpful ? 100 : 0);
    } else {
      if (ci >= 0) s[ci] = 500;
      if (si >= 0) s[si] = ROLE_POINTS.sipai;
    }
    if (angry && ci >= 0) s[ci] += 500;
    return s;
  };

  const executeStep = useCallback((step: DialogueStep) => {
    if (!step) return;
    const roles = gameRef.current.playerRoles;
    const userRole = roles[0];
    const l = gameRef.current.lang;
    const pool = MSG_POOL[l];
    const pNames = l === "HI" ? PLAYER_NAMES_HI : PLAYER_NAMES_EN;
    const rajaIdx = roles.indexOf("raja");
    const mantriIdx = roles.indexOf("mantri");
    const sipaiIdx = roles.indexOf("sipai");
    const chorIdx = roles.indexOf("chor");
    const diff = gameRef.current.difficulty;

    setDialogueStep(step);
    setAwaitingChoice(false);

    if (step === "raja_cmd") {
      if (userRole === "raja") {
        setAwaitingChoice(true);
      } else {
        setAiTyping(true);
        sched(() => {
          setAiTyping(false);
          addChat(rajaIdx, pickRand(pool.rajaCmd));
          sched(() => executeStepRef.current?.("mantri_resp"), 700);
        }, 900 + Math.random() * 400);
      }
    } else if (step === "mantri_resp") {
      if (userRole === "mantri") {
        setAwaitingChoice(true);
      } else {
        const wrong = Math.random() < 0.07;
        setAiTyping(true);
        sched(() => {
          setAiTyping(false);
          addChat(mantriIdx, wrong ? pool.mantriWrong : pickRand(pool.mantriOk));
          const nextHidden = (): DialogueStep => gameRef.current.sipaiFirst ? "sipai_hint" : "chor_msg";
          if (wrong) {
            gameRef.current.mantriAngry = true;
            setMantriAngryFlag(true);
            sched(() => {
              addChat(rajaIdx, pool.rajaAngry);
              sched(() => executeStepRef.current?.(nextHidden()), 900);
            }, 1000);
          } else {
            sched(() => executeStepRef.current?.(nextHidden()), 800);
          }
        }, 1000 + Math.random() * 500);
      }
    } else if (step === "sipai_hint") {
      if (userRole === "sipai") {
        setAwaitingChoice(true);
      } else {
        // Sipai: 60% helpful, 25% neutral, 15% misleading
        const roll = Math.random();
        const isHelpful = roll < 0.60;
        if (isHelpful) { gameRef.current.sipaiHelpful = true; setSipaiWasHelpful(true); }
        const sipaiMsg = getSipaiMsg(l);
        setAiTyping(true);
        sched(() => {
          setAiTyping(false);
          addChat(sipaiIdx, sipaiMsg);
          const afterSipai: DialogueStep = gameRef.current.sipaiFirst ? "chor_msg" : "mantri_guess";
          sched(() => executeStepRef.current?.(afterSipai), 700);
        }, 1000 + Math.random() * 500);
      }
    } else if (step === "chor_msg") {
      if (userRole === "chor") {
        setAwaitingChoice(true);
      } else {
        // Chor: 70% misleading, 20% neutral, 10% helpful (bluff)
        const chorMsg = getChorMsg(l);
        setAiTyping(true);
        sched(() => {
          setAiTyping(false);
          addChat(chorIdx, chorMsg);
          sched(() => executeStepRef.current?.("mantri_guess"), 700);
        }, 1000 + Math.random() * 500);
      }
    } else if (step === "mantri_guess") {
      addChat(-1, pool.guessPrompt, true);
      if (userRole === "mantri") {
        setAwaitingChoice(true);
      } else {
        setAiTyping(true);
        // AI guess: 50% pure random, 50% logic-weighted by difficulty
        const useLogic = Math.random() < 0.5;
        const others = [0, 1, 2, 3].filter(i => i !== mantriIdx);
        let guessTarget: number;
        if (useLogic) {
          const logicProb = diff === "easy" ? 0.38 : diff === "medium" ? 0.62 : 0.80;
          guessTarget = Math.random() < logicProb
            ? chorIdx
            : pickRand(others.filter(i => i !== chorIdx));
        } else {
          guessTarget = pickRand(others);
        }
        const guessVariants = l === "HI"
          ? [`${pNames[guessTarget]}... इन्हें देखकर लग रहा है।`, `${pNames[guessTarget]}! हां, मुझे यकीन है।`, `${pNames[guessTarget]} पर शक है मुझे।`]
          : [`${pNames[guessTarget]}... lagta hai yehi hain.`, `${pNames[guessTarget]}! Haan, mujhe yakeen hai.`, `${pNames[guessTarget]} pe shak hai mujhe.`];
        sched(() => {
          setAiTyping(false);
          setGuessedPlayerId(guessTarget);
          const correct = guessTarget === chorIdx;
          setGuessCorrect(correct);
          addChat(mantriIdx, pickRand(guessVariants));
          const scores = calcScores(roles, correct, gameRef.current.mantriAngry, gameRef.current.sipaiHelpful);
          setRoundScores(scores);
          setTotalScores(prev => prev.map((v, i) => v + scores[i]));
          sched(() => { setRevealedRoles(true); setPhase("result"); }, 1400);
        }, 1800);
      }
    }
  }, []);

  useEffect(() => { executeStepRef.current = executeStep; }, [executeStep]);

  const handleChoice = useCallback((opt: ChoiceOpt) => {
    setAwaitingChoice(false);
    const roles = gameRef.current.playerRoles;
    const rajaIdx = roles.indexOf("raja");
    const step = dialogueStep;

    addChat(0, opt.text);

    if (step === "raja_cmd") {
      sched(() => executeStepRef.current?.("mantri_resp"), 700);
    } else if (step === "mantri_resp") {
      if (opt.isWrong) {
        gameRef.current.mantriAngry = true;
        setMantriAngryFlag(true);
        const l = gameRef.current.lang;
        const rajaAngryMsg = MSG_POOL[l].rajaAngry;
        sched(() => {
          addChat(rajaIdx, rajaAngryMsg);
          sched(() => executeStepRef.current?.("sipai_hint"), 900);
        }, 800);
      } else {
        sched(() => executeStepRef.current?.("sipai_hint"), 700);
      }
    } else if (step === "sipai_hint") {
      gameRef.current.sipaiHelpful = true;
      setSipaiWasHelpful(true);
      sched(() => executeStepRef.current?.("chor_msg"), 700);
    } else if (step === "chor_msg") {
      sched(() => executeStepRef.current?.("mantri_guess"), 700);
    }
  }, [dialogueStep]);

  const handleGuess = useCallback((targetIdx: number) => {
    setAwaitingChoice(false);
    const roles = gameRef.current.playerRoles;
    const chorIdx = roles.indexOf("chor");
    const correct = targetIdx === chorIdx;
    setGuessedPlayerId(targetIdx);
    setGuessCorrect(correct);
    audioManager.playSFX(correct ? "correct" : "wrong");
    addChat(0, correct ? `${playerNames[chorIdx]}! Pakad liya!` : `${playerNames[targetIdx]}... yahi hai chor!`);
    const scores = calcScores(roles, correct, gameRef.current.mantriAngry, gameRef.current.sipaiHelpful);
    setRoundScores(scores);
    setTotalScores(prev => prev.map((v, i) => v + scores[i]));
    sched(() => { setRevealedRoles(true); setPhase("result"); }, 900);
  }, [playerNames]);

  const beginDialogue = useCallback((roles: (Role | null)[]) => {
    gameRef.current.playerRoles = [...roles] as (Role | null)[];
    setChat([]);
    chatIdRef.current = 0;
    setDialogueStep(null);
    setAwaitingChoice(false);
    setGuessedPlayerId(null);
    setGuessCorrect(null);
    setSipaiWasHelpful(false);
    setMantriAngryFlag(false);
    setAiTyping(false);
    setRevealedRoles(false);
    setRoundScores([0, 0, 0, 0]);
    setPhase("dialogue");
    sched(() => executeStepRef.current?.("raja_cmd"), 600);
  }, []);

  const startRound = useCallback((roundNum: number, currentDiff: Difficulty, currentLang: string) => {
    clearTimers();
    gameRef.current.difficulty = currentDiff;
    gameRef.current.mantriAngry = false;
    gameRef.current.sipaiHelpful = false;
    gameRef.current.sipaiFirst = Math.random() < 0.5;
    gameRef.current.lang = currentLang as "EN" | "HI";

    const hidden = shuffleArr<Role>(["sipai", "chor"]);
    const newRoles: Role[] = ["raja", "mantri", ...hidden];
    gameRef.current.shuffledRoles = newRoles;
    gameRef.current.chitOwners = [null, null, null, null];
    gameRef.current.playerRoles = [null, null, null, null];

    setChitOwners([null, null, null, null]);
    setPlayerRoles([null, null, null, null]);
    setChat([]);
    setDialogueStep(null);
    setAwaitingChoice(false);
    setGuessedPlayerId(null);
    setGuessCorrect(null);
    setSipaiWasHelpful(false);
    setMantriAngryFlag(false);
    setAiTyping(false);
    setRevealedRoles(false);
    setRoundScores([0, 0, 0, 0]);
    chatIdRef.current = 0;
    setRound(roundNum);
    setPhase("picking");

    if (currentDiff === "hard") {
      sched(() => { pickAvailableChitForBot(1); }, 400);
      sched(() => { pickAvailableChitForBot(2); }, 750);
      sched(() => { pickAvailableChitForBot(3); }, 1050);
      sched(() => {
        const last = [0, 1, 2, 3].find(i => gameRef.current.chitOwners[i] === null);
        if (last !== undefined) assignChit(last, 0);
        sched(() => {
          setPhase("reveal");
          sched(() => beginDialogue([...gameRef.current.playerRoles]), 2200);
        }, 600);
      }, 1500);
    } else if (currentDiff === "medium") {
      sched(() => pickAvailableChitForBot(1), 800);
    }
  }, [assignChit, beginDialogue]);

  const startGame = useCallback(() => {
    setTotalScores([0, 0, 0, 0]);
    startRound(1, difficulty, lang);
  }, [difficulty, lang, startRound]);

  const handleChitPick = useCallback((chitIdx: number) => {
    if (phase !== "picking") return;
    if (gameRef.current.chitOwners[chitIdx] !== null) return;
    if (gameRef.current.playerRoles[0] !== null) return;
    audioManager.playSFX("dice");
    assignChit(chitIdx, 0);
    const botsLeft = [1, 2, 3].filter(b => gameRef.current.playerRoles[b] === null);
    const iv = difficulty === "easy" ? 1600 : 1100;
    botsLeft.forEach((b, i) => sched(() => pickAvailableChitForBot(b), (i + 1) * iv));
    const revealAt = (botsLeft.length + 1) * iv + 400;
    sched(() => {
      setPhase("reveal");
      audioManager.playSFX("reveal");
      sched(() => beginDialogue([...gameRef.current.playerRoles]), 2200);
    }, revealAt);
  }, [phase, difficulty, assignChit, beginDialogue]);

  const handleNextRound = useCallback(() => {
    const nextRound = round + 1;
    if (nextRound > TOTAL_ROUNDS) {
      setPhase("gameover");
    } else {
      startRound(nextRound, difficulty, lang);
    }
  }, [round, difficulty, lang, startRound]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const userRole = playerRoles[0];
  const mantriPlayerIdx = playerRoles.indexOf("mantri");
  const chorPlayerIdx = playerRoles.indexOf("chor");

  const visibleRole = (idx: number): Role | null => {
    const r = playerRoles[idx];
    if (!r) return null;
    if (phase === "result" || revealedRoles) return r;
    if ((r === "raja" || r === "mantri") && phase !== "picking") return r;
    if (idx === 0) return r;
    return null;
  };

  const renderBadge = (idx: number, showRole: Role | null) => (
    <div key={idx} className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300"
      style={{ border: `1.5px solid ${showRole ? ROLE_BORDER[showRole] : "rgba(255,255,255,0.1)"}`, background: showRole ? ROLE_BG[showRole] : "rgba(255,255,255,0.02)", minWidth: 68 }}>
      <div className="text-2xl">{idx === 0 ? "🧑" : "🤖"}</div>
      <div className={`chalk-font text-sm ${idx === 0 ? "text-yellow-200" : "text-gray-300"}`}>{playerNames[idx]}</div>
      {showRole
        ? <div className={`chalk-hand text-xs font-bold ${ROLE_COLOR[showRole]}`}>{roleLabel[showRole]}</div>
        : <div className="chalk-hand text-xs text-gray-600">?</div>}
    </div>
  );

  const RoundPip = () => (
    <div className="flex gap-1 items-center">
      {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: 8, height: 8,
            background: i < round - 1 ? "rgba(100,255,160,0.7)" : i === round - 1 ? "rgba(255,220,50,0.9)" : "rgba(255,255,255,0.12)",
            boxShadow: i === round - 1 ? "0 0 6px rgba(255,220,50,0.6)" : "none",
          }} />
      ))}
    </div>
  );

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div className="screen-fade-in flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{ui.back}</button>
        <h2 className="chalk-font text-2xl text-yellow-200 chalk-glow text-center leading-tight">Raja Mantri<br />Chor Sipai</h2>
        <div style={{ width: 72 }} />
      </div>
      <div className="flex gap-4 text-3xl justify-center">👑📜⚔️🦹</div>
      <div className="chalk-hand text-xs text-gray-500 text-center">{TOTAL_ROUNDS} {lang === "HI" ? "बाज़ियां • सबसे ज़्यादा points वाला जीतेगा!" : "rounds • highest total score wins!"}</div>
      <div className="chalk-border rounded-xl p-5 w-full flex flex-col gap-3">
        <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest text-center">{ui.difficulty}</p>
        {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`chalk-btn text-left px-4 py-2 ${difficulty === d ? d === "easy" ? "chalk-btn-green" : d === "medium" ? "chalk-btn-blue" : "chalk-btn-red" : "opacity-40 hover:opacity-70"}`}>
            <span className="chalk-font capitalize">{d}</span>
            <span className="chalk-hand text-xs ml-2 opacity-70">— {d === "easy" ? ui.diffEasyDesc : d === "medium" ? ui.diffMediumDesc : ui.diffHardDesc}</span>
          </button>
        ))}
      </div>
      <div className="chalk-border rounded-lg px-4 py-3 w-full text-sm chalk-hand text-gray-400 space-y-1">
        <div className="flex gap-2"><span className="text-yellow-300">👑 Raja</span><span>= 1000 pts</span></div>
        <div className="flex gap-2"><span className="text-blue-300">📜 Mantri</span><span>= 500 pts · Chor pakdo!</span></div>
        <div className="flex gap-2"><span className="text-green-300">⚔️ Sipai</span><span>= 100 pts + bonus</span></div>
        <div className="flex gap-2"><span className="text-red-400">🦹 Chor</span><span>= 0 pts · Bachke rehna!</span></div>
      </div>
      <div className="chalk-border rounded-lg px-4 py-2 w-full text-center chalk-hand text-gray-500 text-xs">
        🎮 Aap apne role ki taraf se khud bologe — dialogue choose karo!
      </div>
      <button onClick={startGame} className="chalk-btn chalk-btn-green text-2xl px-10 py-4 w-full">Khelo! 🎮</button>
    </div>
  );

  // ── PICKING ────────────────────────────────────────────────────────────────
  if (phase === "picking") {
    const userHasPicked = chitOwners.some((o) => o === 0);
    return (
      <div className="screen-fade-in flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between w-full">
          <button onClick={onBack} className="chalk-btn chalk-btn-blue text-sm px-3 py-1">{ui.back}</button>
          <div className="flex flex-col items-center gap-1">
            <h2 className="chalk-font text-2xl text-yellow-200 chalk-glow">{ui.round} {round}/{TOTAL_ROUNDS}</h2>
            <RoundPip />
          </div>
          <div style={{ width: 72 }} />
        </div>
        <div className="chalk-hand text-center text-base min-h-7">
          {!userHasPicked && difficulty !== "hard"
            ? <span className="text-yellow-300 chalk-font text-xl">{ui.chooseChit}</span>
            : <span className="text-gray-400 animate-pulse">{ui.botsPicking}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {[0, 1, 2, 3].map(chitIdx => {
            const owner = chitOwners[chitIdx];
            const isUser = owner === 0;
            const isTaken = owner !== null && owner !== 0;
            const canPick = owner === null && !userHasPicked && difficulty !== "hard";
            return (
              <button key={chitIdx} onClick={() => canPick && handleChitPick(chitIdx)} disabled={!canPick}
                className={`rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 ${canPick ? "hover:scale-105 active:scale-95" : ""}`}
                style={{
                  height: 120,
                  border: `2px solid ${isUser ? ROLE_BORDER[userRole!] : isTaken ? "rgba(255,255,255,0.12)" : canPick ? "rgba(255,240,150,0.55)" : "rgba(255,255,255,0.05)"}`,
                  background: isUser ? ROLE_BG[userRole!] : isTaken ? "rgba(255,255,255,0.03)" : canPick ? "rgba(255,240,150,0.06)" : "rgba(255,255,255,0.01)",
                  boxShadow: canPick ? "0 0 18px rgba(255,240,150,0.15)" : undefined,
                  cursor: canPick ? "pointer" : "default",
                }}>
                {isUser ? (
                  <><div className="text-3xl">🃏</div>
                    <div className={`chalk-font text-base ${ROLE_COLOR[userRole!]}`}>{roleLabel[userRole!]}</div>
                    <div className="chalk-hand text-xs text-gray-500">{ui.yourRole}</div></>
                ) : isTaken ? (
                  <><div className="text-2xl">🎴</div>
                    <div className="chalk-font text-sm text-gray-400">{ui.picked}</div>
                    <div className="chalk-hand text-xs text-gray-500">{playerNames[owner]}</div></>
                ) : (
                  <><div className="text-3xl">{canPick ? "🎴" : "🀄"}</div>
                    <div className={`chalk-hand text-xs ${canPick ? "text-yellow-400" : "text-gray-700"}`}>{canPick ? ui.available : "..."}</div></>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`chalk-hand text-xs ${playerRoles[i] ? "text-green-300" : "text-gray-600"}`}>
              {playerRoles[i] ? "✓" : "○"} {playerNames[i]}
            </div>
          ))}
        </div>
        {/* Mini live scoreboard */}
        {totalScores.some(s => s > 0) && (
          <div className="chalk-border rounded-lg px-4 py-2 w-full flex gap-3 justify-center flex-wrap">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="text-center px-2">
                <div className="chalk-hand text-xs text-gray-500">{playerNames[i]}</div>
                <div className="chalk-font text-base text-yellow-200">{totalScores[i]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── REVEAL ─────────────────────────────────────────────────────────────────
  if (phase === "reveal") return (
    <div className="screen-fade-in flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1">
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">{ui.revealTitle}</h2>
        <RoundPip />
      </div>
      <div className="flex gap-3 justify-center flex-wrap">{[0, 1, 2, 3].map(i => renderBadge(i, visibleRole(i)))}</div>
      <div className="chalk-border rounded-xl px-5 py-4 text-center w-full" style={{ borderColor: userRole ? ROLE_BORDER[userRole] : undefined }}>
        <p className="chalk-hand text-gray-500 text-xs uppercase tracking-widest mb-1">{ui.yourRole}</p>
        <p className={`chalk-font text-3xl ${userRole ? ROLE_COLOR[userRole] : "text-gray-400"} chalk-glow`}>{userRole ? roleLabel[userRole] : "..."}</p>
        <p className="chalk-hand text-xs text-gray-600 mt-1">{ROLE_POINTS[userRole ?? "chor"]} pts</p>
      </div>
      <p className="chalk-hand text-gray-500 text-sm animate-pulse text-center">Dialogue shuru ho raha hai...</p>
    </div>
  );

  // ── DIALOGUE ───────────────────────────────────────────────────────────────
  if (phase === "dialogue") {
    const isGuessStep = dialogueStep === "mantri_guess" && userRole === "mantri";
    const currentChoices = awaitingChoice && dialogueStep && !isGuessStep && userRole
      ? playerChoices[userRole] ?? []
      : [];

    return (
      <div className="screen-fade-in flex flex-col gap-3 px-3 py-4 max-w-md mx-auto w-full" style={{ minHeight: "100dvh" }}>
        {/* Header: badges + round indicator */}
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3].map(idx => {
              const vr = visibleRole(idx);
              return (
                <div key={idx} className="flex items-center gap-1 rounded-lg px-2 py-1"
                  style={{ border: `1px solid ${vr ? ROLE_BORDER[vr] : "rgba(255,255,255,0.07)"}`, background: vr ? ROLE_BG[vr] : "transparent", fontSize: "0.7rem" }}>
                  <span className={vr ? ROLE_COLOR[vr] : "text-gray-500"}>{playerNames[idx]}</span>
                  {vr && <span className={`chalk-hand ${ROLE_COLOR[vr]}`}>{roleLabel[vr]}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="chalk-hand text-xs text-gray-500">{ui.round} {round}/{TOTAL_ROUNDS}</span>
            <RoundPip />
          </div>
        </div>

        {mantriAngryFlag && (
          <span className="chalk-hand text-orange-400 text-xs animate-pulse text-center">😡 {ui.rajaAngryNote}</span>
        )}

        {/* Live mini scoreboard */}
        {totalScores.some(s => s > 0) && (
          <div className="flex gap-2 justify-center flex-wrap rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="text-center px-2">
                <div className="chalk-hand" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>{playerNames[i]}</div>
                <div className="chalk-font text-sm text-yellow-200">{totalScores[i]}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-56 pr-0.5">
          {chat.map(msg => {
            if (msg.isSystem) return (
              <div key={msg.id} className="text-center chalk-hand text-sm text-yellow-300 italic py-1">{msg.text}</div>
            );
            const role = visibleRole(msg.speakerIdx);
            const isUserMsg = msg.speakerIdx === 0;
            return (
              <div key={msg.id} className={`flex ${isUserMsg ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                  style={{
                    border: `1.5px solid ${role ? ROLE_BORDER[role] : "rgba(255,255,255,0.1)"}`,
                    background: role ? ROLE_BG[role] : "rgba(255,255,255,0.03)",
                  }}>
                  <div className={`chalk-font text-xs mb-0.5 ${role ? ROLE_COLOR[role] : "text-gray-400"}`}>
                    {isUserMsg ? "🧑" : "🤖"} {playerNames[msg.speakerIdx]}{role ? ` · ${roleLabel[role]}` : ""}
                  </div>
                  <div className="chalk-hand text-sm text-gray-200 leading-snug">{msg.text}</div>
                </div>
              </div>
            );
          })}
          {aiTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 chalk-hand text-sm text-gray-500 animate-pulse"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                ✍️ ...
              </div>
            </div>
          )}
        </div>

        {/* Choice panel */}
        {currentChoices.length > 0 && (
          <div className="screen-fade-in flex flex-col gap-2 mt-1">
            {dialogueStep && stepPrompt[dialogueStep] && (
              <p className="chalk-hand text-xs italic text-center" style={{ color: userRole ? ROLE_BORDER[userRole] : "rgba(255,255,255,0.4)" }}>
                {stepPrompt[dialogueStep]}
              </p>
            )}
            {currentChoices.map((opt, i) => (
              <button key={i} onClick={() => handleChoice(opt)}
                className={`chalk-btn text-left px-4 py-3 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${opt.isWrong ? "chalk-btn-red opacity-80" : ""}`}
                style={{ borderColor: opt.isWrong ? "rgba(255,80,80,0.55)" : userRole ? ROLE_BORDER[userRole] : undefined }}>
                <span className="chalk-hand leading-snug">{opt.text}</span>
                {opt.isWrong && <span className="text-xs ml-2 text-red-400 opacity-60">(⚠️ risky!)</span>}
              </button>
            ))}
          </div>
        )}

        {/* Mantri guess buttons */}
        {isGuessStep && (
          <div className="screen-fade-in flex flex-col gap-3 mt-1">
            <p className="chalk-hand text-sm text-yellow-300 text-center italic">{stepPrompt["mantri_guess"]}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {[0, 1, 2, 3].filter(i => i !== mantriPlayerIdx).map(idx => (
                <button key={idx} onClick={() => handleGuess(idx)}
                  className="chalk-btn chalk-btn-red flex flex-col items-center gap-1 px-5 py-3 hover:scale-105 active:scale-95">
                  <span className="text-xl">{idx === 0 ? "🧑" : "🤖"}</span>
                  <span className="chalk-font text-base">{playerNames[idx]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!awaitingChoice && !aiTyping && !isGuessStep && (
          <p className="chalk-hand text-xs text-gray-700 text-center animate-pulse">Sabka jawab sun lo...</p>
        )}
      </div>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const isLastRound = round >= TOTAL_ROUNDS;
    return (
      <div className="screen-fade-in flex flex-col items-center gap-4 px-4 py-6 max-w-md mx-auto">
        <div className="flex flex-col items-center gap-1">
          <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow">
            {guessCorrect ? "🎉 Pakad liya!" : "😅 Chor bhaag gaya!"}
          </h2>
          <RoundPip />
        </div>

        <div className="chalk-border rounded-xl px-5 py-3 w-full text-center"
          style={{ borderColor: guessCorrect ? "rgba(100,255,160,0.5)" : "rgba(255,100,100,0.5)" }}>
          <p className={`chalk-font text-xl ${guessCorrect ? "text-green-300 chalk-glow-green" : "text-red-400"}`}>
            {guessCorrect ? ui.correctGuess : ui.wrongGuess}
          </p>
          {sipaiWasHelpful && guessCorrect && <p className="chalk-hand text-xs text-green-400 mt-1">{ui.sipaiBonus}</p>}
          {mantriAngryFlag && <p className="chalk-hand text-xs text-orange-400 mt-1">{ui.rajaAngryNote}</p>}
          {guessedPlayerId !== null && (
            <p className="chalk-hand text-xs text-gray-500 mt-2">
              Mantri ne chuna: <strong>{playerNames[guessedPlayerId]}</strong> · Asli Chor: <strong>{chorPlayerIdx >= 0 ? playerNames[chorPlayerIdx] : "?"}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">{[0, 1, 2, 3].map(i => renderBadge(i, playerRoles[i]))}</div>

        <div className="chalk-border rounded-xl p-4 w-full">
          <p className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-3 text-center">{ui.roundScores}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {[0, 1, 2, 3].map(idx => {
              const r = playerRoles[idx];
              return (
                <div key={idx} className="flex flex-col items-center rounded-lg px-3 py-2 text-center"
                  style={{ border: `1.5px solid ${r ? ROLE_BORDER[r] : "rgba(255,255,255,0.1)"}`, background: r ? ROLE_BG[r] : "transparent", minWidth: 68 }}>
                  <div className="chalk-font text-sm text-gray-300">{playerNames[idx]}</div>
                  {r && <div className={`chalk-hand text-xs ${ROLE_COLOR[r]}`}>{roleLabel[r]}</div>}
                  <div className={`chalk-font text-2xl mt-1 ${roundScores[idx] > 0 ? "text-yellow-300" : "text-gray-600"}`}>+{roundScores[idx]}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chalk-border rounded-xl p-4 w-full">
          <p className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-3 text-center">{ui.totalScores}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            {[0, 1, 2, 3].map(idx => (
              <div key={idx} className="text-center px-3">
                <div className="chalk-hand text-xs text-gray-500">{playerNames[idx]}</div>
                <div className="chalk-font text-xl text-yellow-200">{totalScores[idx]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 w-full">
          {isLastRound ? (
            <button onClick={() => setPhase("gameover")} className="chalk-btn chalk-btn-green flex-1 text-lg py-3">
              {ui.gameOver}
            </button>
          ) : (
            <button onClick={handleNextRound} className="chalk-btn chalk-btn-green flex-1 text-lg py-3">
              {ui.nextRound} ({round + 1}/{TOTAL_ROUNDS})
            </button>
          )}
          <button onClick={() => { setTotalScores([0, 0, 0, 0]); setPhase("setup"); }} className="chalk-btn flex-1 text-lg py-3">{ui.playAgain}</button>
        </div>
      </div>
    );
  }

  // ── GAME OVER ───────────────────────────────────────────────────────────────
  if (phase === "gameover") {
    const maxScore = Math.max(...totalScores);
    const winnerIdx = totalScores.indexOf(maxScore);
    const isTie = totalScores.filter(s => s === maxScore).length > 1;
    const userWon = !isTie && winnerIdx === 0;
    const sortedIdxs = [0, 1, 2, 3].sort((a, b) => totalScores[b] - totalScores[a]);

    return (
      <div className="screen-fade-in flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto">
        <h2 className="chalk-font text-3xl text-yellow-200 chalk-glow text-center">{ui.gameOver}</h2>

        {/* Winner banner */}
        <div className="chalk-border rounded-2xl px-6 py-4 w-full text-center"
          style={{ borderColor: userWon ? "rgba(100,255,160,0.6)" : isTie ? "rgba(255,220,50,0.5)" : "rgba(100,200,255,0.5)", background: userWon ? "rgba(100,255,160,0.06)" : "rgba(255,220,50,0.04)" }}>
          {isTie ? (
            <p className="chalk-font text-2xl text-yellow-300">{ui.tieGame}</p>
          ) : (
            <>
              <p className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-1">{ui.winner}</p>
              <p className="text-4xl mb-1">{winnerIdx === 0 ? "🧑" : "🤖"}</p>
              <p className={`chalk-font text-2xl ${winnerIdx === 0 ? "text-green-300 chalk-glow-green" : "text-blue-300"}`}>
                {playerNames[winnerIdx]}
              </p>
              {userWon && <p className="chalk-hand text-sm text-green-400 mt-1">{ui.youWin}</p>}
              <p className="chalk-font text-xl text-yellow-200 mt-1">{maxScore} pts</p>
            </>
          )}
        </div>

        {/* Final scoreboard */}
        <div className="chalk-border rounded-xl p-4 w-full">
          <p className="chalk-hand text-xs text-gray-500 uppercase tracking-widest mb-3 text-center">{ui.finalScores}</p>
          <div className="flex flex-col gap-2">
            {sortedIdxs.map((idx, rank) => (
              <div key={idx} className="flex items-center justify-between rounded-lg px-4 py-2"
                style={{
                  background: rank === 0 ? "rgba(255,220,50,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${rank === 0 ? "rgba(255,220,50,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <span className="chalk-hand text-sm text-gray-500">{rank + 1}.</span>
                  <span className="text-lg">{idx === 0 ? "🧑" : "🤖"}</span>
                  <span className={`chalk-font text-sm ${idx === 0 ? "text-yellow-200" : "text-gray-300"}`}>{playerNames[idx]}</span>
                </div>
                <span className={`chalk-font text-xl ${rank === 0 ? "text-yellow-300" : "text-gray-400"}`}>{totalScores[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setTotalScores([0, 0, 0, 0]); setPhase("setup"); }}
          className="chalk-btn chalk-btn-green text-xl px-10 py-4 w-full">
          {ui.playAgainFull} 🎮
        </button>
      </div>
    );
  }

  return null;
}
