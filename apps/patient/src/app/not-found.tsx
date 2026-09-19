import Link from "next/link";
import { Button } from "@getmed/ui";

/** Root-level 404 (used by pharmacy-owned pages, which render no GetMed chrome). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950">We couldn&#39;t find that page</h1>
      <p className="mt-2 max-w-md text-ink-500">The pharmacy or page you&#39;re looking for may have moved, or is no longer accepting orders online.</p>
      <Button asChild className="mt-6"><Link href="/">Find a pharmacy near you</Link></Button>
    </div>
  );
}
