export const COLORS = {
  paper: "#F7F0DF",
  paperBright: "#FFFAF0",
  ink: "#17263D",
  inkSecondary: "#315475",
  cyan: "#12566D",
  danger: "#8C2525",
  warning: "#814000",
  success: "#176044",
  purple: "#62417A",
} as const;

function linearChannel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const rgb = hex.match(/[a-f\d]{2}/gi);
    if (!rgb || rgb.length !== 3) return 0;
    const [r = "00", g = "00", b = "00"] = rgb;
    return (
      0.2126 * linearChannel(Number.parseInt(r, 16)) +
      0.7152 * linearChannel(Number.parseInt(g, 16)) +
      0.0722 * linearChannel(Number.parseInt(b, 16))
    );
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
