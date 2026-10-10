export type RateEntry = { destination: string; price: number };
export type RateListResult = { rows: RateEntry[]; errors: string[] };

const MAX_PRICE = 1000;

/**
 * Reads a rate card typed as one run-on line.
 *
 * Admins enter these the way they say them — "Vaughan 5, Mississauga,
 * Brampton 7" — meaning Vaughan at five, and Mississauga and Brampton both at
 * seven. So a name with no number of its own takes the next number that comes
 * along, which is what makes that sentence mean what it looks like it means.
 *
 * Separators are commas, semicolons and newlines; between a name and its price
 * anything reasonable will do — a dash, a colon, an equals, a dollar sign or
 * nothing at all. Being strict here would only mean rejecting input whose
 * meaning is perfectly clear.
 *
 * A name still waiting for a number when the text runs out is an error rather
 * than a guess: a rate card with a blank in it is worse than one that refused
 * to save.
 */
export function parseRateList(input: string): RateListResult {
  const tokens = input.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);

  const rows: RateEntry[] = [];
  const errors: string[] = [];
  // Names seen with no price yet, waiting for the next number to apply to them.
  let waiting: string[] = [];

  const settle = (price: number) => {
    for (const destination of waiting) rows.push({ destination, price });
    waiting = [];
  };

  for (const token of tokens) {
    // A trailing number, with whatever punctuation leads into it.
    const m = /^(.*?)[\s\-–—:=]*\$?\s*(\d+(?:\.\d{1,2})?)$/.exec(token);
    if (!m) {
      waiting.push(token);
      continue;
    }
    const name = m[1]!.trim();
    const price = Number(m[2]);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
      errors.push(`"${token}" is not a rate we can use.`);
      continue;
    }
    settle(price);
    // A bare number settles the names above it and adds nothing of its own.
    if (name) rows.push({ destination: name, price });
  }

  for (const name of waiting) errors.push(`No rate given for "${name}".`);

  return { rows: dedupe(rows, errors), errors };
}

/**
 * Last one wins, because a card can only quote one price per destination and
 * the later line is the correction. Says so rather than silently dropping one.
 */
function dedupe(rows: RateEntry[], errors: string[]): RateEntry[] {
  const byName = new Map<string, RateEntry>();
  for (const row of rows) {
    const key = row.destination.toLowerCase();
    const seen = byName.get(key);
    if (seen && seen.price !== row.price) {
      errors.push(`"${row.destination}" was given twice; using ${row.price}.`);
    }
    byName.set(key, row);
  }
  return [...byName.values()];
}

/** Turns stored rows back into the one-line form, so editing round-trips. */
export function formatRateList(rows: RateEntry[]): string {
  return rows.map((r) => `${r.destination} ${formatRate(r.price)}`).join(", ");
}

/** "5" rather than "5.00"; "7.50" when the cents matter. */
export function formatRate(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

export type RateGroup = { destinations: string[]; price: number };

/**
 * Collapses destinations that cost the same into one row.
 *
 * A rate card with eight cities and three prices reads as three facts, not
 * eight, and a pharmacy scanning it wants the prices — the cities are how it
 * finds its own. So "Brampton, Mississauga, Caledon — $7" rather than three
 * lines saying $7.
 *
 * Groups keep the order their first member was entered in, and cities keep
 * theirs within a group, so the admin's ordering is what gets published
 * rather than something sorted out from under them.
 */
export function groupRatesByPrice(rows: RateEntry[]): RateGroup[] {
  const groups = new Map<number, RateGroup>();
  for (const row of rows) {
    const group = groups.get(row.price);
    if (group) group.destinations.push(row.destination);
    else groups.set(row.price, { destinations: [row.destination], price: row.price });
  }
  return [...groups.values()];
}
