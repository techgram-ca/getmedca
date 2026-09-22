/**
 * Derives a full brand palette from the single colour a pharmacy picks for its
 * public page. Everything runs in OKLab/OKLCh so tints stay perceptually even
 * instead of the muddy midpoints plain sRGB mixing produces.
 *
 * Light steps are the chosen colour mixed toward white — white itself is never
 * touched, so white surfaces and white button text stay white.
 */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Accepts `#abc`, `#aabbcc` or the bare forms; returns lowercase `#aabbcc`. */
export function normalizeHexColor(input: string): string | null {
  const v = input.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(v)) return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`;
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  return null;
}

function hexToRgb(hex: string): Rgb {
  const v = hex.replace(/^#/, "");
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** Björn Ottosson's OKLab transform. */
function rgbToOklab({ r, g, b }: Rgb) {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToRgb({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function hexToOklch(hex: string): Oklch {
  const { L, a, b } = rgbToOklab(hexToRgb(hex));
  return { l: L, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
}

function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  return oklabToRgb({ L: l, a: c * Math.cos(rad), b: c * Math.sin(rad) });
}

const inGamut = ({ r, g, b }: Rgb) => [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005);

/**
 * Not every (lightness, chroma, hue) triple exists in sRGB. Chroma is the only
 * thing we give up — lightness and hue carry the identity of the colour.
 */
function oklchToHex(colour: Oklch): string {
  if (inGamut(oklchToRgb(colour))) return rgbToHex(oklchToRgb(colour));
  let lo = 0;
  let hi = colour.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ ...colour, c: mid }))) lo = mid;
    else hi = mid;
  }
  return rgbToHex(oklchToRgb({ ...colour, c: lo }));
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio between two hex colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * White button text and white surfaces sit against the 600 step, so that step
 * has to stay legible. The bar is WCAG's 3:1 for user-interface components —
 * the same bar GetMed's own teal (#2a9d8f, 3.32:1) meets. Holding every pick to
 * the 4.5:1 body-text bar instead would force all of them several shades darker
 * than the pharmacy chose, GetMed's own included.
 *
 * A pick below the bar is darkened just enough; its hue and chroma survive, and
 * the shade originally picked still shows up higher on the scale.
 */
const WHITE = "#ffffff";
const MIN_CONTRAST_ON_WHITE = 3;

/** The lightest this hue can be and still clear `target`:1 against white. */
function lightnessForContrast(colour: Oklch, target: number): number {
  let lo = 0;
  let hi = colour.l;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(oklchToHex({ ...colour, l: mid }), WHITE) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

function darkenUntilReadable(base: Oklch): { colour: Oklch; adjusted: boolean } {
  if (contrastRatio(oklchToHex(base), WHITE) >= MIN_CONTRAST_ON_WHITE) return { colour: base, adjusted: false };
  return { colour: { ...base, l: lightnessForContrast(base, MIN_CONTRAST_ON_WHITE) }, adjusted: true };
}

export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type BrandStep = (typeof BRAND_STEPS)[number];
export type BrandScale = Record<BrandStep, string>;

/** How far each light step is mixed toward white. 600 is the chosen colour. */
const TINT: Partial<Record<BrandStep, number>> = { 50: 0.96, 100: 0.92, 200: 0.82, 300: 0.63, 400: 0.4, 500: 0.18 };
/**
 * How far each dark step drops in lightness, with a little chroma pulled out.
 * The ratios are relative to step 700, which is anchored separately: it carries
 * link and hover text on white, so it has to clear the 4.5:1 body-text bar even
 * when the pick itself is a pale gold. Anchoring the rest to 700 keeps the
 * scale ordered when that pulls 700 darker than its own multiplier would.
 */
const SHADE_700 = 0.88;
const SHADE: Partial<Record<BrandStep, { l: number; c: number }>> = {
  700: { l: 1, c: 1 },
  800: { l: 0.75 / SHADE_700, c: 0.95 },
  900: { l: 0.64 / SHADE_700, c: 0.88 },
  950: { l: 0.36 / SHADE_700, c: 0.6 },
};
/** brand-700 and darker carry text on white. */
const MIN_TEXT_CONTRAST = 4.5;

/** Mixes toward white in OKLab: pure white at `amount` 1, untouched at 0. */
function tintTowardWhite(base: Oklch, amount: number): Oklch {
  const white = hexToOklch(WHITE);
  return { l: base.l + (white.l - base.l) * amount, c: base.c * (1 - amount), h: base.h };
}

export type DerivedTheme = {
  /** The colour actually used as the primary, after the readability clamp. */
  primary: string;
  /** The hex the pharmacy picked, unchanged. */
  chosen: string;
  /** True when the pick was too light for white text and had to be darkened. */
  adjusted: boolean;
  brand: BrandScale;
  ink: Record<string, string>;
};

/**
 * The GetMed neutral ladder. Its lightness and chroma define the look of every
 * surface and every line of text; only the hue is swapped for the pharmacy's,
 * so a purple pharmacy gets faintly purple greys rather than GetMed's green ones.
 */
const GETMED_INK: Record<string, string> = {
  "50": "#f8fffe",
  "100": "#f0faf8",
  "200": "#e2efed",
  "300": "#c9dedb",
  "400": "#9ab3b0",
  "500": "#6b8280",
  "600": "#55706d",
  "700": "#45605d",
  "800": "#2c4442",
  "900": "#1a2f2c",
  "950": "#0d1f1c",
};

export function deriveTheme(chosenHex: string): DerivedTheme | null {
  const chosen = normalizeHexColor(chosenHex);
  if (!chosen) return null;

  const { colour: base, adjusted } = darkenUntilReadable(hexToOklch(chosen));
  const primary = oklchToHex(base);

  const anchor700 = Math.min(base.l * SHADE_700, lightnessForContrast(base, MIN_TEXT_CONTRAST));

  const brand = {} as BrandScale;
  for (const step of BRAND_STEPS) {
    if (step === 600) brand[step] = primary;
    else if (TINT[step] != null) brand[step] = oklchToHex(tintTowardWhite(base, TINT[step]!));
    else {
      const { l, c } = SHADE[step]!;
      brand[step] = oklchToHex({ l: anchor700 * l, c: base.c * c, h: base.h });
    }
  }

  const ink: Record<string, string> = {};
  for (const [step, hex] of Object.entries(GETMED_INK)) {
    const source = hexToOklch(hex);
    ink[step] = oklchToHex({ l: source.l, c: source.c, h: base.h });
  }

  return { primary, chosen, adjusted, brand, ink };
}

/** `rgb(r g b / alpha)` for the chosen colour — used by the derived shadows. */
function alpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  const to255 = (v: number) => Math.round(clamp01(v) * 255);
  return `rgb(${to255(r)} ${to255(g)} ${to255(b)} / ${a})`;
}

/**
 * CSS custom properties to put on the wrapper of a pharmacy-owned page. They
 * shadow the `@theme` tokens for that subtree only, so the rest of GetMed keeps
 * its own palette. `--color-white` is never among them: white surfaces and
 * white button text stay white.
 *
 * Shadows carry literal colours rather than a reference to `--color-brand-600`,
 * because a custom property that references another one is resolved where it is
 * *declared*, not where it is used. They reach the `surface` utility, which
 * reads `var(--shadow-card)` at runtime; Tailwind's own `shadow-*` utilities
 * bake their colour in at build time, so those are re-tinted at the call site
 * with a `shadow-brand-600/<alpha>` class instead.
 */
export function themeStyle(chosenHex: string): Record<string, string> {
  const theme = deriveTheme(chosenHex);
  if (!theme) return {};

  const vars: Record<string, string> = {};
  for (const [step, hex] of Object.entries(theme.brand)) vars[`--color-brand-${step}`] = hex;
  for (const [step, hex] of Object.entries(theme.ink)) vars[`--color-ink-${step}`] = hex;

  vars["--ring"] = theme.brand[600];
  vars["--border"] = theme.ink["200"]!;
  vars["--muted"] = theme.ink["500"]!;
  vars["--shadow-card"] = `0 1px 2px ${alpha(theme.ink["950"]!, 0.04)}, 0 6px 20px -8px ${alpha(theme.primary, 0.14)}`;
  vars["--shadow-pop"] = `0 12px 40px -12px ${alpha(theme.primary, 0.25)}`;
  vars["--shadow-hero"] = `0 32px 80px ${alpha(theme.primary, 0.15)}`;
  return vars;
}

/** Ready-made picks, so most pharmacies never have to type a hex code. */
export const PRESET_THEME_COLORS = [
  { hex: "#2a9d8f", name: "Teal" },
  { hex: "#0f766e", name: "Pine" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#1e40af", name: "Navy" },
  { hex: "#7c3aed", name: "Violet" },
  { hex: "#be185d", name: "Berry" },
  { hex: "#dc2626", name: "Red" },
  { hex: "#ea580c", name: "Orange" },
  { hex: "#ca8a04", name: "Gold" },
  { hex: "#16a34a", name: "Green" },
  { hex: "#0891b2", name: "Sky" },
  { hex: "#475569", name: "Slate" },
] as const;

/** The GetMed teal, used when a pharmacy has not picked anything. */
export const DEFAULT_THEME_COLOR = "#2a9d8f";
