import { useState, useEffect } from "react";
import { audioManager } from "@/audioManager";

export default function AudioControls() {
  const [muted, setMuted] = useState(() => audioManager.isMuted);
  const [sfxVol, setSfxVol] = useState(() => audioManager.sfxVol);
  const [musicMuted, setMusicMuted] = useState(() => audioManager.isMusicMuted);
  const [musicVol, setMusicVol] = useState(() => audioManager.musicVol);
  const [open, setOpen] = useState(false);

  // Start background music on first interaction
  useEffect(() => {
    const startOnInteraction = () => {
      audioManager.startMusic();
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
    };
    window.addEventListener("pointerdown", startOnInteraction);
    window.addEventListener("keydown", startOnInteraction);
    return () => {
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
    };
  }, []);

  const handleMute = () => {
    const m = audioManager.toggleMute();
    setMuted(m);
  };

  const handleSfxVol = (v: number) => {
    audioManager.setSfxVol(v);
    setSfxVol(v);
  };

  const handleMusicMute = () => {
    const m = audioManager.toggleMusicMute();
    setMusicMuted(m);
    if (!m) audioManager.startMusic();
  };

  const handleMusicVol = (v: number) => {
    audioManager.setMusicVol(v);
    setMusicVol(v);
  };

  return (
    <div style={{ position: "fixed", bottom: "1rem", left: "1rem", zIndex: 100 }}>
      {open && (
        <div
          style={{
            background: "rgba(10,10,14,0.96)",
            border: "1.5px solid rgba(255,255,255,0.11)",
            borderRadius: 10,
            padding: "0.85rem 1rem",
            marginBottom: "0.5rem",
            minWidth: 180,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {/* SFX row */}
          <div
            className="chalk-hand"
            style={{
              fontSize: "0.62rem",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Sound Effects
          </div>
          <label
            className="chalk-hand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontSize: "0.95rem" }}>🔔</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVol}
              onChange={e => handleSfxVol(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "#fde68a", height: 3 }}
            />
          </label>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0.1rem 0 0.65rem" }} />

          {/* Music row */}
          <div
            className="chalk-hand"
            style={{
              fontSize: "0.62rem",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Background Music</span>
            <button
              onClick={handleMusicMute}
              title={musicMuted ? "Unmute music" : "Mute music"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                padding: "0 0.15rem",
                opacity: musicMuted ? 0.4 : 0.85,
                lineHeight: 1,
              }}
            >
              {musicMuted ? "🚫" : "🎵"}
            </button>
          </div>
          <label
            className="chalk-hand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span style={{ fontSize: "0.95rem" }}>🎶</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVol}
              onChange={e => handleMusicVol(parseFloat(e.target.value))}
              disabled={musicMuted}
              style={{
                flex: 1,
                accentColor: "#86efac",
                height: 3,
                opacity: musicMuted ? 0.35 : 1,
              }}
            />
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.35rem" }}>
        <button
          className="chalk-btn"
          onClick={handleMute}
          title={muted ? "Unmute SFX" : "Mute SFX"}
          style={{
            fontSize: "1rem",
            padding: "0.32rem 0.55rem",
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.14)",
            lineHeight: 1,
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>

        <button
          className="chalk-btn"
          onClick={() => setOpen(o => !o)}
          title="Sound settings"
          style={{
            fontSize: "0.78rem",
            padding: "0.32rem 0.45rem",
            background: open ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.14)",
            color: open ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
            lineHeight: 1,
          }}
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
