import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * Generates the Apple Touch Icon (180×180) dynamically.
 * Uses Next.js ImageResponse to render a styled SVG as PNG.
 */
export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          background: "#0a0a0f",
          borderRadius: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22 4 L18 4 L8 26 L12 28 Z"
            fill="#1a1a24"
            stroke="#2a2a3a"
            strokeWidth="0.5"
          />
          <path
            d="M22 4 L12 28"
            stroke="#00ffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="11" y="22" width="10" height="2" rx="1" fill="#2a2a3a" />
          <path
            d="M14 24 L13 30 L17 30 L16 24"
            fill="#1a1a24"
            stroke="#2a2a3a"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
