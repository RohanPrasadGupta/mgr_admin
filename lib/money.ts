const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);
export const minorUnit = (c: string) => (ZERO_DECIMAL.has(c) ? 0 : 2);

export function formatMoney(minor: number, currency: string) {
  const v = minor / 10 ** minorUnit(currency);
  try {
    const s = new Intl.NumberFormat("en", { style: "currency", currency }).format(Math.abs(v));
    return `${v < 0 ? "−" : ""}${s}`;
  } catch {
    return `${v < 0 ? "−" : ""}${currency} ${Math.abs(v).toFixed(minorUnit(currency))}`; // not an ISO code (custom assets)
  }
}
