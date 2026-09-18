import { requireDriver } from "@getmed/core/auth";
import { Avatar } from "@getmed/ui";

export default async function DriversPage() {
  const { driver, db } = await requireDriver();
  const { data } = await db.from("drivers").select("id, name, phone, vehicle_make, vehicle_model, vehicle_color").eq("active", true).order("name");
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Drivers</h1>
      <p className="mb-3 text-sm text-ink-600">Other active drivers you can hand deliveries to.</p>
      <ul className="surface divide-y divide-ink-100">
        {(data ?? []).map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={d.name} size={40} />
            <div className="min-w-0 flex-1"><p className="font-medium">{d.name}{d.id === driver.id ? <span className="ml-1 text-xs text-ink-400">(you)</span> : null}</p><p className="text-xs text-ink-500">{[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "—"}</p></div>
            {d.id !== driver.id ? <a href={`tel:${d.phone}`} className="text-sm font-medium text-brand-700">Call</a> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
