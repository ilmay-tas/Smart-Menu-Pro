export interface CustomerThemeSettings {
  restaurantId?: number;
  menuThemePrimary?: string | null;
  menuThemeAccent?: string | null;
  menuThemeBackground?: string | null;
  menuThemeForeground?: string | null;
  menuThemeCard?: string | null;
}

function isValidHex(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);
}

function hexToHslTriplet(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
        break;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  return `${hue.toFixed(1)} ${Math.max(0, Math.min(100, saturation * 100)).toFixed(1)}% ${Math.max(0, Math.min(100, lightness * 100)).toFixed(1)}%`;
}

function contrastForeground(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "0 0% 10.2%" : "0 0% 100%";
}

const CUSTOMER_THEME_VAR_NAMES = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
] as const;

export function applyCustomerTheme(theme: CustomerThemeSettings | null | undefined): void {
  const root = document.documentElement;
  if (!theme) {
    clearCustomerTheme();
    return;
  }

  if (isValidHex(theme.menuThemePrimary)) {
    root.style.setProperty("--primary", hexToHslTriplet(theme.menuThemePrimary));
    root.style.setProperty("--primary-foreground", contrastForeground(theme.menuThemePrimary));
  }
  if (isValidHex(theme.menuThemeAccent)) {
    root.style.setProperty("--accent", hexToHslTriplet(theme.menuThemeAccent));
    root.style.setProperty("--accent-foreground", contrastForeground(theme.menuThemeAccent));
  }
  if (isValidHex(theme.menuThemeBackground)) {
    root.style.setProperty("--background", hexToHslTriplet(theme.menuThemeBackground));
    root.style.setProperty("--popover", hexToHslTriplet(theme.menuThemeBackground));
  }
  if (isValidHex(theme.menuThemeForeground)) {
    const foreground = hexToHslTriplet(theme.menuThemeForeground);
    root.style.setProperty("--foreground", foreground);
    root.style.setProperty("--popover-foreground", foreground);
  }
  if (isValidHex(theme.menuThemeCard)) {
    root.style.setProperty("--card", hexToHslTriplet(theme.menuThemeCard));
    root.style.setProperty("--card-foreground", contrastForeground(theme.menuThemeCard));
  }
}

export function clearCustomerTheme(): void {
  const root = document.documentElement;
  for (const varName of CUSTOMER_THEME_VAR_NAMES) {
    root.style.removeProperty(varName);
  }
}
