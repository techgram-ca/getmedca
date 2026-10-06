import { redirect } from "next/navigation";
import { cache } from "react";
import { createServiceClient } from "@getmed/db/service";
import { getPlatformSettings, isLaunched } from "@getmed/core/settings";

export type LaunchState = { launched: boolean; message: string | null };

/**
 * Whether the public site is open, read once per request.
 *
 * Nearly every page on the patient site asks this, and several ask twice — a
 * layout and then the page inside it. Without memoising, a single page view
 * costs several identical round trips for one row that changes about once in
 * the lifetime of the product.
 */
export const getLaunchState = cache(async function getLaunchState(): Promise<LaunchState> {
  const settings = await getPlatformSettings(createServiceClient());
  return { launched: isLaunched(settings), message: settings.launch_message };
});

/**
 * Sends anyone who reaches a transactional page before launch back to the
 * coming-soon page. The order and consultation APIs refuse independently, so
 * this is about not presenting a form that cannot be submitted, rather than
 * being the thing that stops a submission.
 */
export async function requireLaunched(): Promise<void> {
  const { launched } = await getLaunchState();
  if (!launched) redirect("/");
}
