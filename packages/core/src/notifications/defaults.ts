import type { NotificationChannel } from "@getmed/db/types";

export type NotificationEvent =
  | "order.new"
  | "order.timed_out"
  | "order.rejected"
  | "order.cancelled"
  | "order.status"
  | "order.out_for_delivery"
  | "order.delivery_failed"
  | "consultation.new"
  | "driver.assigned"
  | "otp";

export type Recipient = "pharmacy" | "admin" | "patient" | "driver";

export type EventDefinition = {
  event: NotificationEvent;
  label: string;
  recipient: Recipient;
  placeholders: readonly string[];
  /** Placeholders the send logic depends on; the admin may not remove these. */
  required: readonly string[];
  editable: boolean;
};

export const EVENT_DEFINITIONS: readonly EventDefinition[] = [
  { event: "order.new", label: "New order received", recipient: "pharmacy", placeholders: ["pharmacyName", "orderId", "orderType", "patientName"], required: ["orderId"], editable: true },
  { event: "order.timed_out", label: "Order not accepted in 30 min", recipient: "admin", placeholders: ["orderId", "pharmacyName", "patientName", "patientPhone"], required: ["orderId", "patientPhone"], editable: true },
  { event: "order.rejected", label: "Order rejected", recipient: "admin", placeholders: ["orderId", "pharmacyName", "patientName", "patientPhone", "rejectionReason"], required: ["orderId", "patientPhone"], editable: true },
  { event: "order.cancelled", label: "Order cancelled after accepting", recipient: "admin", placeholders: ["orderId", "pharmacyName", "patientName", "patientPhone", "cancellationReason"], required: ["orderId", "patientPhone"], editable: true },
  { event: "order.status", label: "Order status update", recipient: "patient", placeholders: ["orderId", "status", "pharmacyName", "estimatedTime"], required: ["orderId", "status"], editable: true },
  { event: "order.out_for_delivery", label: "Order out for delivery", recipient: "patient", placeholders: ["orderId", "driverName", "estimatedTime"], required: ["orderId"], editable: true },
  { event: "order.delivery_failed", label: "Delivery failed", recipient: "admin", placeholders: ["orderId", "pharmacyName", "patientName", "patientPhone", "failureReason"], required: ["orderId", "patientPhone"], editable: true },
  { event: "consultation.new", label: "Consultation request received", recipient: "pharmacy", placeholders: ["pharmacyName", "patientName", "issue"], required: ["patientName"], editable: true },
  { event: "driver.assigned", label: "Driver assigned", recipient: "driver", placeholders: ["orderId", "pharmacyName", "pharmacyAddress", "deliveryAddress"], required: ["orderId", "pharmacyAddress", "deliveryAddress"], editable: true },
  { event: "otp", label: "OTP code", recipient: "patient", placeholders: ["otpCode"], required: ["otpCode"], editable: false },
];

export type TemplateDefault = { subject: string | null; text: string; enabled: boolean };

/** Mirrors supabase/seed.sql. Used for "reset to default". */
export const TEMPLATE_DEFAULTS: Record<NotificationEvent, Record<NotificationChannel, TemplateDefault | null>> = {
  "order.new": {
    sms: { subject: null, text: "GetMed: New {orderType} order {orderId} for {pharmacyName} from {patientName}. Please respond within 30 minutes.", enabled: true },
    email: { subject: "New order {orderId} — respond within 30 minutes", text: "Hi {pharmacyName},\n\nYou have a new {orderType} order ({orderId}) from {patientName}. Please accept or reject it within 30 minutes in your GetMed dashboard.", enabled: true },
  },
  "order.timed_out": {
    sms: { subject: null, text: "GetMed ALERT: Order {orderId} at {pharmacyName} was not accepted in 30 min. Patient {patientName} {patientPhone}.", enabled: true },
    email: { subject: "Order {orderId} timed out at {pharmacyName}", text: "Order {orderId} at {pharmacyName} was not accepted within 30 minutes.\n\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.", enabled: true },
  },
  "order.rejected": {
    sms: { subject: null, text: "GetMed ALERT: Order {orderId} rejected by {pharmacyName}. Reason: {rejectionReason}. Patient {patientName} {patientPhone}.", enabled: true },
    email: { subject: "Order {orderId} rejected by {pharmacyName}", text: "Order {orderId} was rejected by {pharmacyName}.\n\nReason: {rejectionReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.", enabled: true },
  },
  "order.cancelled": {
    sms: { subject: null, text: "GetMed ALERT: Order {orderId} cancelled by {pharmacyName} after accepting. Reason: {cancellationReason}. Patient {patientName} {patientPhone}.", enabled: true },
    email: { subject: "Order {orderId} cancelled by {pharmacyName}", text: "Order {orderId} was cancelled by {pharmacyName} after being accepted.\n\nReason: {cancellationReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.", enabled: true },
  },
  "order.status": {
    sms: { subject: null, text: "GetMed: Your order {orderId} with {pharmacyName} is now {status}. Estimated time: {estimatedTime}.", enabled: true },
    email: { subject: "Your GetMed order {orderId}: {status}", text: "Your order {orderId} with {pharmacyName} is now {status}.\nEstimated time: {estimatedTime}.", enabled: false },
  },
  "order.out_for_delivery": {
    sms: { subject: null, text: "GetMed: Your order {orderId} is out for delivery with {driverName}. Estimated arrival: {estimatedTime}.", enabled: true },
    email: { subject: "Your GetMed order {orderId} is on its way", text: "Your order {orderId} is out for delivery with {driverName}. Estimated arrival: {estimatedTime}.", enabled: false },
  },
  "order.delivery_failed": {
    sms: { subject: null, text: "GetMed ALERT: Delivery failed for order {orderId} ({pharmacyName}). Reason: {failureReason}. Patient {patientName} {patientPhone}.", enabled: true },
    email: { subject: "Delivery failed: order {orderId}", text: "Delivery of order {orderId} from {pharmacyName} failed.\n\nReason: {failureReason}\nPatient: {patientName}\nPhone: {patientPhone}\n\nPlease contact the patient.", enabled: true },
  },
  "consultation.new": {
    sms: { subject: null, text: "GetMed: New consultation request for {pharmacyName} from {patientName} about {issue}. Please call the patient.", enabled: true },
    email: { subject: "New consultation request: {issue}", text: "Hi {pharmacyName},\n\n{patientName} has requested a consultation about {issue}. Please review the request in your dashboard and call the patient.", enabled: true },
  },
  "driver.assigned": {
    sms: { subject: null, text: "GetMed: You have been assigned order {orderId}. Pickup at {pharmacyName}, {pharmacyAddress}. Deliver to {deliveryAddress}.", enabled: true },
    email: { subject: "New delivery assigned: {orderId}", text: "You have been assigned order {orderId}.\n\nPickup: {pharmacyName}, {pharmacyAddress}\nDeliver to: {deliveryAddress}", enabled: true },
  },
  otp: {
    sms: { subject: null, text: "Your GetMed verification code is {otpCode}. It expires in 10 minutes.", enabled: true },
    email: null,
  },
};

export function eventDefinition(event: string): EventDefinition | undefined {
  return EVENT_DEFINITIONS.find((e) => e.event === event);
}
