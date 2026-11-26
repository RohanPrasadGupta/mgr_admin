/** Decimal places per ISO 4217 (most use 2). Keep in step with mgr_backend/packages/shared/src/money.ts. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "PYG", "XAF", "XOF", "XPF", "KMF", "DJF", "GNF", "RWF", "VUV", "BIF"]);
const THREE_DECIMAL = new Set(["BHD", "KWD", "OMR", "JOD", "TND", "LYD", "IQD"]);
export const minorUnit = (c: string) => (ZERO_DECIMAL.has(c) ? 0 : THREE_DECIMAL.has(c) ? 3 : 2);

export function formatMoney(minor: number, currency: string) {
  const v = minor / 10 ** minorUnit(currency);
  try {
    const s = new Intl.NumberFormat("en", { style: "currency", currency }).format(Math.abs(v));
    return `${v < 0 ? "−" : ""}${s}`;
  } catch {
    return `${v < 0 ? "−" : ""}${currency} ${Math.abs(v).toFixed(minorUnit(currency))}`; // not an ISO code (custom assets)
  }
}
