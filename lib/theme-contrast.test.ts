import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, over, parseHex } from "./contrast";

// Reads the real design tokens so the audit can't drift from the stylesheet.
const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const block = (sel: string) => {
  const start = css.indexOf(`${sel} {`);
  return css.slice(start, css.indexOf("\n}", start));
};
const tokens = (sel: string) => {
  const t: Record<string, string> = {};
  for (const m of block(sel).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\b/g)) t[m[1]] = m[2];
  return t;
};

const themes = { light: { ...tokens(":root") }, dark: { ...tokens(":root"), ...tokens(".dark") } };
const c = (t: Record<string, string>, fg: string, bg: string) => contrast(parseHex(t[fg]), parseHex(t[bg]));

describe.each(Object.entries(themes))("%s theme contrast", (_name, t) => {
  const surfaces = ["app-bg", "surface", "surface-2", "surface-inset"];

  it.each(surfaces)("body and secondary text on %s is at least 4.5:1", (bg) => {
    for (const fg of ["fg", "fg-muted", "fg-subtle", "accent-fg", "warn", "danger"]) {
      expect(c(t, fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("button text meets 4.5:1 on the accent and its hover state", () => {
    expect(c(t, "on-accent", "accent")).toBeGreaterThanOrEqual(4.5);
    expect(c(t, "on-accent", "accent-hover")).toBeGreaterThanOrEqual(4.5);
  });

  it("text sits on tinted fills at 4.5:1 (fills are translucent, so composite over the card)", () => {
    const soft = (k: string) => over(parseHex(t[k]), parseHex(t.surface));
    expect(contrast(parseHex(t.fg), soft("accent-soft"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parseHex(t.danger), soft("danger-soft"))).toBeGreaterThanOrEqual(4.5);
  });

  it("form control borders and focus ring are at least 3:1 (WCAG 1.4.11)", () => {
    for (const bg of ["surface", "surface-inset"]) {
      expect(c(t, "border-strong", bg), `border-strong on ${bg}`).toBeGreaterThanOrEqual(3);
      expect(c(t, "ring", bg), `ring on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("progress fills are at least 3:1 against their track and the card", () => {
    for (const fg of ["accent", "m-protein", "m-carbs", "m-fat", "m-fiber", "danger"]) {
      expect(c(t, fg, "track"), `${fg} on track`).toBeGreaterThanOrEqual(3);
      expect(c(t, fg, "surface"), `${fg} on surface`).toBeGreaterThanOrEqual(3);
    }
  });
});
