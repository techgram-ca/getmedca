/**
 * Copies .env.dev into each app as .env.local.
 *
 * Next.js loads .env files from the directory it runs in, which for this
 * monorepo is apps/<name> — a file at the repo root is never read. Keeping
 * one .env.dev and fanning it out avoids editing the same key four times.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, ".env.dev");
const apps = ["patient", "pharmacy", "admin", "driver"];

if (!existsSync(source)) {
  console.error("No .env.dev at the repo root. Create one first:\n\n  cp .env.example .env.dev\n");
  process.exit(1);
}

for (const app of apps) {
  copyFileSync(source, join(root, "apps", app, ".env.local"));
  console.log(`apps/${app}/.env.local`);
}
console.log(`\nWrote ${apps.length} files from .env.dev.`);
