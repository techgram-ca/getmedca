import { redirect } from "next/navigation";

/** Legacy path kept working: /consult → /consultation. */
export default function ConsultRedirect() {
  redirect("/consultation");
}
