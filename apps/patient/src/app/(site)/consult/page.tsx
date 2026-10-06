import { redirect } from "next/navigation";
import { requireLaunched } from "@/lib/launch";

/** Legacy path kept working: /consult → /consultation. */
export default async function ConsultRedirect() {
  await requireLaunched();
  redirect("/consultation");
}
