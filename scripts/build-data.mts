/**
 * Compiles the canonical per-event JSON files (data/events/*.json) into:
 *   - src/data/events.generated.ts  → typed array consumed by the Next.js app
 *   - public/data/events.json       → full dataset for download / API
 *   - public/data/events.csv        → flattened core fields for spreadsheets / pandas
 *   - public/data/event.schema.json → copy of the schema next to the data
 *
 * Run with:  npm run data:build   (also runs automatically via "prebuild")
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const eventsDir = join(repoRoot, "data", "events");
const publicDataDir = join(repoRoot, "public", "data");
const generatedFile = join(repoRoot, "src", "data", "events.generated.ts");
const schemaFile = join(repoRoot, "schema", "event.schema.json");

type Event = Record<string, unknown> & { id: string; startDate: string };

function loadEvents(): Event[] {
  const files = readdirSync(eventsDir).filter((f) => f.endsWith(".json"));
  const events = files.map((f) => JSON.parse(readFileSync(join(eventsDir, f), "utf8")) as Event);
  // Deterministic chronological order. Handles BC dates ("-0660-01-01") and AD.
  const yearOf = (e: Event) => {
    const neg = e.startDate.startsWith("-");
    const body = neg ? e.startDate.slice(1) : e.startDate;
    const y = parseInt(body, 10);
    return neg ? -y : y;
  };
  events.sort((a, b) => yearOf(a) - yearOf(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return events;
}

function writeGenerated(events: Event[]) {
  const banner =
    "// AUTO-GENERATED from data/events/*.json by scripts/build-data.mts.\n" +
    "// Do NOT edit by hand. Edit the source JSON files and run `npm run data:build`.\n\n";
  const body =
    'import type { SpaceWeatherEvent } from "@/lib/types";\n\n' +
    "export const EVENTS: SpaceWeatherEvent[] = " +
    JSON.stringify(events, null, 2) +
    ";\n";
  writeFileSync(generatedFile, banner + body, "utf8");
}

// ---- CSV flattening of the scalar "core" fields used for analysis ----
const CSV_COLUMNS = [
  "id", "name", "startDate", "peakDate", "endDate", "durationHours",
  "noaaGScale", "noaaSScale", "noaaRScale",
  "peakDst", "peakKp", "peakAp", "peakAE", "flareClass",
  "cmeSpeedKmS", "solarWindSpeedPeak", "bzMin", "protonFluxPeak",
  "solarCycleNumber", "cyclePhase", "sourceActiveRegion", "sunspotNumberDaily",
  "auroraLowestLatitude", "phenomena", "impactCount", "paperCount",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(events: Event[]) {
  const rows = [CSV_COLUMNS.join(",")];
  for (const e of events) {
    const phenomena = Array.isArray(e.phenomena)
      ? (e.phenomena as { type: string }[]).map((p) => p.type).join("|")
      : "";
    const record: Record<string, unknown> = {
      ...e,
      phenomena,
      impactCount: Array.isArray(e.impacts) ? e.impacts.length : 0,
      paperCount: Array.isArray(e.papers) ? e.papers.length : 0,
    };
    rows.push(CSV_COLUMNS.map((c) => csvCell(record[c])).join(","));
  }
  writeFileSync(join(publicDataDir, "events.csv"), rows.join("\n") + "\n", "utf8");
}

const events = loadEvents();
mkdirSync(publicDataDir, { recursive: true });

writeGenerated(events);
writeFileSync(join(publicDataDir, "events.json"), JSON.stringify(events, null, 2) + "\n", "utf8");
writeCsv(events);
copyFileSync(schemaFile, join(publicDataDir, "event.schema.json"));

console.log(
  `Built ${events.length} events → src/data/events.generated.ts, public/data/{events.json,events.csv,event.schema.json}`
);
