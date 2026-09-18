export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayHours = { open: string; close: string; closed?: boolean };
export type WeeklyHours = Partial<Record<DayKey, DayHours>>;

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DEFAULT_HOURS: WeeklyHours = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { open: "10:00", close: "16:00" },
  sun: { open: "10:00", close: "16:00", closed: true },
};

function torontoNow(now = new Date()): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value.toLowerCase().slice(0, 3) as DayKey;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { day: weekday, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isOpenNow(hours: unknown, now = new Date()): { open: boolean; label: string } {
  const weekly = (hours ?? {}) as WeeklyHours;
  const { day, minutes } = torontoNow(now);
  const today = weekly[day];
  if (!today || today.closed) return { open: false, label: "Closed today" };
  const start = toMinutes(today.open);
  const end = toMinutes(today.close);
  if (minutes >= start && minutes < end) return { open: true, label: `Open until ${formatTime(today.close)}` };
  if (minutes < start) return { open: false, label: `Opens at ${formatTime(today.open)}` };
  return { open: false, label: "Closed now" };
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}
