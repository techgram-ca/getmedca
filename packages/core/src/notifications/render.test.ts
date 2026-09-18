import { test } from "node:test";
import assert from "node:assert/strict";
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
