import Link from "next/link";
import { Button } from "@getmed/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950">We couldn&#39;t find that page</h1>
      <p className="mt-2 text-ink-500">The pharmacy or page you&#39;re looking for may have moved.</p>
      <Button asChild className="mt-6"><Link href="/">Back to home</Link></Button>
    </div>
  );
}
