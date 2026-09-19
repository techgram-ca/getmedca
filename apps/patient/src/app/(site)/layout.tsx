import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** GetMed-branded chrome. Pharmacy-owned pages live outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </>
  );
}
