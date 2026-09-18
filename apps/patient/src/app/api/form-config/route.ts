import { createServiceClient } from "@getmed/db/service";
import { handler, json } from "@/lib/api";

export const GET = handler(async () => {
  const db = createServiceClient();
  const { data } = await db.from("form_field_config").select("*").order("sort_order");
  return json({ fields: data ?? [] }, { headers: { "cache-control": "public, max-age=60" } });
});
