import { createClient } from "@getmed/db/server";
import { createServiceClient } from "@getmed/db/service";
import type { UserRole } from "@getmed/db/types";
import { ForbiddenError, UnauthorizedError } from "../errors";

export type Session = { userId: string; role: UserRole; email: string | null };

/** Current signed-in user + role (from profiles). Throws 401 when signed out. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return { userId: user.id, role: profile.role, email: user.email ?? null };
}

export async function requireRole(role: UserRole): Promise<Session> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  if (s.role !== role) throw new ForbiddenError();
  return s;
}

/** Pharmacy-scoped context: the signed-in owner's pharmacy row id. */
export async function requirePharmacy() {
  const s = await requireRole("pharmacy");
  const db = createServiceClient();
  const { data } = await db.from("pharmacies").select("id, status, name, signup_step, submitted_at").eq("owner_user_id", s.userId).maybeSingle();
  if (!data) throw new ForbiddenError("No pharmacy profile for this account");
  return { session: s, pharmacy: data, db };
}

export async function requireDriver() {
  const s = await requireRole("driver");
  const db = createServiceClient();
  const { data } = await db.from("drivers").select("*").eq("user_id", s.userId).maybeSingle();
  if (!data) throw new ForbiddenError("No driver profile for this account");
  if (!data.active) throw new ForbiddenError("Your driver account is inactive");
  return { session: s, driver: data, db };
}

export async function requireAdmin() {
  const s = await requireRole("admin");
  return { session: s, db: createServiceClient() };
}
