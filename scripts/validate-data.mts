/**
 * Validates every canonical event file (data/events/*.json) against
 * schema/event.schema.json, and enforces project-specific integrity rules:
 *   - filename must equal the event's id
 *   - ids and slugs must be unique
 *   - startDate <= peakDate <= endDate, and durationHours matches the date span
 *   - NOAA G/S/R scales agree with the stored Kp / proton flux / flare class
 *   - fields that predate their instrument are either null or listed in
 *     estimatedFields (Kp/Ap 1932, Dst 1957, in-situ solar wind 1962, GOES 1975)
 *   - DOIs are well-formed
 *   - every quantitative event should cite at least one source (warning)
 *
 * With --check-dois, every DOI is also resolved through CrossRef and the stored
 * title is compared with the registered one (network; run in CI, not on every
 * local validate).
 *
 * Exits non-zero on any error, so it can gate CI and the build.
 * Run with:  npm run data:validate  [-- --check-dois]
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
const doiChecks: { file: string; doi: string; title: string }[] = [];
const checkDois = process.argv.includes("--check-dois");

/** ISO-style date (leading minus = BC) to a decimal year; mirrors src/lib/timeline-utils. */
function dateToYear(dateStr: string): number {
  const neg = dateStr.startsWith("-");
  const [y, m = "1", d = "1"] = (neg ? dateStr.slice(1) : dateStr).split("-");
  return (neg ? -1 : 1) * parseInt(y, 10) + (parseInt(m, 10) - 1) / 12 + (parseInt(d, 10) - 1) / 365;
}

/** Word-overlap similarity of two titles, tolerant of punctuation and case. */
function titleSimilarity(a: string, b: string): number {
  const words = (t: string) =>
    new Set(t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w.length > 2));
  const wa = words(a);
  const wb = words(b);
  let n = 0;
  for (const w of wa) if (wb.has(w)) n++;
  return n / Math.max(1, Math.min(wa.size, wb.size));
}
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

  // ── Date ordering and duration ──
  const start = dateToYear(data.startDate as string);
  const peak = data.peakDate ? dateToYear(data.peakDate as string) : null;
  const end = dateToYear(data.endDate as string);
  if (end < start) errors.push(`${file}: endDate ${data.endDate} is before startDate ${data.startDate}`);
  if (peak !== null && (peak < start || peak > end)) {
    errors.push(`${file}: peakDate ${data.peakDate} lies outside ${data.startDate}..${data.endDate}`);
  }
  // Modern events have day-resolution dates; the convention is durationHours = calendar-day span x 24.
  if (typeof data.durationHours === "number" && start > 1600) {
    const spanHours = Math.round((end - start) * 365 * 24);
    if (Math.abs(spanHours - data.durationHours) > 36) {
      warnings.push(`${file}: durationHours ${data.durationHours} does not match the ${data.startDate}..${data.endDate} span (~${spanHours} h)`);
    }
  }

  // ── NOAA scales must agree with the stored measurement they are defined by ──
  const est = new Set((data.estimatedFields as string[] | undefined) ?? []);
  const kp = data.peakKp as number | null;
  const g = data.noaaGScale as number | null;
  if (g !== null && kp !== null) {
    const gFromKp = kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : kp >= 5 ? 1 : 0;
    if (gFromKp !== g) errors.push(`${file}: noaaGScale G${g} but peakKp ${kp} implies G${gFromKp}`);
  }
  const pfu = data.protonFluxPeak as number | null;
  const sScale = data.noaaSScale as number | null;
  if (sScale !== null && pfu !== null) {
    const sFromPfu = pfu >= 1e5 ? 5 : pfu >= 1e4 ? 4 : pfu >= 1e3 ? 3 : pfu >= 100 ? 2 : pfu >= 10 ? 1 : 0;
    if (sFromPfu !== sScale) errors.push(`${file}: noaaSScale S${sScale} but protonFluxPeak ${pfu} pfu implies S${sFromPfu}`);
  }
  const flare = data.flareClass as string | null;
  const rScale = data.noaaRScale as number | null;
  if (rScale !== null) {
    if (!flare) {
      errors.push(`${file}: noaaRScale R${rScale} but no flareClass (R-scale is defined by GOES X-ray class)`);
    } else {
      const m = /^[><]?([ABCMX])([0-9]+(?:\.[0-9]+)?)?\+?$/.exec(flare);
      if (m && m[2] !== undefined) {
        const letter = m[1];
        const mag = parseFloat(m[2]);
        const rFromFlare =
          letter === "X" ? (mag >= 20 ? 5 : mag >= 10 ? 4 : 3) : letter === "M" ? (mag >= 5 ? 2 : 1) : 0;
        if (rFromFlare !== rScale) errors.push(`${file}: noaaRScale R${rScale} but flareClass ${flare} implies R${rFromFlare}`);
      }
    }
  }

  // ── Values that predate the instrument must be null or declared estimated ──
  const instrumentStart: Record<string, number> = {
    peakKp: 1932, peakAp: 1932, peakDst: 1957, peakAE: 1957,
    solarWindSpeedPeak: 1962, bzMin: 1963, protonFluxPeak: 1965, flareClass: 1975,
  };
  for (const [field, since] of Object.entries(instrumentStart)) {
    if (data[field] !== null && data[field] !== undefined && start < since && !est.has(field)) {
      errors.push(`${file}: ${field} is set for an event before ${since} but is not listed in estimatedFields`);
    }
  }
  for (const field of est) {
    if (!(field in data) || data[field] === null) warnings.push(`${file}: estimatedFields lists ${field}, which is null or unknown`);
  }

  // ── DOI hygiene ──
  const papers = (data.papers as { doi?: string | null; title?: string }[]) ?? [];
  for (const p of papers) {
    if (p.doi && !/^10\.\d{4,9}\/\S+$/.test(p.doi)) errors.push(`${file}: malformed DOI "${p.doi}"`);
    if (p.doi) doiChecks.push({ file, doi: p.doi, title: p.title ?? "" });
  }

  // Sourcing guidance: an event making quantitative claims should cite something.
  const hasNumbers = ["peakDst", "peakKp", "cmeSpeedKmS", "flareClass"].some(
    (k) => data[k] !== null && data[k] !== undefined
  );
  if (hasNumbers && papers.length === 0) {
    warnings.push(`${file}: quantitative event has no entries in "papers" (add a citable source)`);
  }
}

// ── Optional: resolve every DOI via CrossRef and compare the registered title ──
if (checkDois) {
  const seen = new Map<string, { title: string } | null>();
  for (const { file, doi, title } of doiChecks) {
    if (!seen.has(doi)) {
      try {
        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          headers: { "User-Agent": "HelioHistory data validator (https://github.com/Mallcock1/HelioHistory)" },
        });
        seen.set(doi, res.ok ? { title: ((await res.json()).message.title?.[0] ?? "") as string } : null);
      } catch {
        seen.set(doi, null);
      }
    }
    const rec = seen.get(doi);
    if (rec === null) errors.push(`${file}: DOI ${doi} does not resolve on CrossRef`);
    else if (rec && titleSimilarity(title, rec.title) < 0.5) {
      errors.push(`${file}: DOI ${doi} resolves to "${rec.title.slice(0, 70)}", not "${title.slice(0, 70)}"`);
    }
  }
  console.log(`   checked ${seen.size} unique DOIs against CrossRef`);
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
