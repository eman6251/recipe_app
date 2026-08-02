import { ImageResponse } from "next/og";

// Generated at build time so there's no binary asset to keep in the repo.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1c",
          color: "#fbbf24",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
