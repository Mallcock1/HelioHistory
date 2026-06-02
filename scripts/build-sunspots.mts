/**
 * Generates src/data/sunspots-monthly.ts from the raw SILSO monthly mean
 * total sunspot number CSV (data/sunspots/SN_m_tot_V2.0.csv).
 *
 * Source: WDC-SILSO, Royal Observatory of Belgium, Brussels.
 * Run with:  npx tsx scripts/build-sunspots.mts
 *
 * CSV columns (semicolon-separated):
 *   year ; month ; decimalYear ; SNvalue ; SNerror ; Nobs ; provisional
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const csvPath = join(repoRoot, "data", "sunspots", "SN_m_tot_V2.0.csv");
const outPath = join(repoRoot, "src", "data", "sunspots-monthly.ts");

const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);

const points: [number, number][] = [];
for (const line of lines) {
  const f = line.split(";");
  const decimalYear = parseFloat(f[2]);
  const value = parseFloat(f[3]);
  if (Number.isNaN(decimalYear) || Number.isNaN(value) || value < 0) continue;
  points.push([Math.round(decimalYear * 1000) / 1000, Math.round(value * 10) / 10]);
}

points.sort((a, b) => a[0] - b[0]);

const rows = points.map(([t, v]) => `[${t}, ${v}]`).join(", ");
const out =
  "// AUTO-GENERATED from data/sunspots/SN_m_tot_V2.0.csv by scripts/build-sunspots.mts.\n" +
  "// Do NOT edit by hand. Re-run `npx tsx scripts/build-sunspots.mts` to regenerate.\n" +
  "//\n" +
  "// Monthly mean total international sunspot number (version 2.0).\n" +
  "// Source: WDC-SILSO, Royal Observatory of Belgium, Brussels (https://www.sidc.be/SILSO/).\n" +
  "// Each entry is [decimalYear, sunspotNumber].\n\n" +
  "export const SUNSPOT_MONTHLY: [number, number][] = [\n  " +
  rows +
  ",\n];\n";

writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${points.length} monthly points to ${outPath}`);
