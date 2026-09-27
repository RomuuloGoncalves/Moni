import { cn } from "@/lib/utils";
import { CoinMark } from "./coin";

type LogoProps = {
  /** Font size in px of the wordmark (icon variant: square size). */
  size?: number;
  variant?: "full" | "icon";
  className?: string;
};

/**
 * Moni wordmark. The "o" is a coin drawn inline in SVG so it stays crisp and
 * inherits color from `currentColor` (defaults to the brand `--primary`).
 */
export function Logo({ size = 24, variant = "full", className }: LogoProps) {
  if (variant === "icon") {
    return (
      <CoinMark
        width={size}
        height={size}
        role="img"
        aria-label="Moni"
        className={cn("shrink-0 text-primary", className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="Moni"
      className={cn(
        "inline-flex items-baseline font-semibold tracking-[-0.045em] text-foreground select-none",
        className,
      )}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span aria-hidden="true">M</span>
      <CoinMark
        className="mx-[0.03em] self-baseline text-primary"
        style={{ width: "0.6em", height: "0.6em", transform: "translateY(0.02em)" }}
      />
      <span aria-hidden="true">ni</span>
    </span>
  );
}
