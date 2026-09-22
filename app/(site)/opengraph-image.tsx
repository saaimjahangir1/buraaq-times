import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Buraaq Times — Journalism, Reimagined";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #080B12 0%, #0F1620 60%, #0A1A2A 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 28px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#22D3EE",
          }}
        >
          Journalism, Reimagined
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 96, fontWeight: 800 }}>
          <span>Buraaq</span>
          <span
            style={{
              marginLeft: 20,
              background: "linear-gradient(120deg, #2F6BFF, #22D3EE)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Times
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
