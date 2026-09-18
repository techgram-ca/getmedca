/** Short human-friendly order reference (first 8 chars of the UUID, upper-cased). */
export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount ?? 0);
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
    ...opts,
  }).format(d);
}

export function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "America/Toronto" }).format(d);
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

/** Normalise a Canadian phone number to E.164 (+1XXXXXXXXXX). Returns null when invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `•••-•••-${digits.slice(-4)}`;
}

export function timeAgo(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  ready_for_delivery: "Ready for delivery",
  assigned: "Driver assigned",
  picked_up: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  timed_out: "Timed out",
};

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
