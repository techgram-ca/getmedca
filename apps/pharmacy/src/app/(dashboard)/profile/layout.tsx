import { PageHeader } from "@getmed/ui";
import { ProfileTabs } from "@/components/profile-tabs";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Your profile" description="This is what patients see on your public page." />
      <ProfileTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
