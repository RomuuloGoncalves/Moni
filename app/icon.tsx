import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Mirrors <Logo variant="icon" />: pine coin (#0E5C4F) with a white minted rim and bar.
export default function Icon() {
  return new ImageResponse(
    (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11.5" fill="#0E5C4F" />
        <circle cx="12" cy="12" r="8.1" stroke="#ffffff" strokeWidth="1.4" />
        <path d="M8.6 12h6.8" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    size,
  );
}
