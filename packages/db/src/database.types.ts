/**
 * Hand-authored to mirror supabase/migrations/0001_init.sql.
 * Regenerate with `pnpm db:types` once a local/hosted project is available.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Tbl<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type UserRole = "admin" | "pharmacy" | "driver";
export type PharmacyStatus = "pending" | "approved" | "inactive";
export type OrderType = "new" | "transfer";
export type OrderStatus =
  | "pending"
  | "accepted"
  | "ready_for_delivery"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed"
  | "rejected"
  | "cancelled"
  | "timed_out";
export type EscalationStatus = "open" | "contacted" | "resolved";
export type ConsultationStatus = "new" | "contacted" | "resolved";
export type CallbackWindow = "morning" | "afternoon" | "evening";
export type NotificationChannel = "sms" | "email";
export type FormAppliesTo = "new_order" | "transfer" | "consultation";
export type OtpPurpose = "order" | "consultation";
export type OrderSource = "online" | "manual";
export type DeliveryType = "local" | "gta" | "extended" | "custom";

export type ProfileRow = { id: string; role: UserRole; full_name: string | null; created_at: string };

export type PharmacyRow = {
  id: string;
  owner_user_id: string | null;
  slug: string | null;
  status: PharmacyStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  location: unknown | null;
  license_number: string | null;
  license_province: string | null;
  license_college: string | null;
  license_doc_path: string | null;
  pic_name: string | null;
  pic_license_number: string | null;
  hours: Json;
  delivery_radius_km: number | null;
  estimated_delivery_time: string | null;
  offers_delivery: boolean;
  offers_transfer: boolean;
  offers_consultation: boolean;
  accepted_insurance: string[];
  accessibility_notes: string | null;
  logo_path: string | null;
  cover_path: string | null;
  tagline: string | null;
  bio: string | null;
  gallery_paths: string[];
  theme_color: string | null;
  signup_step: number;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  inactive_reason: string | null;
  notify_sms: boolean;
  notify_email: boolean;
  notify_sound: boolean;
  created_at: string;
  updated_at: string;
};

export type PharmacistRow = {
  id: string;
  pharmacy_id: string;
  name: string;
  photo_path: string | null;
  credentials: string | null;
  years_experience: number | null;
  bio: string | null;
  languages: string[];
  is_main: boolean;
  sort_order: number;
  created_at: string;
};

export type PharmacyServiceRow = {
  id: string;
  pharmacy_id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  sort_order: number;
  created_at: string;
};

export type IssueRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type PharmacyIssueRow = { pharmacy_id: string; issue_id: string };

export type DriverRow = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  license_doc_path: string | null;
  insurance_doc_path: string | null;
  active: boolean;
  push_subscription: Json | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  pharmacy_id: string;
  order_type: OrderType;
  status: OrderStatus;
  source: OrderSource;
  created_by: string | null;
  patient_name: string;
  patient_phone: string;
  patient_dob: string | null;
  delivery_address_line: string;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_location: unknown | null;
  delivery_notes: string | null;
  /** Driving route pharmacy → patient, computed once and stored. */
  delivery_distance_m: number | null;
  delivery_duration_s: number | null;
  delivery_route_avoids_tolls: boolean | null;
  delivery_route_computed_at: string | null;
  allergies: string | null;
  prescription_file_path: string | null;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  insurance_group_number: string | null;
  insurance_file_path: string | null;
  health_card_number: string | null;
  health_card_version: string | null;
  health_card_file_path: string | null;
  transfer_from_pharmacy_name: string | null;
  transfer_from_phone: string | null;
  transfer_from_fax: string | null;
  transfer_prescription_number: string | null;
  phone_verified_at: string | null;
  consent_given_at: string;
  assigned_driver_id: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  failure_reason: string | null;
  escalated_at: string | null;
  escalation_status: EscalationStatus | null;
  escalation_note: string | null;
  escalation_resolved_at: string | null;
  reassigned_at: string | null;
  reassigned_by: string | null;
  delivery_type: DeliveryType | null;
  delivery_type_set_at: string | null;
  delivery_fee_charged: number | null;
  accepted_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  timed_out_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderInsert = Pick<
  OrderRow,
  "pharmacy_id" | "order_type" | "patient_name" | "patient_phone" | "delivery_address_line" | "consent_given_at"
> &
  Partial<OrderRow>;

export type OrderEventRow = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  action: string;
  actor_role: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
};

export type ProofOfDeliveryRow = {
  id: string;
  order_id: string;
  photo_path: string;
  signature_path: string;
  driver_id: string | null;
  created_at: string;
};

export type ConsultationRequestRow = {
  id: string;
  pharmacy_id: string;
  issue_id: string | null;
  service_id: string | null;
  patient_name: string;
  patient_phone: string;
  description: string | null;
  callback_window: CallbackWindow | null;
  status: ConsultationStatus;
  phone_verified_at: string | null;
  consent_given_at: string;
  pharmacy_note: string | null;
  admin_note: string | null;
  contacted_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OtpCodeRow = {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  target_id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  ip: string | null;
  created_at: string;
};

export type RateLimitRow = { key: string; count: number; window_start: string };
export type SearchCacheRow = { key: string; payload: Json; expires_at: string };

export type FormFieldConfigRow = {
  field_key: string;
  applies_to: FormAppliesTo;
  label: string;
  required: boolean;
  sort_order: number;
};

export type NotificationTemplateRow = {
  id: string;
  event_type: string;
  channel: NotificationChannel;
  subject: string | null;
  template_text: string;
  enabled: boolean;
  template_editable: boolean;
  updated_at: string;
};

export type PlatformSettingsRow = {
  id: number;
  search_radius_km: number;
  sla_minutes: number;
  /** Fallback prices used when a pharmacy has no override of its own. */
  default_local_fee: number;
  default_gta_fee: number;
  default_extended_fee: number;
  updated_at: string;
};

/** A pharmacy's override of a platform default. Custom is priced per order. */
export type PharmacyDeliveryPricingRow = {
  pharmacy_id: string;
  delivery_type: Exclude<DeliveryType, "custom">;
  price: number;
  updated_at: string;
};

export type SupportMessageRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  resolved: boolean;
  created_at: string;
};

export type PharmacyPublicRow = {
  id: string;
  slug: string | null;
  name: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  hours: Json;
  delivery_radius_km: number | null;
  estimated_delivery_time: string | null;
  offers_delivery: boolean;
  offers_transfer: boolean;
  offers_consultation: boolean;
  accepted_insurance: string[];
  accessibility_notes: string | null;
  logo_path: string | null;
  cover_path: string | null;
  tagline: string | null;
  bio: string | null;
  gallery_paths: string[];
  theme_color: string | null;
};

/**
 * Admin projection: carries order metadata, the patient's name, phone and
 * delivery address (needed to route drivers and resolve failed deliveries),
 * and structurally excludes prescription, insurance, health-card and DOB.
 */
export type OrderAdminRow = Pick<
  OrderRow,
  | "id"
  | "pharmacy_id"
  | "order_type"
  | "status"
  | "patient_name"
  | "patient_phone"
  | "delivery_city"
  | "delivery_postal_code"
  | "assigned_driver_id"
  | "rejection_reason"
  | "cancellation_reason"
  | "failure_reason"
  | "escalated_at"
  | "escalation_status"
  | "escalation_note"
  | "escalation_resolved_at"
  | "reassigned_at"
  | "reassigned_by"
  | "delivery_fee_charged"
  | "accepted_at"
  | "ready_at"
  | "assigned_at"
  | "picked_up_at"
  | "delivered_at"
  | "failed_at"
  | "rejected_at"
  | "cancelled_at"
  | "timed_out_at"
  | "created_at"
  | "updated_at"
  | "source"
  | "delivery_type"
  | "delivery_address_line"
  | "delivery_notes"
  | "delivery_distance_m"
  | "delivery_duration_s"
  | "delivery_route_avoids_tolls"
  | "delivery_route_computed_at"
>;

export type OrderDriverRow = Pick<
  OrderRow,
  | "id" | "pharmacy_id" | "order_type" | "status" | "patient_name" | "patient_phone"
  | "delivery_address_line" | "delivery_city" | "delivery_postal_code" | "delivery_notes"
  | "assigned_driver_id" | "failure_reason" | "reassigned_at" | "reassigned_by"
  | "assigned_at" | "picked_up_at" | "delivered_at" | "failed_at" | "created_at" | "updated_at"
> & {
  delivery_lat: number | null;
  delivery_lng: number | null;
  pharmacy_name: string | null;
  pharmacy_phone: string | null;
  pharmacy_address_line: string | null;
  pharmacy_city: string | null;
  pharmacy_postal_code: string | null;
  pharmacy_lat: number | null;
  pharmacy_lng: number | null;
};

export type PharmacyNearRow = {
  id: string;
  slug: string | null;
  name: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  logo_path: string | null;
  tagline: string | null;
  hours: Json;
  estimated_delivery_time: string | null;
  offers_delivery: boolean;
  offers_transfer: boolean;
  offers_consultation: boolean;
  straight_line_m: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Tbl<ProfileRow>;
      pharmacies: Tbl<PharmacyRow>;
      pharmacists: Tbl<PharmacistRow, Pick<PharmacistRow, "pharmacy_id" | "name"> & Partial<PharmacistRow>>;
      pharmacy_services: Tbl<PharmacyServiceRow, Pick<PharmacyServiceRow, "pharmacy_id" | "name"> & Partial<PharmacyServiceRow>>;
      issues: Tbl<IssueRow, Pick<IssueRow, "name" | "slug"> & Partial<IssueRow>>;
      pharmacy_issues: Tbl<PharmacyIssueRow, PharmacyIssueRow>;
      drivers: Tbl<DriverRow, Pick<DriverRow, "name" | "phone" | "email"> & Partial<DriverRow>>;
      orders: Tbl<OrderRow, OrderInsert>;
      order_events: Tbl<OrderEventRow, Pick<OrderEventRow, "order_id" | "action" | "actor_role"> & Partial<OrderEventRow>>;
      proof_of_delivery: Tbl<ProofOfDeliveryRow, Pick<ProofOfDeliveryRow, "order_id" | "photo_path" | "signature_path"> & Partial<ProofOfDeliveryRow>>;
      consultation_requests: Tbl<
        ConsultationRequestRow,
        Pick<ConsultationRequestRow, "pharmacy_id" | "patient_name" | "patient_phone" | "consent_given_at"> & Partial<ConsultationRequestRow>
      >;
      otp_codes: Tbl<OtpCodeRow, Pick<OtpCodeRow, "phone" | "purpose" | "target_id" | "code_hash" | "expires_at"> & Partial<OtpCodeRow>>;
      rate_limits: Tbl<RateLimitRow>;
      search_cache: Tbl<SearchCacheRow, SearchCacheRow>;
      form_field_config: Tbl<FormFieldConfigRow>;
      notification_templates: Tbl<NotificationTemplateRow, Pick<NotificationTemplateRow, "event_type" | "channel" | "template_text"> & Partial<NotificationTemplateRow>>;
      platform_settings: Tbl<PlatformSettingsRow>;
      pharmacy_delivery_pricing: Tbl<PharmacyDeliveryPricingRow, PharmacyDeliveryPricingRow>;
      support_messages: Tbl<SupportMessageRow, Pick<SupportMessageRow, "name" | "message"> & Partial<SupportMessageRow>>;
    };
    Views: {
      pharmacies_public: { Row: PharmacyPublicRow; Relationships: [] };
      orders_admin: { Row: OrderAdminRow; Relationships: [] };
      orders_driver: { Row: OrderDriverRow; Relationships: [] };
    };
    Functions: {
      pharmacies_near: {
        Args: { p_lat: number; p_lng: number; p_radius_m: number; p_issue_slug?: string | null };
        Returns: PharmacyNearRow[];
      };
      bump_rate_limit: { Args: { p_key: string; p_window_seconds: number }; Returns: number };
      order_route_points: {
        Args: { p_order_id: string };
        Returns: { from_lat: number; from_lng: number; to_lat: number; to_lng: number }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_role_name: { Args: Record<string, never>; Returns: UserRole };
      owns_pharmacy: { Args: { p_pharmacy_id: string }; Returns: boolean };
      pharmacy_is_approved: { Args: { p_pharmacy_id: string }; Returns: boolean };
      current_driver_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      pharmacy_status: PharmacyStatus;
      order_type: OrderType;
      order_status: OrderStatus;
      escalation_status: EscalationStatus;
      consultation_status: ConsultationStatus;
      callback_window: CallbackWindow;
      notification_channel: NotificationChannel;
      form_applies_to: FormAppliesTo;
      otp_purpose: OtpPurpose;
      order_source: OrderSource;
      delivery_type: DeliveryType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
