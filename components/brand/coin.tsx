import type { SVGProps } from "react";

/** The Moni coin: a solid disc with a fine concentric rim, like a minted edge. */
export function CoinMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <circle cx="12" cy="12" r="8.1" stroke="var(--background, #fff)" strokeWidth="1.3" opacity="0.9" />
      <path d="M8.6 12h6.8" stroke="var(--background, #fff)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
