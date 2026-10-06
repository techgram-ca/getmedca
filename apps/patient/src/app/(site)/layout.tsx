import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getLaunchState } from "@/lib/launch";

/**
 * The launch state has to be read per request, not baked in at build time.
 * Prerendered, these pages would carry whichever state the build saw, and
 * launching would do nothing until the next deploy. The read is memoised for
 * the request, so a page costs one query for it however many times it asks.
 */
export const dynamic = "force-dynamic";

/**
 * GetMed-branded chrome. Pharmacy-owned pages live outside this group.
 *
 * Before launch the chrome is dropped entirely. Every link in it leads to
 * something that is not open yet, and a navigation bar whose every destination
 * turns you away reads worse than a page with no navigation at all.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { launched } = await getLaunchState();
  if (!launched) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </>
  );
}
