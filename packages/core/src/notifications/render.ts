import { eventDefinition } from "./defaults";

const PLACEHOLDER_RE = /\{([a-zA-Z]+)\}/g;

export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = vars[key];
    return v == null || v === "" ? "—" : String(v);
  });
}

export function extractPlaceholders(template: string): string[] {
  return Array.from(template.matchAll(PLACEHOLDER_RE), (m) => m[1]!);
}

/**
 * Server-side template validation (spec §7): reject if a required placeholder
 * was removed, or an unknown placeholder was introduced.
 */
export function validateTemplate(event: string, template: string): { ok: true } | { ok: false; error: string } {
  const def = eventDefinition(event);
  if (!def) return { ok: false, error: `Unknown event '${event}'` };
  if (!def.editable) return { ok: false, error: "This template is not editable" };
  if (!template.trim()) return { ok: false, error: "Template cannot be empty" };
  if (template.length > 1600) return { ok: false, error: "Template is too long (max 1600 characters)" };
  const used = new Set(extractPlaceholders(template));
  const missing = def.required.filter((p) => !used.has(p));
  if (missing.length) {
    return { ok: false, error: `Template must include: ${missing.map((m) => `{${m}}`).join(", ")}` };
  }
  const unknown = [...used].filter((p) => !def.placeholders.includes(p));
  if (unknown.length) {
    return { ok: false, error: `Unknown placeholders: ${unknown.map((m) => `{${m}}`).join(", ")}` };
  }
  return { ok: true };
}
