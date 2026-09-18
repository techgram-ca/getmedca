import { createHmac, timingSafeEqual } from "node:crypto";
import type { ServiceClient } from "@getmed/db/service";
import type { OtpPurpose } from "@getmed/db/types";
import { AppError } from "../errors";
import { TEMPLATE_DEFAULTS } from "../notifications/defaults";
import { renderTemplate } from "../notifications/render";
import { sendSms } from "../notifications/send";
import { enforceRateLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string, phone: string): string {
  const secret = process.env.OTP_HASH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return String(n).padStart(6, "0");
}

export type SendOtpInput = {
  phone: string; // E.164
  purpose: OtpPurpose;
  targetId: string;
  turnstileToken?: string | null;
  ip?: string | null;
};

/**
 * Issue and send an OTP. Protected by Turnstile + per-phone and per-IP rate
 * limits. The code is stored only as an HMAC.
 */
export async function sendOtp(db: ServiceClient, input: SendOtpInput): Promise<{ expiresAt: string }> {
  const ok = await verifyTurnstile(input.turnstileToken, input.ip);
  if (!ok) throw new AppError("Bot check failed. Please try again.", 400, "turnstile_failed");

  await enforceRateLimit(db, `otp:phone:${input.phone}`, 5, 15 * 60);
  if (input.ip) await enforceRateLimit(db, `otp:ip:${input.ip}`, 20, 15 * 60);

  const { data: enabled } = await db
    .from("notification_templates")
    .select("enabled")
    .eq("event_type", "otp")
    .eq("channel", "sms")
    .maybeSingle();
  if (enabled && !enabled.enabled) throw new AppError("Phone verification is temporarily unavailable", 503);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Invalidate previous codes for this target.
  await db.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("target_id", input.targetId).is("consumed_at", null);

  const { error } = await db.from("otp_codes").insert({
    phone: input.phone,
    purpose: input.purpose,
    target_id: input.targetId,
    code_hash: hashCode(code, input.phone),
    expires_at: expiresAt,
    ip: input.ip ?? null,
  });
  if (error) throw error;

  // OTP template text is fixed (not admin-editable) for deliverability/fraud reasons.
  await sendSms(input.phone, renderTemplate(TEMPLATE_DEFAULTS.otp.sms!.text, { otpCode: code }));
  if (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_LOG === "1") {
    console.info(`[otp:dev] target=${input.targetId} code=${code}`);
  }
  return { expiresAt };
}

export async function verifyOtp(
  db: ServiceClient,
  input: { targetId: string; purpose: OtpPurpose; code: string; ip?: string | null },
): Promise<{ phone: string }> {
  if (input.ip) await enforceRateLimit(db, `otp-verify:ip:${input.ip}`, 30, 15 * 60);

  const { data: row } = await db
    .from("otp_codes")
    .select("*")
    .eq("target_id", input.targetId)
    .eq("purpose", input.purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw new AppError("No active code. Please request a new one.", 400, "otp_missing");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new AppError("Code expired. Please request a new one.", 400, "otp_expired");
  if (row.attempts >= MAX_ATTEMPTS) throw new AppError("Too many attempts. Please request a new code.", 429, "otp_locked");

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashCode(input.code.trim(), row.phone), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    await db.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new AppError("Incorrect code", 400, "otp_invalid");
  }

  await db.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
  return { phone: row.phone };
}
