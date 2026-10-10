"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DEFAULT_CONFIRMATION_TTL_SECONDS,
  isAddressTaken,
  isSendingTooOften,
  readSignupState,
} from "@getmed/core/auth/signup-result";
import { createClient } from "@getmed/db/server";
import { createServiceClient } from "@getmed/db/service";

export type AuthState = {
  error?: string;
  message?: string;
  /** A confirmed account already uses this address. Signing up again cannot work. */
  existingAccount?: true;
  /** A link is already out and still usable; ISO expiry so the form can say until when. */
  confirmationPending?: { expiresAt: string };
  /** A fresh link just went out, because the last one had run out. */
  confirmationResent?: true;
} | null;

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

/**
 * How long one of this project's confirmation links lasts.
 *
 * Supabase's own docs give two different answers — 1 hour in the Auth guide
 * and the CLI default, 24 in the JavaScript reference — and the dashboard can
 * change it, so the value has to come from configuration. Set
 * `SUPABASE_CONFIRMATION_TTL_SECONDS` to whatever Authentication → Email →
 * "Email OTP Expiration" actually says.
 *
 * Unset, it assumes the shorter one. That is the safe way to be wrong: too
 * short only means sending a fresh link that works, while too long leaves a
 * pharmacy told its confirmation is pending while holding a dead link.
 */
function confirmationTtlSeconds(): number {
  const raw = Number(process.env.SUPABASE_CONFIRMATION_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CONFIRMATION_TTL_SECONDS;
}

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  const db = createServiceClient();

  // Ask first. Supabase will not say whether an address is taken, and for an
  // unconfirmed one it re-sends the confirmation before answering — which
  // overwrites the single fact worth knowing, when the link the pharmacy is
  // still waiting on went out. After the call it is too late to look.
  //
  // A lookup that fails falls through to an ordinary signup rather than
  // blocking one, so an environment without the migration still works; the
  // check on the response below then catches what it can.
  const { data: rows } = await db.rpc("email_signup_state", { p_email: parsed.data.email });
  const state = readSignupState(rows?.[0], { ttlSeconds: confirmationTtlSeconds() });
  if (state.kind === "registered") return { existingAccount: true };
  if (state.kind === "pending") {
    // Deliberately no second email. The one in their inbox still works, and a
    // duplicate only makes it harder to tell which link to click.
    return { confirmationPending: { expiresAt: state.expiresAt.toISOString() } };
  }

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
  // Backstop for the gap between the lookup and this call, and for a project
  // where the lookup is not available at all.
  if (isAddressTaken({ error, user: data?.user })) return { existingAccount: true };
  if (isSendingTooOften(error)) {
    return { error: "We have just sent a link to this address. Give it a minute, then check your inbox and spam folder." };
  }
  if (error) return { error: error.message };
  if (!data.user) return { error: "Could not create your account" };

  // Create the pharmacy draft row (one login per pharmacy).
  await db.from("pharmacies").upsert({ owner_user_id: data.user.id, email: parsed.data.email, status: "pending", signup_step: 1 }, { onConflict: "owner_user_id" });

  if (!data.session) {
    // `expired` means there was an account here already, waiting on a link
    // that ran out. Supabase re-sends on signup, so one is on its way — but
    // saying "almost there" to someone on their second or third try reads as
    // if nothing happened the last time.
    return state.kind === "expired"
      ? { confirmationResent: true }
      : { message: "Almost there — check your email and click the confirmation link to continue setting up your pharmacy." };
  }
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

const emailSchema = z.object({ email: z.string().trim().email("Enter the email you signed up with") });

/**
 * Sends a password reset link.
 *
 * The link has to come back to this app's callback, not to the Supabase project
 * Site URL — that points at the patient site, which has nothing to exchange the
 * token with, so the reset bounces off the marketing page with the token spent.
 *
 * The answer is the same whether or not the address has an account. Saying
 * "no account with that email" turns this form into a way to find out which
 * pharmacies are registered.
 */
export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  const supabase = await createClient();
  const origin = await appOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  });
  return { message: "If that email has a GetMed pharmacy account, a reset link is on its way. The link is good for one use." };
}

const newPasswordSchema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Both passwords must match", path: ["confirm"] });

/**
 * Sets a new password. Reached only with the recovery session the callback
 * established, so there is nothing else to verify here — Supabase refuses the
 * update without it.
 */
export async function setNewPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the passwords" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "That reset link has expired. Request a new one and open it on this device." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/login?reset=1");
}
