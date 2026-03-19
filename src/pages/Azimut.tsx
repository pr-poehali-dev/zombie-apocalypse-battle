const IMG = "https://cdn.poehali.dev/projects/5be54ed1-a7a9-40fa-a808-f245193e3bf9/bucket/be295fd9-e60e-41ec-be15-991dedf1f108.jpg";

export default function Azimut() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "'Montserrat', sans-serif",
      color: "#fff",
    }}>
      {/* Hero */}
      <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
        <img
          src={IMG}
          alt="Снегоход Азимут"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
        />
        {/* Затемнение */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.15) 40%, rgba(10,10,10,1) 100%)" }} />
        {/* Оранжевый блик — под цвет снегохода */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 60%, rgba(255,100,0,0.08) 0%, transparent 60%)" }} />

        {/* Лейбл сверху */}
        <div style={{ position: "absolute", top: 32, left: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>СНЕГОХОД</div>
          <div style={{ fontSize: 13, color: "#ff6600", letterSpacing: 3, fontWeight: 600 }}>БУРЛАК</div>
        </div>

        {/* Бейдж — новинка */}
        <div style={{
          position: "absolute", top: 32, right: 32,
          background: "linear-gradient(135deg, #ff6600, #ff3300)",
          borderRadius: 8, padding: "6px 14px",
          fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#fff",
          boxShadow: "0 0 20px rgba(255,100,0,0.4)",
        }}>
          NEW
        </div>

        {/* Текст поверх фото снизу */}
        <div style={{ position: "absolute", bottom: 60, left: 32, right: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#ff6600", marginBottom: 8 }}>МОДЕЛЬ 600</div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(56px, 12vw, 110px)",
            margin: 0, lineHeight: 0.9, letterSpacing: 4,
            color: "#fff",
            textShadow: "0 0 80px rgba(255,100,0,0.3)",
          }}>
            АЗИМУТ
          </h1>
        </div>
      </div>

      {/* Контент */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Статы */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, marginBottom: 60 }}>
          {[
            { val: "600", unit: "куб. см", label: "Объём двигателя" },
            { val: "55", unit: "л.с.", label: "Мощность" },
            { val: "—45°C", unit: "", label: "Мороз не страшен" },
            { val: "500", unit: "кг", label: "Грузоподъёмность" },
          ].map((s, i) => (
            <div key={i} style={{
              background: i === 0 ? "linear-gradient(135deg, rgba(255,100,0,0.15), rgba(255,50,0,0.05))" : "rgba(255,255,255,0.03)",
              border: `1px solid ${i === 0 ? "rgba(255,100,0,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 16,
              padding: "28px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, color: i === 0 ? "#ff6600" : "#fff", letterSpacing: 2, lineHeight: 1 }}>
                {s.val}<span style={{ fontSize: 18, color: "#666" }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 8, letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Описание */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 60, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#ff6600", marginBottom: 16 }}>О МОДЕЛИ</div>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, margin: "0 0 16px", color: "#fff" }}>
              ДЛЯ ЛЮБЫХ<br />УСЛОВИЙ
            </h2>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.9, margin: 0 }}>
              Бурлак Азимут 600 — надёжный снегоход для охоты, рыбалки и путешествий. Широкая гусеница обеспечивает уверенное движение по глубокому снегу и бездорожью.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🏔", text: "Проходимость в глубоком снегу" },
              { icon: "🔧", text: "Простое техническое обслуживание" },
              { icon: "🛡", text: "Прочная стальная рама" },
              { icon: "❄️", text: "Запуск в сильный мороз" },
              { icon: "🎨", text: "Яркий агрессивный дизайн" },
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12,
              }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: "#888" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Разделитель */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,100,0,0.3), transparent)", marginBottom: 60 }} />

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#444", marginBottom: 12 }}>ЦЕНА ПО ЗАПРОСУ</div>
          <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 48, letterSpacing: 4, margin: "0 0 32px", color: "#fff" }}>
            ЗАИНТЕРЕСОВАЛ?
          </h3>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:+7" style={{
              display: "inline-block",
              padding: "16px 40px",
              background: "linear-gradient(135deg, #ff6600, #ff3300)",
              borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 700, letterSpacing: 2,
              textDecoration: "none",
              boxShadow: "0 0 40px rgba(255,100,0,0.3)",
            }}>
              📞 ПОЗВОНИТЬ
            </a>
            <a href="https://t.me/" style={{
              display: "inline-block",
              padding: "16px 40px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,100,0,0.3)",
              borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 700, letterSpacing: 2,
              textDecoration: "none",
            }}>
              ✈️ TELEGRAM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
