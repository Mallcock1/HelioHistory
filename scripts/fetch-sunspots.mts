/**
 * Downloads the latest SILSO monthly mean total sunspot number CSV and writes it
 * to data/sunspots/SN_m_tot_V2.0.csv. Run scripts/build-sunspots.mts afterwards
 * to regenerate src/data/sunspots-monthly.ts.
 *
 *   npx tsx scripts/fetch-sunspots.mts && npx tsx scripts/build-sunspots.mts
 *
 * Source: WDC-SILSO, Royal Observatory of Belgium, Brussels.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SILSO_URL = "https://www.sidc.be/SILSO/INFO/snmtotcsv.php";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "data", "sunspots", "SN_m_tot_V2.0.csv");

const res = await fetch(SILSO_URL);
if (!res.ok) {
  throw new Error(`SILSO fetch failed: HTTP ${res.status} ${res.statusText}`);
}
const csv = await res.text();

// Sanity checks so we never overwrite good data with a garbage/HTML error page.
const lines = csv.trim().split(/\r?\n/);
if (lines.length < 3000 || !/^\d{4};\d{2};/.test(lines[0])) {
  throw new Error(
    `SILSO response did not look like the expected CSV (${lines.length} lines, first: "${lines[0]?.slice(0, 40)}")`
  );
}

writeFileSync(outPath, csv.endsWith("\n") ? csv : csv + "\n", "utf8");
console.log(`Fetched ${lines.length} rows (${csv.length} bytes) -> ${outPath}`);
