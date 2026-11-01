/**
 * Finding a pharmacy by name rather than by where you are.
 *
 * The nearest-ten list answers "who can deliver to me". This answers the
 * other question a patient actually has, which is "where is *mine*" — the
 * one they have used for fifteen years, which may be the eleventh nearest or
 * across town from the address they are standing at.
 */

/** A postal code as Canada Post writes it, or the first half of one. */
const POSTAL_FULL = /^[a-z]\d[a-z]\s*\d[a-z]\d$/i;
const POSTAL_FSA = /^[a-z]\d[a-z]$/i;

/** Collapses a typed postal code to the form the database stores. */
export function normalizePostal(input: string): string | null {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  if (POSTAL_FSA.test(raw)) return raw;
  if (POSTAL_FULL.test(raw)) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  return null;
}

export type DirectoryQuery = {
  /** Null when there is nothing worth searching for. */
  text: string | null;
  /** Set when the query reads as a postal code or the first half of one. */
  postal: string | null;
  /**
   * `ilike` patterns, already escaped. A pharmacy matches if any of them do.
   * Built here rather than at the call site so the escaping is in one place
   * and can be tested: `%` and `_` are legal in a name and are wildcards to
   * `ilike`, so "A_B Pharmacy" would otherwise match "AxB Pharmacy".
   */
  patterns: string[];
};

/** `%` and `_` mean something to `ilike`; a patient typing them does not. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Works out what a patient meant by what they typed.
 *
 * A postal code is matched by prefix, so "L7E" finds everything in that
 * sorting area and "L7E 2L4" finds that one block — typing more narrows the
 * answer rather than breaking it. Anything else is matched against the name
 * and the city, because "Bolton" is as likely to be how someone describes
 * where their pharmacy is as its name.
 */
export function parseDirectoryQuery(input: string): DirectoryQuery {
  const text = input.trim();
  // One character matches most of the list, which is not an answer.
  if (text.length < 2) return { text: null, postal: null, patterns: [] };

  const postal = normalizePostal(text);
  if (postal) {
    // Both spellings: stored values are not guaranteed to carry the space.
    return {
      text,
      postal,
      patterns: [`${escapeLike(postal)}%`, `${escapeLike(postal.replace(/\s/g, ""))}%`],
    };
  }
  return { text, postal: null, patterns: [`%${escapeLike(text)}%`] };
}

export type DirectoryRow = {
  name: string | null;
  city: string | null;
  postal_code: string | null;
};

/**
 * Ranks matches so the obvious one is first.
 *
 * A patient searching "Bolton" wants Bolton Pharmacy above the pharmacy on
 * Bolton Street in another town, and someone who types a pharmacy's whole
 * name wants it first rather than alphabetically among everything sharing a
 * word with it.
 */
export function directoryRank(row: DirectoryRow, query: DirectoryQuery): number {
  if (!query.text) return 0;
  const q = query.text.trim().toLowerCase();
  const name = (row.name ?? "").toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if ((row.city ?? "").toLowerCase().startsWith(q)) return 3;
  return 4;
}

/** Sorts in place by rank, then name, so the order is stable between loads. */
export function sortDirectory<T extends DirectoryRow>(rows: T[], query: DirectoryQuery): T[] {
  return [...rows].sort((a, b) => {
    const diff = directoryRank(a, query) - directoryRank(b, query);
    if (diff !== 0) return diff;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}
