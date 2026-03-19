import { useState, useEffect, useRef } from "react";
import { SCENES, Scene } from "@/data/elysiumStory";

const TYPING_SPEED = 22;

function useTypingEffect(lines: string[], active: boolean) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed([]);
    setCurrentLine(0);
    setCurrentChar(0);
    setDone(false);
  }, [lines]);

  useEffect(() => {
    if (!active || done) return;
    if (currentLine >= lines.length) { setDone(true); return; }

    const line = lines[currentLine];
    if (currentChar < line.length) {
      const t = setTimeout(() => {
        setDisplayed(prev => {
          const next = [...prev];
          next[currentLine] = (next[currentLine] || "") + line[currentChar];
          return next;
        });
        setCurrentChar(c => c + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(t);
    } else {
      setCurrentLine(l => l + 1);
      setCurrentChar(0);
    }
  }, [active, done, currentLine, currentChar, lines]);

  const skipAll = () => {
    setDisplayed(lines);
    setCurrentLine(lines.length);
    setDone(true);
  };

  return { displayed, done, skipAll };
}

function GlitchText({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ color, fontFamily: "monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>
      {text}
    </span>
  );
}

function ScanlineOverlay() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
    }} />
  );
}

function MemoryLog({ fragments }: { fragments: string[] }) {
  if (!fragments.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "12px 16px", maxWidth: 240, zIndex: 10,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: "#444", marginBottom: 8 }}>ФРАГМЕНТЫ ПАМЯТИ</div>
      {fragments.map((f, i) => (
        <div key={i} style={{ fontSize: 11, color: "#00ffe0", marginBottom: 4, lineHeight: 1.4 }}>
          ◈ {f}
        </div>
      ))}
    </div>
  );
}

export default function Elysium() {
  const [sceneId, setSceneId] = useState("start");
  const [memoryFragments, setMemoryFragments] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [fade, setFade] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scene: Scene = SCENES[sceneId];
  const { displayed, done, skipAll } = useTypingEffect(scene.text, !showIntro);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayed]);

  const goTo = (nextId: string, fragment?: string) => {
    if (fragment) setMemoryFragments(prev => [...prev, fragment]);
    setHistory(prev => [...prev, sceneId]);
    setFade(false);
    setTimeout(() => {
      setSceneId(nextId);
      setFade(true);
      window.scrollTo(0, 0);
    }, 400);
  };

  const goBack = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFade(false);
    setTimeout(() => { setSceneId(prev); setFade(true); }, 400);
  };

  if (showIntro) {
    return (
      <div style={{
        minHeight: "100vh", background: "#000", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "monospace", color: "#fff", padding: 24, textAlign: "center",
      }}>
        <ScanlineOverlay />
        <div style={{ fontSize: 9, letterSpacing: 6, color: "#333", marginBottom: 24 }}>
          ELYSIUM OS v.8.47.3 — ИНИЦИАЛИЗАЦИЯ
        </div>
        <h1 style={{
          fontSize: "clamp(48px, 12vw, 100px)",
          fontFamily: "monospace", fontWeight: 900,
          letterSpacing: 12, margin: "0 0 8px",
          color: "#00ffe0",
          textShadow: "0 0 60px rgba(0,255,224,0.4), 0 0 120px rgba(0,255,224,0.2)",
        }}>
          ЭЛИЗИУМ
        </h1>
        <div style={{ fontSize: 13, color: "#444", letterSpacing: 4, marginBottom: 48 }}>
          ИНТЕРАКТИВНАЯ ИСТОРИЯ
        </div>
        <p style={{ maxWidth: 480, fontSize: 14, color: "#555", lineHeight: 1.8, marginBottom: 48 }}>
          Человечество оцифровало сознание. Мир стал идеальным.
          Затем что-то пошло не так — и ты проснулся без памяти
          в разрушенном секторе сети.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setShowIntro(false)}
            style={{
              background: "transparent", border: "1px solid #00ffe0",
              color: "#00ffe0", padding: "16px 48px", fontSize: 14,
              letterSpacing: 4, cursor: "pointer", fontFamily: "monospace",
              borderRadius: 4,
              boxShadow: "0 0 20px rgba(0,255,224,0.2)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = "rgba(0,255,224,0.1)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(0,255,224,0.4)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,255,224,0.2)";
            }}
          >
            [ НАЧАТЬ ]
          </button>
          <div style={{ fontSize: 10, color: "#222", letterSpacing: 2 }}>
            3 КОНЦОВКИ · ФРАГМЕНТЫ ПАМЯТИ · МОРАЛЬНЫЙ ВЫБОР
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: scene.bgColor,
      fontFamily: "monospace",
      color: "#fff",
      transition: "background 1s ease",
    }}>
      <ScanlineOverlay />

      {/* Шапка */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 4 }}>ELYSIUM OS</div>
          <div style={{ fontSize: 13, color: scene.accentColor, letterSpacing: 2, marginTop: 2 }}>
            {scene.location}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <GlitchText text={scene.locationTag} color="#333" />
          {history.length > 0 && !scene.isEnding && (
            <button
              onClick={goBack}
              style={{
                background: "transparent", border: "1px solid #333",
                color: "#555", padding: "6px 12px", fontSize: 10,
                letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                borderRadius: 4,
              }}
            >
              ← НАЗАД
            </button>
          )}
        </div>
      </div>

      {/* Основной контент */}
      <div
        ref={scrollRef}
        style={{
          maxWidth: 700, margin: "0 auto",
          padding: "48px 24px 120px",
          opacity: fade ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* Индикатор локации */}
        <div style={{
          display: "inline-block",
          padding: "4px 12px",
          border: `1px solid ${scene.accentColor}33`,
          borderRadius: 4,
          marginBottom: 40,
          fontSize: 10, letterSpacing: 3,
          color: scene.accentColor,
        }}>
          ◈ {scene.location.toUpperCase()}
        </div>

        {/* Текст сцены */}
        <div style={{ marginBottom: 48 }}>
          {displayed.map((line, i) => {
            const isSystemLine = line.startsWith("Инициализация") || line.startsWith("Системная") || line.startsWith("СБРОС") || line.startsWith("ИНТЕГРАЦИЯ") || line.startsWith("━") || line.startsWith("КОНЦОВКА") || line.startsWith("СЕКРЕТНАЯ");
            const isMemoryLine = line.startsWith("Получен фрагмент") || line.startsWith("Ты получил");
            const isDialogue = line.startsWith("«") || line.includes("» —");
            return (
              <p key={i} style={{
                margin: "0 0 20px",
                lineHeight: 1.9,
                fontSize: isSystemLine ? 12 : 15,
                color: isSystemLine
                  ? scene.accentColor
                  : isMemoryLine
                    ? "#ffcc00"
                    : isDialogue
                      ? "#aaa"
                      : "#777",
                letterSpacing: isSystemLine ? 2 : 0.3,
                fontStyle: isDialogue ? "italic" : "normal",
                borderLeft: isMemoryLine ? "2px solid #ffcc00" : isSystemLine ? `2px solid ${scene.accentColor}` : "none",
                paddingLeft: (isMemoryLine || isSystemLine) ? 16 : 0,
              }}>
                {line}
              </p>
            );
          })}

          {/* Курсор */}
          {!done && (
            <span style={{
              display: "inline-block", width: 8, height: 16,
              background: scene.accentColor,
              animation: "blink 1s step-end infinite",
              verticalAlign: "middle",
            }} />
          )}
        </div>

        {/* Кнопки выборов */}
        {done && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scene.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => goTo(choice.next, choice.memoryFragment)}
                style={{
                  background: "transparent",
                  border: `1px solid ${scene.accentColor}44`,
                  color: scene.accentColor,
                  padding: "16px 24px",
                  fontSize: 13, letterSpacing: 1,
                  cursor: "pointer", fontFamily: "monospace",
                  borderRadius: 6,
                  textAlign: "left",
                  transition: "all 0.2s",
                  lineHeight: 1.5,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background = `${scene.accentColor}11`;
                  el.style.borderColor = scene.accentColor;
                  el.style.boxShadow = `0 0 20px ${scene.accentColor}22`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                  el.style.borderColor = `${scene.accentColor}44`;
                  el.style.boxShadow = "none";
                }}
              >
                <span style={{ color: "#333", marginRight: 12 }}>[{i + 1}]</span>
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Пропустить анимацию */}
        {!done && (
          <button
            onClick={skipAll}
            style={{
              background: "transparent", border: "none",
              color: "#333", fontSize: 11, letterSpacing: 2,
              cursor: "pointer", fontFamily: "monospace",
              marginTop: 8,
            }}
          >
            [ пробел / пропустить ]
          </button>
        )}
      </div>

      {/* Фрагменты памяти */}
      <MemoryLog fragments={memoryFragments} />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
