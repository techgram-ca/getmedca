"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_THEME_COLOR,
  PRESET_THEME_COLORS,
  contrastRatio,
  deriveTheme,
  normalizeHexColor,
  themeStyle,
} from "@getmed/core/theme";
import { Field, Input, cn } from "@getmed/ui";

/**
 * One colour picked here drives the pharmacy's entire public page: light tints
 * are that colour mixed toward white, dark shades are the same hue darkened,
 * and the greys are re-hued to match. White stays white everywhere.
 */
export function ThemeColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const active = normalizeHexColor(value) ?? DEFAULT_THEME_COLOR;
  const theme = useMemo(() => deriveTheme(active)!, [active]);
  const style = useMemo(() => themeStyle(active) as React.CSSProperties, [active]);

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-ink-900">Theme colour</p>
      <p className="mt-1 text-sm text-ink-500">
        Used on your public page only. Every other shade is worked out from it — white stays white.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESET_THEME_COLORS.map((p) => {
          const selected = p.hex === active;
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              aria-label={p.name}
              aria-pressed={selected}
              title={p.name}
              className={cn(
                "flex size-9 cursor-pointer items-center justify-center rounded-full border-2 transition-soft focus-ring",
                selected ? "border-ink-900 scale-110" : "border-transparent hover:scale-105",
              )}
              style={{ background: p.hex }}
            >
              {selected ? <Check className="size-4 text-white" strokeWidth={3} /> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Or pick your own" htmlFor="theme-color-swatch" className="w-auto">
          <input
            id="theme-color-swatch"
            type="color"
            value={active}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-16 cursor-pointer rounded-md border border-ink-200 bg-white p-1"
          />
        </Field>
        <Field label="Hex code" htmlFor="theme-color-hex" className="w-40">
          <Input
            id="theme-color-hex"
            value={value}
            maxLength={7}
            spellCheck={false}
            placeholder={DEFAULT_THEME_COLOR}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      </div>

      {theme.adjusted ? (
        <p className="mt-2 text-sm text-warning-500">
          That colour is too light for white button text, so buttons and links use {theme.primary} — the same colour,
          darkened just enough to stay readable. Your tints still come from the shade you picked.
        </p>
      ) : null}

      <ThemePreview style={style} primary={theme.primary} />
    </div>
  );
}

/**
 * The preview re-declares the brand variables on itself, so it renders with the
 * pharmacy's palette while the surrounding dashboard keeps GetMed's.
 */
function ThemePreview({ style, primary }: { style: React.CSSProperties; primary: string }) {
  return (
    <div style={style} className="mt-4 overflow-hidden rounded-xl border border-ink-200">
      <div className="bg-gradient-to-b from-brand-50 to-ink-50 px-5 py-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
          Open now · until 9:00 PM
        </span>
        <p className="mt-3 text-xl font-extrabold tracking-tight text-ink-950">Your pharmacy</p>
        <p className="mt-1 text-sm text-ink-500">This is how your public page will look.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex h-9 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white">
            Order prescription
          </span>
          <span className="inline-flex h-9 items-center rounded-full border-2 border-ink-200 bg-white px-5 text-sm font-semibold text-ink-700">
            Ask a pharmacist
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-white px-5 py-3">
        <div className="flex gap-1">
          {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((s) => (
            <span
              key={s}
              title={`brand-${s}`}
              className="size-5 rounded border border-ink-200"
              style={{ background: `var(--color-brand-${s})` }}
            />
          ))}
        </div>
        <span className="text-xs tabular-nums text-ink-500">
          {primary} · {contrastRatio(primary, "#ffffff").toFixed(1)}:1 on white
        </span>
      </div>
    </div>
  );
}
