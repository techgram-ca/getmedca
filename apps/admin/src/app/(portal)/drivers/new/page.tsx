import { PageHeader } from "@getmed/ui";
import { DriverForm } from "@/components/driver-form";

export default function NewDriverPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New driver" description="Creates the driver's login. Share the initial password securely; they can change it in the driver app." />
      <DriverForm />
    </div>
  );
}
