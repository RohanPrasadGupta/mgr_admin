import { formatMoney } from "./money";

/** Internal bookkeeping columns that mean nothing to a support agent. */
const HIDDEN = new Set(["id", "userId", "deletedAt", "updatedAt", "icon", "color", "sortOrder", "version", "clientId"]);
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Column keys to show for a set of rows: union of scalar keys in first-seen order, minus ids and bookkeeping. */
export function columnsFor(rows: Record<string, unknown>[]): string[] {
  const seen: string[] = [];
  for (const r of rows.slice(0, 50)) for (const k of Object.keys(r)) if (!seen.includes(k) && !HIDDEN.has(k) && !k.endsWith("Id")) seen.push(k);
  return seen;
}

/** "amountMinor" → "Amount", "occurredOn" → "Occurred on". */
export function columnLabel(key: string): string {
  const k = key.replace(/Minor$/, "");
  const words = k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Renders one cell: *Minor numbers as money in the row's currency (or the user's base currency), dates readable, objects as JSON. */
export function cellText(row: Record<string, unknown>, key: string, baseCurrency: string): string {
  const v = row[key];
  if (v === null || v === undefined || v === "") return "—";
  if (key.endsWith("Minor") && typeof v === "number") {
    const cur = key.startsWith("base") ? baseCurrency : typeof row.currency === "string" ? row.currency : baseCurrency;
    return formatMoney(v, cur);
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && ISO_DATE_TIME.test(v)) { const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); }
  if (typeof v === "object") { const s = JSON.stringify(v); return s.length > 80 ? `${s.slice(0, 77)}…` : s; }
  return String(v);
}
