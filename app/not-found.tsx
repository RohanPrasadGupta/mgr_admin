import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-xl font-semibold">Page not found</h1><Link href="/" className="mt-3 inline-block text-primary underline">Back to the overview</Link></div>
    </main>
  );
}
