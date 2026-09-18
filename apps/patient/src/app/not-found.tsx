import Link from "next/link";
import { Button } from "@getmed/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-semibold">We couldn't find that page</h1>
      <p className="mt-2 text-ink-600">The pharmacy or page you're looking for may have moved.</p>
      <Button asChild className="mt-6"><Link href="/">Back to home</Link></Button>
    </div>
  );
}
