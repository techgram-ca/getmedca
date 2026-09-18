import { createServiceClient } from "@getmed/db/service";
import { AppError } from "@getmed/core/errors";
import { createOrder } from "@getmed/core/orders";
import { sendOtp } from "@getmed/core/otp";
import { uploadPrivate } from "@getmed/core/storage";
import { applyFieldConfig, orderBaseSchema } from "@getmed/core/validation";
import { clientIp, handler, json } from "@/lib/api";

/**
 * POST /api/orders (multipart)
 * Creates an unverified order and sends the OTP. Files are uploaded to private
 * buckets under an opaque key. No PHI appears in the URL or logs.
 */
export const POST = handler(async (req: Request) => {
  const fd = await req.formData();
  const raw = fd.get("payload");
  if (typeof raw !== "string") throw new AppError("Missing payload");
  const parsed = orderBaseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    return json({ error: "Please check the highlighted fields", fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  const turnstileToken = fd.get("turnstileToken");
  const files = {
    prescription: fileOrNull(fd.get("prescription")),
    insurance: fileOrNull(fd.get("insurance")),
    healthCard: fileOrNull(fd.get("healthCard")),
  };

  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*");
  const fieldErrors = applyFieldConfig(input, files, config ?? []);
  if (Object.keys(fieldErrors).length) return json({ error: "Please check the highlighted fields", fieldErrors }, { status: 400 });

  const orderId = crypto.randomUUID();
  const [prescriptionPath, insurancePath, healthCardPath] = await Promise.all([
    files.prescription ? uploadPrivate(db, "prescriptions", orderId, files.prescription) : null,
    files.insurance ? uploadPrivate(db, "insurance", orderId, files.insurance) : null,
    files.healthCard ? uploadPrivate(db, "health-cards", orderId, files.healthCard) : null,
  ]);

  const order = await createOrder(
    {
      id: orderId,
      pharmacy_id: input.pharmacyId,
      order_type: input.orderType,
      patient_name: input.patientName,
      patient_phone: input.patientPhone,
      patient_dob: input.patientDob || null,
      delivery_address_line: input.deliveryAddress.line,
      delivery_city: input.deliveryAddress.city ?? null,
      delivery_postal_code: input.deliveryAddress.postalCode ?? null,
      delivery_location:
        input.deliveryAddress.lat != null && input.deliveryAddress.lng != null
          ? `SRID=4326;POINT(${input.deliveryAddress.lng} ${input.deliveryAddress.lat})`
          : null,
      delivery_notes: input.notes || null,
      allergies: input.allergies || null,
      prescription_file_path: prescriptionPath,
      insurance_provider: input.insuranceProvider || null,
      insurance_member_id: input.insuranceMemberId || null,
      insurance_group_number: input.insuranceGroupNumber || null,
      insurance_file_path: insurancePath,
      health_card_number: input.healthCardNumber || null,
      health_card_version: input.healthCardVersion || null,
      health_card_file_path: healthCardPath,
      transfer_from_pharmacy_name: input.transferFromPharmacyName || null,
      transfer_from_phone: input.transferFromPhone || null,
      transfer_from_fax: input.transferFromFax || null,
      transfer_prescription_number: input.transferPrescriptionNumber || null,
      consent_given_at: new Date().toISOString(),
    },
    { db },
  );

  await sendOtp(db, {
    phone: order.patient_phone,
    purpose: "order",
    targetId: order.id,
    turnstileToken: typeof turnstileToken === "string" ? turnstileToken : null,
    ip: clientIp(req),
  });

  return json({ orderId: order.id });
});

function fileOrNull(v: FormDataEntryValue | null): File | null {
  return v instanceof File && v.size > 0 ? v : null;
}

