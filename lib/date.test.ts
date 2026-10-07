import { describe, expect, it } from "vitest";
import { addDays, dateLabel, dayOfMonth, formatDate, formatDay, isValidDate, isValidTimeZone, parseDateParam, todayIn, weekdayShort } from "./date";

describe("todayIn (timezone)", () => {
  it("Manila is already the next day for 16:00-23:59 UTC", () => {
    // 00:00-08:00 in Manila (UTC+8) is 16:00-24:00 UTC of the previous UTC day
    expect(todayIn("Asia/Manila", new Date("2026-10-06T15:59:59Z"))).toBe("2026-10-06"); // 23:59:59 Manila
    expect(todayIn("Asia/Manila", new Date("2026-10-06T16:00:00Z"))).toBe("2026-10-07"); // 00:00 Manila
    expect(todayIn("Asia/Manila", new Date("2026-10-06T23:59:00Z"))).toBe("2026-10-07"); // 07:59 Manila
    expect(todayIn("Asia/Manila", new Date("2026-10-07T00:00:00Z"))).toBe("2026-10-07"); // 08:00 Manila
  });
  it("UTC still reports the previous day in that window (the bug being fixed)", () => {
    expect(todayIn("UTC", new Date("2026-10-06T20:00:00Z"))).toBe("2026-10-06");
    expect(todayIn("Asia/Manila", new Date("2026-10-06T20:00:00Z"))).toBe("2026-10-07");
  });
  it("handles zones behind UTC", () => {
    expect(todayIn("America/Los_Angeles", new Date("2026-10-07T03:00:00Z"))).toBe("2026-10-06");
  });
  it("falls back to UTC for an invalid timezone", () => {
    expect(todayIn("Not/AZone", new Date("2026-10-06T20:00:00Z"))).toBe("2026-10-06");
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("Asia/Manila")).toBe(true);
  });
});

describe("formatting", () => {
  const today = "2026-10-07";
  it("formats as 'Wed, Oct 7' in the current year", () => {
    expect(formatDate("2026-10-07", today)).toBe("Wed, Oct 7");
    expect(formatDay("2026-10-07", today)).toBe("Oct 7");
  });
  it("adds the year when it isn't the current year", () => {
    expect(formatDate("2025-12-31", today)).toBe("Wed, Dec 31, 2025");
    expect(formatDay("2025-12-31", today)).toBe("Dec 31, 2025");
  });
  it("labels today and yesterday", () => {
    expect(dateLabel("2026-10-07", today)).toBe("Today, Oct 7");
    expect(dateLabel("2026-10-06", today)).toBe("Yesterday, Oct 6");
    expect(dateLabel("2026-10-05", today)).toBe("Mon, Oct 5");
  });
  it("gives weekday and day number for the week strip", () => {
    expect(weekdayShort("2026-10-06")).toBe("Tue");
    expect(dayOfMonth("2026-10-06")).toBe(6);
  });
});

describe("arithmetic and validation", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("validates real calendar dates", () => {
    expect(isValidDate("2026-02-31")).toBe(false);
    expect(isValidDate("2026-10-07")).toBe(true);
  });
  it("rejects future ?date= params", () => {
    expect(parseDateParam("2026-10-08", "2026-10-07")).toBe("2026-10-07");
    expect(parseDateParam("2026-10-01", "2026-10-07")).toBe("2026-10-01");
    expect(parseDateParam("nope", "2026-10-07")).toBe("2026-10-07");
  });
});
