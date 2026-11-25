type Kind = "success" | "error";
export interface ToastItem { id: number; kind: Kind; message: string }
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let next = 1;
const emit = (kind: Kind, message: string) => listeners.forEach((l) => l({ id: next++, kind, message }));

export const toast = { success: (m: string) => emit("success", m), error: (m: string) => emit("error", m) };
export function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
