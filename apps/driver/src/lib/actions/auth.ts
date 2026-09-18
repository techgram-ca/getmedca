"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@getmed/db/server";

export type AuthState = { error?: string; message?: string } | null;

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(8), next: z.string().optional() }).safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "Enter a valid email and password" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: "Incorrect email or password" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "driver") {
    await supabase.auth.signOut();
    return { error: "This account is not a driver account" };
  }
  redirect(parsed.data.next?.startsWith("/") ? parsed.data.next : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Drivers may change ONLY their password (spec §8). */
export async function changePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = z.object({ password: z.string().min(10, "Use at least 10 characters"), confirm: z.string() }).safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Passwords do not match" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  return error ? { error: error.message } : { message: "Password updated" };
}
