import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"
export const alt = "HANDYO · Everything you need in Cox's Bazar"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Social preview card. English only: satori's default font has no Bangla glyphs. */
export default async function OpenGraphImage() {
  const icon = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", "brand", "icon-512.png"))).toString("base64")}`
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} width={112} height={112} alt="" />
          <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>HANDYO</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>Everything you need in Cox&apos;s Bazar</div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.78)" }}>Home services · Car & bike rental · Resorts · Dried fish & pickles</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>handyo.bd · Cox&apos;s Bazar · Dhaka</div>
      </div>
    ),
    { ...size },
  )
}
