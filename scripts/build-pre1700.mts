/**
 * Generates src/data/sunspots-pre1700.ts: telescopic-era annual sunspot activity
 * for 1610-1699 (covering the Maunder Minimum), reconstructed from the SILSO
 * yearly GROUP number and rescaled into sunspot-number units using the 1700+
 * overlap with the international sunspot number.
 *
 *   npx tsx scripts/build-pre1700.mts
 *
 * Sources (committed under data/sunspots/):
 *   GN_y_V3.0.csv      - SILSO yearly mean group number (1610-2015)
 *   SN_y_tot_V2.0.csv  - SILSO yearly mean total sunspot number (1700-present)
 *   WDC-SILSO, Royal Observatory of Belgium, Brussels (https://www.sidc.be/SILSO/).
 *
 * The group number is a distinct quantity from the sunspot number; the linear
 * rescaling here is for visual continuity of the timeline backdrop only, and the
 * pre-1700 segment should be read as a telescopic reconstruction.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "data", "sunspots");
const outPath = join(__dirname, "..", "src", "data", "sunspots-pre1700.ts");

function parse(file: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const line of readFileSync(join(dir, file), "utf8").split(/\r?\n/)) {
    const f = line.split(";");
    const t = parseFloat(f[0]);
    const v = parseFloat(f[1]);
    if (Number.isNaN(t) || Number.isNaN(v) || v < 0) continue;
    m.set(Math.floor(t), v);
  }
  return m;
}

const gn = parse("GN_y_V3.0.csv");
const sn = parse("SN_y_tot_V2.0.csv");

// Least-squares scale through the origin over the overlap (1700+): SN ~= k * GN.
let num = 0;
let den = 0;
for (const [year, g] of gn) {
  const s = sn.get(year);
  if (s === undefined) continue;
  num += s * g;
  den += g * g;
}
const k = num / den;

const points: [number, number][] = [];
for (const [year, g] of gn) {
  if (year < 1610 || year > 1699) continue;
  points.push([year, Math.round(k * g * 10) / 10]);
}
points.sort((a, b) => a[0] - b[0]);

const rows = points.map(([y, v]) => `  { year: ${y}, value: ${v} },`).join("\n");
const out =
  "// AUTO-GENERATED from data/sunspots/{GN_y_V3.0,SN_y_tot_V2.0}.csv by\n" +
  "// scripts/build-pre1700.mts. Do NOT edit by hand.\n" +
  "//\n" +
  "// Telescopic-era annual sunspot activity, 1610-1699, reconstructed from the\n" +
  "// SILSO yearly group number rescaled into sunspot-number units (factor " +
  `${k.toFixed(2)})\n` +
  "// over the 1700+ overlap. Covers the Maunder Minimum (deep grand minimum,\n" +
  "// 1645-1715). Read as a reconstruction, not direct sunspot-number counts.\n" +
  "// Source: WDC-SILSO, Royal Observatory of Belgium, Brussels.\n\n" +
  "export const SUNSPOT_PRE1700: { year: number; value: number }[] = [\n" +
  rows +
  "\n];\n";

writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${points.length} years (1610-1699), rescale factor k=${k.toFixed(2)} -> ${outPath}`);
