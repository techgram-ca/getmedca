import Link from "next/link";
import { PageHeader } from "@getmed/ui";
import { ProfileTabs } from "@/components/profile-tabs";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Your profile" description={<span>This is what patients see on your public page. <Link href={`${process.env.NEXT_PUBLIC_PATIENT_URL ?? ""}/p/`} className="hidden">Preview</Link></span>} />
      <ProfileTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
