import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ServiceClient } from "@getmed/db/service";
import { DEFAULT_SETTINGS, getPlatformSettings } from "./settings.ts";

/** Just enough of the client for `from(...).select(...).eq(...).maybeSingle()`. */
function dbReturning(row: unknown): ServiceClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: row }),
  };
  return { from: () => chain } as unknown as ServiceClient;
}

test("a column the database has not been migrated for yet falls back to its default", async () => {
  // The window where code has reached an environment and its migration has
  // not. The row is there, so it used to be returned raw and the setting came
  // back undefined — which is what made the admin field render blank.
  const { search_result_limit: _dropped, ...withoutTheColumn } = DEFAULT_SETTINGS;
  const s = await getPlatformSettings(dbReturning({ ...withoutTheColumn, sla_minutes: 45 }));
  assert.equal(s.search_result_limit, 10, "falls back rather than coming back undefined");
  assert.equal(s.sla_minutes, 45, "and the columns that do exist still win");
});

test("stored values beat the defaults", async () => {
  const s = await getPlatformSettings(dbReturning({ ...DEFAULT_SETTINGS, search_result_limit: 25 }));
  assert.equal(s.search_result_limit, 25);
});

test("a nullable column stored as null stays null", async () => {
  // launched_at is the pre-launch state and must not be filled in by a merge.
  const s = await getPlatformSettings(dbReturning({ ...DEFAULT_SETTINGS, launched_at: null }));
  assert.equal(s.launched_at, null);
});

test("an empty table still gives a complete settings row", async () => {
  assert.deepEqual(await getPlatformSettings(dbReturning(null)), DEFAULT_SETTINGS);
});

test("every setting the app reads has a default to fall back to", async () => {
  // The guarantee the merge rests on: a row of defaults is a complete row.
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    assert.notEqual(value, undefined, `${key} has no default`);
  }
});
