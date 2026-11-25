"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div><h1 className="text-xl font-semibold">Something went wrong</h1><button onClick={reset} className="mt-3 text-primary underline">Try again</button></div>
    </main>
  );
}
