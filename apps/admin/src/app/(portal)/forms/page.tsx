import { requireAdmin } from "@getmed/core/auth";
import { Alert, PageHeader } from "@getmed/ui";
import { FormFieldToggles } from "@/components/form-field-toggles";

export default async function FormsPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("form_field_config").select("*").order("applies_to").order("sort_order");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Order form fields" description="Toggle whether each field is required or optional. The field set is fixed." />
      <Alert tone="info" className="mb-6">Name, phone and delivery address are always required for orders and cannot be made optional. Changes apply immediately to the patient site.</Alert>
      <FormFieldToggles fields={data ?? []} />
    </div>
  );
}
