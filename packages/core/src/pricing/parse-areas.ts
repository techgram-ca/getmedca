import type { FixedZone } from "./zones";
import { FIXED_ZONES } from "./zones";

const FSA_PATTERN = /^[A-Z][0-9][A-Z]$/;

/**
 * Splits free text into postal areas. Admins paste from a spreadsheet, type by
 * hand and edit in place, so anything that separates tokens is accepted:
 * commas, spaces, tabs and newlines.
 */
export function parseFsaText(text: string): { codes: string[]; malformed: string[] } {
  const tokens = text.split(/[\s,;]+/).map((t) => t.trim().toUpperCase()).filter(Boolean);
  const codes: string[] = [];
  const malformed: string[] = [];
  for (const token of tokens) {
    if (FSA_PATTERN.test(token)) codes.push(token);
    else malformed.push(token);
  }
  return { codes, malformed };
}

export type ZoneTextInput = Record<FixedZone, string>;

export type ZoneAreasValidation = {
  /** The assignment to save, only when there are no problems. */
  assignments: Record<string, FixedZone>;
  perZone: Record<FixedZone, { valid: string[]; malformed: string[]; unknown: string[]; duplicated: string[] }>;
  /** A postal code typed into more than one zone, with the zones it appears in. */
  duplicates: { fsa: string; zones: FixedZone[] }[];
  /** Well-formed but not in the postal areas reference table. */
  unknown: string[];
  /** Not in `A1A` shape at all. */
  malformed: string[];
  total: number;
  ok: boolean;
};

/**
 * Checks four zones' worth of pasted postal areas before anything is saved.
 *
 * The rule that matters is that a postal code belongs to exactly one zone —
 * `pharmacy_zone_areas` is keyed on (pharmacy, fsa), so a code in two boxes
 * would either be silently resolved to one of them, pricing a delivery wrong
 * with nothing to explain it, or fail on a constraint the admin cannot act on.
 * It is reported instead, naming the code and both zones.
 */
export function validateZoneAreas(input: ZoneTextInput, knownFsas: ReadonlySet<string>): ZoneAreasValidation {
  const zonesByFsa = new Map<string, FixedZone[]>();
  const perZone = {} as ZoneAreasValidation["perZone"];

  for (const zone of FIXED_ZONES) {
    const { codes, malformed } = parseFsaText(input[zone] ?? "");
    // A code repeated inside one box is just a typo; the set collapses it.
    const unique = [...new Set(codes)];
    perZone[zone] = { valid: [], malformed, unknown: [], duplicated: [] };
    for (const fsa of unique) {
      if (!knownFsas.has(fsa)) {
        perZone[zone].unknown.push(fsa);
        continue;
      }
      perZone[zone].valid.push(fsa);
      zonesByFsa.set(fsa, [...(zonesByFsa.get(fsa) ?? []), zone]);
    }
  }

  const duplicates: ZoneAreasValidation["duplicates"] = [];
  const assignments: Record<string, FixedZone> = {};
  for (const [fsa, zones] of zonesByFsa) {
    if (zones.length > 1) {
      duplicates.push({ fsa, zones });
      for (const zone of zones) perZone[zone].duplicated.push(fsa);
    } else {
      assignments[fsa] = zones[0]!;
    }
  }

  const unknown = [...new Set(FIXED_ZONES.flatMap((z) => perZone[z].unknown))];
  const malformed = [...new Set(FIXED_ZONES.flatMap((z) => perZone[z].malformed))];

  return {
    assignments,
    perZone,
    duplicates: duplicates.sort((a, b) => a.fsa.localeCompare(b.fsa)),
    unknown: unknown.sort(),
    malformed: malformed.sort(),
    total: Object.keys(assignments).length,
    ok: duplicates.length === 0 && unknown.length === 0 && malformed.length === 0,
  };
}

/** Turns a saved assignment map back into the four text boxes. */
export function toZoneText(assignments: Record<string, FixedZone>): ZoneTextInput {
  const out = Object.fromEntries(FIXED_ZONES.map((z) => [z, [] as string[]])) as Record<FixedZone, string[]>;
  for (const [fsa, zone] of Object.entries(assignments)) out[zone].push(fsa);
  return Object.fromEntries(FIXED_ZONES.map((z) => [z, out[z].sort().join(", ")])) as ZoneTextInput;
}
