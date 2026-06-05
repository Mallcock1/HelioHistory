/**
 * Downloads the latest SILSO monthly mean total sunspot number CSV and writes it
 * to data/sunspots/SN_m_tot_V2.0.csv. Run scripts/build-sunspots.mts afterwards
 * to regenerate src/data/sunspots-monthly.ts.
 *
 *   npx tsx scripts/fetch-sunspots.mts && npx tsx scripts/build-sunspots.mts
 *
 * Source: WDC-SILSO, Royal Observatory of Belgium, Brussels.
 *
 * Uses node:https with a generous timeout and retries rather than global fetch,
 * because the SILSO server (www.sidc.be) is frequently slow to accept
 * connections from datacenter IPs and trips fetch's default 10s connect timeout.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const SILSO_URL = "https://www.sidc.be/SILSO/INFO/snmtotcsv.php";
const TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 4;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "data", "sunspots", "SN_m_tot_V2.0.csv");

function download(url: string, redirectsLeft = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(
      url,
      {
        headers: {
          "User-Agent": "HelioHistory-data-bot/1.0 (+https://github.com/Mallcock1/HelioHistory)",
          Accept: "text/csv,text/plain,*/*",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
          res.resume();
          resolve(download(new URL(location, url).toString(), redirectsLeft - 1));
          return;
        }
        if (status !== 200) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timed out after ${TIMEOUT_MS}ms`)));
    req.on("error", reject);
  });
}

let csv: string | undefined;
let lastErr: unknown;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    csv = await download(SILSO_URL);
    break;
  } catch (err) {
    lastErr = err;
    console.warn(`SILSO fetch attempt ${attempt}/${MAX_ATTEMPTS} failed: ${(err as Error).message}`);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 4000)); // 4s, 8s, 12s backoff
    }
  }
}

if (csv === undefined) {
  throw new Error(`SILSO fetch failed after ${MAX_ATTEMPTS} attempts: ${(lastErr as Error)?.message}`);
}

// Sanity check so we never overwrite good data with a garbage/HTML error page.
const lines = csv.trim().split(/\r?\n/);
if (lines.length < 3000 || !/^\d{4};\d{2};/.test(lines[0])) {
  throw new Error(
    `SILSO response did not look like the expected CSV (${lines.length} lines, first: "${lines[0]?.slice(0, 40)}")`
  );
}

writeFileSync(outPath, csv.endsWith("\n") ? csv : csv + "\n", "utf8");
console.log(`Fetched ${lines.length} rows (${csv.length} bytes) -> ${outPath}`);
