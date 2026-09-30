import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_DEFAULTS } from "./defaults.ts";
import { renderTemplate, validateTemplate } from "./render.ts";

test("renders placeholders and dashes for missing", () => {
  assert.equal(renderTemplate("Hi {a} {b}", { a: "x" }), "Hi x —");
});

test("rejects templates missing required placeholders", () => {
  const r = validateTemplate("order.rejected", "Order was rejected");
  assert.equal(r.ok, false);
});

test("rejects unknown placeholders", () => {
  const r = validateTemplate("order.new", "Order {orderId} {foo}");
  assert.equal(r.ok, false);
});

test("accepts valid template", () => {
  assert.deepEqual(validateTemplate("order.new", "Order {orderId} from {patientName}"), { ok: true });
});

test("otp template is not editable", () => {
  assert.equal(validateTemplate("otp", "Code {otpCode}").ok, false);
});

test("the response window comes from the order, not from a hardcoded 30", () => {
  const template = TEMPLATE_DEFAULTS["order.new"].sms!.text;
  assert.match(template, /\{slaMinutes\}/, "the default must not hardcode a number");
  assert.match(renderTemplate(template, { orderId: "AB12", slaMinutes: 20 }), /within 20 minutes/);
  assert.match(renderTemplate(template, { orderId: "AB12", slaMinutes: 45 }), /within 45 minutes/);
});

test("slaMinutes is an accepted placeholder on both SLA templates", () => {
  // validateTemplate rejects unknown placeholders, so the admin could not have
  // used {slaMinutes} until it was declared on the event.
  assert.deepEqual(validateTemplate("order.new", "Order {orderId} — respond within {slaMinutes} min"), { ok: true });
  assert.deepEqual(
    validateTemplate("order.timed_out", "Order {orderId} for {patientPhone} sat {slaMinutes} min"),
    { ok: true },
  );
});
