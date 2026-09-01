import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "Stride guitar practice tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4", color: "#1c1917", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", width: 980, alignItems: "center", gap: 56 }}>
        <div style={{ width: 180, height: 180, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#1c1917", color: "#fafaf9", fontSize: 88, fontWeight: 700 }}>S</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 74, fontWeight: 700, letterSpacing: -3 }}>{siteConfig.name}</div>
          <div style={{ marginTop: 18, maxWidth: 720, fontSize: 34, lineHeight: 1.25, color: "#57534e" }}>Pick up every song exactly where you left off.</div>
        </div>
      </div>
    </div>,
    size,
  );
}
