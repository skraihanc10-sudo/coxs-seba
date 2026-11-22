import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const alt = "HANDYO · Home services at your door"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Social preview card. English only: satori's default font has no Bangla glyphs. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1f3a 0%, #0a3fb0 60%, #1259e8 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="72" height="72" viewBox="0 0 48 48">
              <path d="M14 23l10-9 10 9" fill="none" stroke="#1259e8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 23v-4h10v4" fill="none" stroke="#1259e8" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M10 31c3-3 6-3 9 0s6 3 9 0 6-3 9 0" fill="none" stroke="#1259e8" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>HANDYO</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>Home services at your door</div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.78)" }}>Verified workers · Prices up front · Cash, bKash or Nagad</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>handyo.bd · Cox&apos;s Bazar · Dhaka</div>
      </div>
    ),
    { ...size },
  )
}
