"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@getmed/db/server";
import { createServiceClient } from "@getmed/db/service";

export type AuthState = { error?: string; message?: string } | null;

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8), next: z.string().optional() });

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "Enter a valid email and password" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: "Incorrect email or password" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "pharmacy") {
    await supabase.auth.signOut();
    return { error: "This account is not a pharmacy account" };
  }
  const next = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/dashboard";
  redirect(next);
}

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(10, "Use at least 10 characters"),
});

/** Absolute origin of this deployment, used to build email confirmation links. */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_PHARMACY_URL ?? "http://localhost:3001";
}

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  const supabase = await createClient();
  const origin = await appOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { role: "pharmacy", full_name: parsed.data.fullName },
      // Without this, Supabase falls back to the project Site URL and the
      // pharmacy lands on the marketing page with an unused code.
      emailRedirectTo: `${origin}/api/auth/callback?next=/signup`,
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Could not create your account" };

  // Create the pharmacy draft row (one login per pharmacy).
  const db = createServiceClient();
  await db.from("pharmacies").upsert({ owner_user_id: data.user.id, email: parsed.data.email, status: "pending", signup_step: 1 }, { onConflict: "owner_user_id" });

  if (!data.session) return { message: "Almost there — check your email and click the confirmation link to continue setting up your pharmacy." };
  redirect("/signup");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const passwordSchema = z.object({ password: z.string().min(10, "Use at least 10 characters"), confirm: z.string() });

export async function changePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Passwords do not match" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { message: "Password updated" };
}
