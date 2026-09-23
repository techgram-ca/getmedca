-- =====================================================================
-- GetMed seed for a fresh setup: platform settings, form field config, issues, templates.
-- Template defaults are mirrored in packages/core/src/notifications/defaults.ts
-- =====================================================================

insert into public.platform_settings (id, search_radius_km, sla_minutes, default_zone1_fee, default_zone2_fee, default_zone3_fee, default_zone4_fee, default_remote_per_km)
values (1, 10, 30, 5.00, 8.00, 12.00, 18.00, 1.20)
on conflict (id) do nothing;

-- Fixed, predefined field set. Admin may only toggle `required`.
insert into public.form_field_config (field_key, applies_to, label, required, sort_order) values
  ('patient_name', 'new_order', 'Patient full name', true, 1),
  ('patient_dob', 'new_order', 'Date of birth', true, 2),
  ('patient_phone', 'new_order', 'Mobile phone', true, 3),
  ('delivery_address', 'new_order', 'Delivery address', true, 4),
  ('prescription_file', 'new_order', 'Prescription upload', true, 5),
  ('insurance', 'new_order', 'Insurance (upload or manual)', false, 6),
  ('health_card', 'new_order', 'Health card (upload or manual)', false, 7),
  ('notes', 'new_order', 'Notes / allergies', false, 8),

  ('patient_name', 'transfer', 'Patient full name', true, 1),
  ('patient_dob', 'transfer', 'Date of birth', true, 2),
  ('patient_phone', 'transfer', 'Mobile phone', true, 3),
  ('delivery_address', 'transfer', 'Delivery address', true, 4),
  ('transfer_from_pharmacy', 'transfer', 'Current pharmacy name', true, 5),
  ('transfer_from_contact', 'transfer', 'Current pharmacy phone / fax', true, 6),
  ('transfer_prescription_number', 'transfer', 'Prescription number', false, 7),
  ('insurance', 'transfer', 'Insurance (upload or manual)', false, 8),
  ('health_card', 'transfer', 'Health card (upload or manual)', false, 9),
  ('notes', 'transfer', 'Notes / allergies', false, 10),

  ('patient_name', 'consultation', 'Your name', true, 1),
  ('patient_phone', 'consultation', 'Mobile phone', true, 2),
  ('description', 'consultation', 'Describe your concern', false, 3),
  ('callback_window', 'consultation', 'Preferred callback window', false, 4)
on conflict (field_key, applies_to) do nothing;

insert into public.issues (name, slug, description, sort_order) values
  ('Cold & flu', 'cold-flu', 'Symptom relief, over-the-counter guidance and when to see a doctor.', 1),
  ('Allergies', 'allergies', 'Seasonal and environmental allergy management.', 2),
  ('Minor skin conditions', 'skin-conditions', 'Rashes, eczema flare-ups, insect bites and minor infections.', 3),
  ('Urinary tract infection', 'uti', 'Assessment and pharmacist-prescribed treatment for uncomplicated UTIs.', 4),
  ('Pink eye', 'pink-eye', 'Conjunctivitis assessment.', 5),
  ('Medication review', 'medication-review', 'Review all your medications with a pharmacist.', 6),
  ('Smoking cessation', 'smoking-cessation', 'Support and treatment options to quit smoking.', 7),
  ('Birth control', 'birth-control', 'Contraception options and renewals.', 8),
  ('Travel health', 'travel-health', 'Vaccines and medication for travel.', 9),
  ('Diabetes support', 'diabetes', 'Blood sugar management and device training.', 10),
  ('Blood pressure', 'blood-pressure', 'Monitoring and medication questions.', 11),
  ('Vaccinations', 'vaccinations', 'Flu shots, boosters and routine immunizations.', 12)
on conflict (slug) do nothing;

insert into public.notification_templates (event_type, channel, subject, template_text, enabled, template_editable) values
  ('order.new', 'sms', null, 'GetMed: New {orderType} order {orderId} for {pharmacyName} from {patientName}. Please respond within 30 minutes.', true, true),
  ('order.new', 'email', 'New order {orderId} — respond within 30 minutes', 'Hi {pharmacyName},\n\nYou have a new {orderType} order ({orderId}) from {patientName}. Please accept or reject it within 30 minutes in your GetMed dashboard.', true, true),
  ('order.timed_out', 'sms', null, 'GetMed ALERT: Order {orderId} at {pharmacyName} was not accepted in 30 min. Patient {patientName} {patientPhone}.', true, true),
  ('order.timed_out', 'email', 'Order {orderId} timed out at {pharmacyName}', 'Order {orderId} at {pharmacyName} was not accepted within 30 minutes.\n\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.', true, true),
  ('order.rejected', 'sms', null, 'GetMed ALERT: Order {orderId} rejected by {pharmacyName}. Reason: {rejectionReason}. Patient {patientName} {patientPhone}.', true, true),
  ('order.rejected', 'email', 'Order {orderId} rejected by {pharmacyName}', 'Order {orderId} was rejected by {pharmacyName}.\n\nReason: {rejectionReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.', true, true),
  ('order.cancelled', 'sms', null, 'GetMed ALERT: Order {orderId} cancelled by {pharmacyName} after accepting. Reason: {cancellationReason}. Patient {patientName} {patientPhone}.', true, true),
  ('order.cancelled', 'email', 'Order {orderId} cancelled by {pharmacyName}', 'Order {orderId} was cancelled by {pharmacyName} after being accepted.\n\nReason: {cancellationReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.', true, true),
  ('order.status', 'sms', null, 'GetMed: Your order {orderId} with {pharmacyName} is now {status}. Estimated time: {estimatedTime}.', true, true),
  ('order.status', 'email', 'Your GetMed order {orderId}: {status}', 'Your order {orderId} with {pharmacyName} is now {status}.\nEstimated time: {estimatedTime}.', false, true),
  ('order.out_for_delivery', 'sms', null, 'GetMed: Your order {orderId} is out for delivery with {driverName}. Estimated arrival: {estimatedTime}.', true, true),
  ('order.out_for_delivery', 'email', 'Your GetMed order {orderId} is on its way', 'Your order {orderId} is out for delivery with {driverName}. Estimated arrival: {estimatedTime}.', false, true),
  ('order.delivery_failed', 'sms', null, 'GetMed ALERT: Delivery failed for order {orderId} ({pharmacyName}). Reason: {failureReason}. Patient {patientName} {patientPhone}.', true, true),
  ('order.delivery_failed', 'email', 'Delivery failed: order {orderId}', 'Delivery of order {orderId} from {pharmacyName} failed.\n\nReason: {failureReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.', true, true),
  ('consultation.new', 'sms', null, 'GetMed: New consultation request for {pharmacyName} from {patientName} about {issue}. Please call the patient.', true, true),
  ('consultation.new', 'email', 'New consultation request: {issue}', 'Hi {pharmacyName},\n\n{patientName} has requested a consultation about {issue}. Please review the request in your dashboard and call the patient.', true, true),
  ('driver.assigned', 'sms', null, 'GetMed: You have been assigned order {orderId}. Pickup at {pharmacyName}, {pharmacyAddress}. Deliver to {deliveryAddress}.', true, true),
  ('driver.assigned', 'email', 'New delivery assigned: {orderId}', 'You have been assigned order {orderId}.\n\nPickup: {pharmacyName}, {pharmacyAddress}\nDeliver to: {deliveryAddress}', true, true),
  ('otp', 'sms', null, 'Your GetMed verification code is {otpCode}. It expires in 10 minutes.', true, false)
on conflict (event_type, channel) do nothing;
