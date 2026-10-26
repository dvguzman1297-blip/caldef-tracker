import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const m = manifest();

describe("web app manifest", () => {
  it("is installable: standalone display, start URL, 192 and 512 icons", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("has a maskable icon so Android can crop it", () => {
    expect((m.icons ?? []).some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("shortcuts point at actions the dashboard understands", () => {
    const urls = (m.shortcuts ?? []).map((s) => s.url);
    expect(urls).toEqual(["/?action=log-meal", "/?action=log-weight", "/?action=fasting"]);
  });

  it("every icon URL is served by the /icons route", () => {
    const urls = [...(m.icons ?? []), ...(m.shortcuts ?? []).flatMap((s) => s.icons ?? [])].map((i) => i.src);
    expect(urls.every((u) => /^\/icons\/(180|192|512)(\?maskable=1)?$/.test(u))).toBe(true);
  });
});
