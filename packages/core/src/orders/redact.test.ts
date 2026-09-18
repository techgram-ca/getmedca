import { test } from "node:test";
import assert from "node:assert/strict";
import { redactForAdmin } from "./redact.ts";

test("admin projection strips PHI", () => {
  const full = {
    id: "o1", pharmacy_id: "p1", order_type: "new", status: "pending",
    patient_name: "Jane", patient_phone: "+14165551234", patient_dob: "1990-01-01",
    delivery_address_line: "1 Main St", delivery_city: "Toronto", delivery_postal_code: "M5V",
    prescription_file_path: "secret/rx.pdf", insurance_member_id: "123", health_card_number: "999",
    consent_given_at: "now", created_at: "now", updated_at: "now",
  } as never;
  const r = redactForAdmin(full) as Record<string, unknown>;
  assert.equal(r.patient_name, "Jane");
  assert.equal("patient_dob" in r, false);
  assert.equal("prescription_file_path" in r, false);
  assert.equal("insurance_member_id" in r, false);
  assert.equal("health_card_number" in r, false);
  assert.equal("delivery_address_line" in r, false);
});
