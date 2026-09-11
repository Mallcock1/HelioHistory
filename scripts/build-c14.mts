/**
 * Generates src/data/sunspots-c14.ts: annual sunspot numbers for 971-1899
 * reconstructed from tree-ring radiocarbon (14C), with 1-sigma uncertainties.
 *
 *   npx tsx scripts/build-c14.mts
 *
 * Source (committed under data/sunspots/):
 *   usoskin2021_osn.csv - table "osn" of CDS catalogue J/A+A/649/A141,
 *     Usoskin, Solanki, Krivova, Hofer, Kovaltsov, Wacker, Brehm & Kromer (2021),
 *     "Solar cyclic activity over the last millennium reconstructed from annual
 *     14C data", A&A 649, A141. doi:10.1051/0004-6361/202140711
 *   Fetched via the VizieR TAP service:
 *     http://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?REQUEST=doQuery&LANG=ADQL
 *       &FORMAT=csv&QUERY=SELECT+*+FROM+"J/A+A/649/A141/osn"
 *
 * This is a physics-based reconstruction, not an observation: values are
 * "pseudo sunspot numbers" and can be negative when activity is below the
 * sunspot-formation threshold (i.e. during grand minima). Raw values and
 * sigmas are preserved here; clamping to zero is a display decision.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = join(__dirname, "..", "data", "sunspots", "usoskin2021_osn.csv");
const outPath = join(__dirname, "..", "src", "data", "sunspots-c14.ts");

const lines = readFileSync(inPath, "utf8").split(/\r?\n/);
const header = lines[0].split(",");
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Column ${name} not found in ${inPath}`);
  return i;
};
const iYear = col("Year");
const iSN = col("SN");
const iSig = col("e_SN");

const rows: [number, number, number][] = [];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const f = line.split(",");
  const year = parseInt(f[iYear], 10);
  const sn = parseFloat(f[iSN]);
  const sig = parseFloat(f[iSig]);
  if ([year, sn, sig].some(Number.isNaN)) throw new Error(`Bad row: ${line}`);
  rows.push([year, sn, sig]);
}
rows.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < rows.length; i++) {
  if (rows[i][0] !== rows[i - 1][0] + 1) throw new Error(`Gap in series at ${rows[i][0]}`);
}

const first = rows[0][0];
const last = rows[rows.length - 1][0];
const body = rows.map(([y, s, e]) => `  [${y}, ${s}, ${e}],`).join("\n");
const out =
  "// AUTO-GENERATED from data/sunspots/usoskin2021_osn.csv by scripts/build-c14.mts.\n" +
  "// Do NOT edit by hand.\n" +
  "//\n" +
  `// Annual sunspot numbers ${first}-${last} reconstructed from tree-ring 14C, with\n` +
  "// 1-sigma uncertainties: [year, SN, sigma]. A physics-based reconstruction,\n" +
  "// not an observation - values can be negative when activity is below the\n" +
  "// sunspot-formation threshold (grand minima); clamp at display time.\n" +
  "// Source: Usoskin et al. (2021), A&A 649, A141, CDS J/A+A/649/A141.\n" +
  "// doi:10.1051/0004-6361/202140711\n\n" +
  "export const SUNSPOT_C14: [number, number, number][] = [\n" +
  body +
  "\n];\n";

writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${rows.length} years (${first}-${last}) -> ${outPath}`);
