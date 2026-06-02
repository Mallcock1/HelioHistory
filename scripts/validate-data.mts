/**
 * Validates every canonical event file (data/events/*.json) against
 * schema/event.schema.json, and enforces project-specific integrity rules:
 *   - filename must equal the event's id
 *   - ids and slugs must be unique
 *   - every quantitative event should cite at least one source (warning)
 *
 * Exits non-zero on any error, so it can gate CI and the build.
 * Run with:  npm run data:validate
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const eventsDir = join(repoRoot, "data", "events");
const schemaPath = join(repoRoot, "schema", "event.schema.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = readdirSync(eventsDir).filter((f) => f.endsWith(".json"));
const errors: string[] = [];
const warnings: string[] = [];
const ids = new Map<string, string>();
const slugs = new Map<string, string>();

for (const file of files) {
  const path = join(eventsDir, file);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${file}: invalid JSON: ${(e as Error).message}`);
    continue;
  }

  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      errors.push(`${file}: ${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  const id = data.id as string;
  const slug = data.slug as string;

  if (id && `${id}.json` !== basename(file)) {
    errors.push(`${file}: filename must match id "${id}" (expected ${id}.json)`);
  }
  if (id) {
    if (ids.has(id)) errors.push(`${file}: duplicate id "${id}" (also in ${ids.get(id)})`);
    ids.set(id, file);
  }
  if (slug) {
    if (slugs.has(slug)) errors.push(`${file}: duplicate slug "${slug}" (also in ${slugs.get(slug)})`);
    slugs.set(slug, file);
  }

  // Sourcing guidance: an event making quantitative claims should cite something.
  const hasNumbers = ["peakDst", "peakKp", "cmeSpeedKmS", "flareClass"].some(
    (k) => data[k] !== null && data[k] !== undefined
  );
  const papers = (data.papers as unknown[]) ?? [];
  if (hasNumbers && papers.length === 0) {
    warnings.push(`${file}: quantitative event has no entries in "papers" (add a citable source)`);
  }
}

if (warnings.length) {
  console.warn(`\n⚠  ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn("   " + w);
}

if (errors.length) {
  console.error(`\n✖  ${errors.length} validation error(s):`);
  for (const e of errors) console.error("   " + e);
  process.exit(1);
}

console.log(`\n✓  ${files.length} event files valid against schema/event.schema.json`);
