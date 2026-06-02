/**
 * One-off migration: split the hand-maintained src/data/events.ts array into
 * one canonical JSON file per event under data/events/<id>.json.
 *
 * Run once with:  npx tsx scripts/migrate-events.mts
 *
 * After this, data/events/*.json is the source of truth and src/data/events.ts
 * becomes a thin re-export of the compiled dataset (see scripts/build-data.mts).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS } from "../src/data/events.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outDir = join(repoRoot, "data", "events");

mkdirSync(outDir, { recursive: true });

// Canonical key order, mirroring schema/event.schema.json, so files diff cleanly.
const KEY_ORDER = [
  "id", "slug", "name", "altNames",
  "startDate", "peakDate", "endDate", "durationHours",
  "phenomena", "noaaGScale", "noaaSScale", "noaaRScale",
  "peakDst", "peakKp", "peakAp", "peakAE", "flareClass",
  "cmeSpeedKmS", "solarWindSpeedPeak", "bzMin", "protonFluxPeak",
  "solarCycleNumber", "cyclePhase", "sourceActiveRegion", "sunspotNumberDaily",
  "impacts", "auroraLowestLatitude", "timeSeries", "images", "papers",
  "summary", "description",
];

function ordered(event: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (key in event) out[key] = event[key];
  }
  // Preserve any keys not in KEY_ORDER (should be none) so nothing is silently lost.
  for (const key of Object.keys(event)) {
    if (!(key in out)) out[key] = event[key];
  }
  return out;
}

let count = 0;
const seen = new Set<string>();
for (const event of EVENTS) {
  if (seen.has(event.id)) {
    throw new Error(`Duplicate event id: ${event.id}`);
  }
  seen.add(event.id);
  const file = join(outDir, `${event.id}.json`);
  writeFileSync(file, JSON.stringify(ordered(event as Record<string, unknown>), null, 2) + "\n", "utf8");
  count++;
}

console.log(`Wrote ${count} event files to ${outDir}`);
