import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_STEPS,
  DEFAULT_THEME_COLOR,
  PRESET_THEME_COLORS,
  contrastRatio,
  deriveTheme,
  normalizeHexColor,
  themeStyle,
} from "./color.ts";

const isHex = (v: string) => /^#[0-9a-f]{6}$/.test(v);

test("hex input is normalised, and anything else is rejected", () => {
  assert.equal(normalizeHexColor("#2A9D8F"), "#2a9d8f");
  assert.equal(normalizeHexColor("2a9d8f"), "#2a9d8f");
  assert.equal(normalizeHexColor("  #ABC "), "#aabbcc");
  for (const bad of ["", "#12", "#1234567", "red", "rgb(1,2,3)", "#gggggg"]) {
    assert.equal(normalizeHexColor(bad), null, `${bad} should be rejected`);
  }
  assert.equal(deriveTheme("not a colour"), null);
});

test("a dark enough pick is used verbatim as the primary", () => {
  const t = deriveTheme(DEFAULT_THEME_COLOR)!;
  assert.equal(t.adjusted, false);
  assert.equal(t.primary, DEFAULT_THEME_COLOR);
  assert.equal(t.brand[600], DEFAULT_THEME_COLOR);
});

test("every step of every preset is a real hex colour", () => {
  for (const { hex } of PRESET_THEME_COLORS) {
    const t = deriveTheme(hex)!;
    assert.ok(t, `${hex} should derive`);
    for (const step of BRAND_STEPS) assert.ok(isHex(t.brand[step]), `${hex} step ${step} -> ${t.brand[step]}`);
    for (const shade of Object.values(t.ink)) assert.ok(isHex(shade));
  }
});

test("the scale runs light to dark without ever reaching white", () => {
  for (const { hex } of PRESET_THEME_COLORS) {
    const t = deriveTheme(hex)!;
    // 50 is the lightest tint; it must still be a tint, not plain white.
    assert.notEqual(t.brand[50], "#ffffff", `${hex}: step 50 washed out to white`);
    let previous = Infinity;
    for (const step of BRAND_STEPS) {
      const l = contrastRatio(t.brand[step], "#000000");
      assert.ok(l < previous, `${hex}: step ${step} is not darker than the step before it`);
      previous = l;
    }
  }
});

test("white button text stays readable on the primary, however light the pick", () => {
  const picks = [...PRESET_THEME_COLORS.map((p) => p.hex), "#ffe066", "#a7f3d0", "#fbcfe8", "#ffffff", "#f5f5f5"];
  for (const hex of picks) {
    const t = deriveTheme(hex)!;
    const ratio = contrastRatio(t.brand[600], "#ffffff");
    assert.ok(ratio >= 2.99, `${hex}: white on primary is only ${ratio.toFixed(2)}:1`);
  }
});

test("a pick too light for white text is darkened and flagged", () => {
  const pale = deriveTheme("#ffe066")!;
  assert.equal(pale.adjusted, true);
  assert.equal(pale.chosen, "#ffe066");
  assert.notEqual(pale.primary, "#ffe066");

  const dark = deriveTheme("#1e40af")!;
  assert.equal(dark.adjusted, false);
});

test("dark text on the lightest tints stays readable", () => {
  for (const { hex } of PRESET_THEME_COLORS) {
    const t = deriveTheme(hex)!;
    // Button `secondary` is brand-800 on brand-100.
    assert.ok(contrastRatio(t.brand[800], t.brand[100]) >= 4.5, `${hex}: brand-800 on brand-100`);
    // brand-700 is used for links and hover text on white.
    assert.ok(contrastRatio(t.brand[700], "#ffffff") >= 4.5, `${hex}: brand-700 on white`);
  }
});

test("re-hueing the neutrals keeps GetMed's own text contrast", () => {
  // Only the hue is swapped, so every shade must read on white exactly as the
  // GetMed ladder it came from does.
  const reference = deriveTheme(DEFAULT_THEME_COLOR)!;
  for (const { hex } of PRESET_THEME_COLORS) {
    const t = deriveTheme(hex)!;
    for (const step of Object.keys(t.ink)) {
      const got = contrastRatio(t.ink[step]!, "#ffffff");
      const want = contrastRatio(reference.ink[step]!, "#ffffff");
      assert.ok(Math.abs(got - want) < 0.35, `${hex}: ink-${step} reads ${got.toFixed(2)}:1, GetMed ${want.toFixed(2)}:1`);
    }
  }
});

test("the palette follows the hue that was picked", () => {
  const violet = deriveTheme("#7c3aed")!;
  const orange = deriveTheme("#ea580c")!;
  assert.notEqual(violet.brand[100], orange.brand[100]);
  assert.notEqual(violet.ink["200"], orange.ink["200"]);
});

test("themeStyle emits the variables the page overrides, and nothing for junk", () => {
  const vars = themeStyle("#7c3aed");
  assert.equal(vars["--color-brand-600"], deriveTheme("#7c3aed")!.primary);
  assert.equal(vars["--color-brand-50"] !== undefined, true);
  assert.equal(vars["--color-ink-950"] !== undefined, true);
  assert.ok(vars["--shadow-card"]!.includes("rgb("));
  assert.equal(vars["--shadow-brand"], undefined);
  // White is never redefined: white surfaces and white text stay white.
  assert.equal(vars["--color-white"], undefined);
  assert.deepEqual(themeStyle("nope"), {});
});
