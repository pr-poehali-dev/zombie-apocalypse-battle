const IMG = "https://cdn.poehali.dev/projects/5be54ed1-a7a9-40fa-a808-f245193e3bf9/files/06aa99d3-bc7a-4b6c-a422-aa98306b3767.jpg";

export default function Burlak() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c12",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Montserrat', sans-serif",
      padding: "32px 16px",
    }}>
      {/* Заголовок */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: 8, color: "#4a8fff", marginBottom: 12, textTransform: "uppercase" }}>
          Снегоход
        </div>
        <h1 style={{
          fontSize: "clamp(42px, 8vw, 80px)",
          fontFamily: "'Bebas Neue', sans-serif",
          color: "#fff",
          letterSpacing: 6,
          margin: 0,
          lineHeight: 1,
          textShadow: "0 0 60px rgba(74,143,255,0.4)",
        }}>
          БУРЛАК
        </h1>
        <div style={{ width: 60, height: 2, background: "linear-gradient(90deg, transparent, #4a8fff, transparent)", margin: "16px auto 0" }} />
      </div>

      {/* Фото */}
      <div style={{
        position: "relative",
        maxWidth: 860,
        width: "100%",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 0 80px rgba(74,143,255,0.25), 0 40px 80px rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        <img
          src={IMG}
          alt="Снегоход Бурлак"
          style={{ width: "100%", display: "block", objectFit: "cover" }}
        />

        {/* Нижний градиент */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(8,12,18,0.7) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        {/* Бейдж */}
        <div style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "10px 18px",
        }}>
          <div style={{ fontSize: 11, color: "#4a8fff", letterSpacing: 3, marginBottom: 2 }}>MADE IN RUSSIA</div>
          <div style={{ fontSize: 16, color: "#fff", fontFamily: "'Bebas Neue'", letterSpacing: 2 }}>BURLAK SNOWMOBILE</div>
        </div>
      </div>

      {/* Характеристики */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        maxWidth: 860,
        width: "100%",
        marginTop: 28,
      }}>
        {[
          { val: "500+", label: "лошадиных сил" },
          { val: "∞", label: "проходимость" },
          { val: "—60°C", label: "рабочая темп." },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "20px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, color: "#4a8fff", fontFamily: "'Bebas Neue'", letterSpacing: 2 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4, letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Подпись */}
      <p style={{ marginTop: 36, fontSize: 13, color: "#333", maxWidth: 500, textAlign: "center", lineHeight: 1.8 }}>
        Бурлак — российский вездеход-снегоход для экстремальных условий Арктики и Сибири.
        Создан для тех, кому нет преград.
      </p>
    </div>
  );
}
