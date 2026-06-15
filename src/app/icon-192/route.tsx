import { ImageResponse } from "next/og";

// 192×192 app icon, generated (no binary asset needed). Full-bleed green so it
// also works as a maskable icon.
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
          fontSize: 86,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        SL
      </div>
    ),
    { width: 192, height: 192 },
  );
}
