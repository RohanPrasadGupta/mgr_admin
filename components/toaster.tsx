"use client";
import { useEffect, useState } from "react";
import { subscribe, type ToastItem } from "@/lib/toast";
import { cx } from "./ui";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribe((t) => {
    setItems((s) => [...s.slice(-3), t]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), t.kind === "error" ? 7000 : 4000);
  }), []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={cx("fade-in pointer-events-auto rounded-xl border bg-card px-4 py-3 text-sm shadow-lg", t.kind === "error" ? "border-expense/50 text-expense" : "border-income/50")}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
