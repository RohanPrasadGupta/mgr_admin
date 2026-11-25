import { describe, expect, it } from "vitest";
import { ago, bytes } from "./format";
import { cellText, columnLabel, columnsFor } from "./support-table";

describe("support data table", () => {
  it("hides ids and bookkeeping columns, keeps first-seen order", () => {
    expect(columnsFor([{ id: "x", userId: "u", accountId: "a", occurredOn: "2026-11-01", amountMinor: 1, deletedAt: null }, { note: "n" }])).toEqual(["occurredOn", "amountMinor", "note"]);
  });
  it("labels and formats cells", () => {
    expect(columnLabel("baseAmountMinor")).toBe("Base amount");
    expect(cellText({ amountMinor: -12345, currency: "USD" }, "amountMinor", "THB")).toBe("−$123.45");
    expect(cellText({ baseAmountMinor: 500, currency: "USD" }, "baseAmountMinor", "THB")).toMatch(/^THB\s5\.00$/);
    expect(cellText({ archived: false }, "archived", "THB")).toBe("No");
    expect(cellText({ note: null }, "note", "THB")).toBe("—");
    expect(cellText({ tags: ["a", "b"] }, "tags", "THB")).toBe('["a","b"]');
    expect(cellText({ quantityMinor: 5, currency: "GOLD-g" }, "quantityMinor", "THB")).toBe("GOLD-g 0.05"); // non-ISO code doesn't throw
  });
});

describe("format", () => {
  it("relative times and sizes", () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    expect(ago(null, now)).toBe("never");
    expect(ago("2026-11-25T11:59:30Z", now)).toBe("just now");
    expect(ago("2026-11-25T09:00:00Z", now)).toBe("3 hours ago");
    expect(ago("2026-11-24T12:00:00Z", now)).toBe("1 day ago");
    expect(bytes(512)).toBe("512 B");
    expect(bytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
