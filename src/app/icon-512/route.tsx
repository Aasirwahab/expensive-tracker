import { ImageResponse } from "next/og";

// 512×512 app icon, generated. Full-bleed green so it doubles as a maskable icon.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E7C4A",
          color: "#ffffff",
          fontSize: 230,
          fontWeight: 800,
          letterSpacing: -10,
        }}
      >
        SL
      </div>
    ),
    { width: 512, height: 512 },
  );
}
