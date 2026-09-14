/**
 * Generates the site icons from the nav-bar sun mark:
 *   src/app/icon.svg        - favicon for modern browsers (any size)
 *   src/app/icon.png        - 32x32 fallback
 *   src/app/apple-icon.png  - 180x180 for iOS home screens
 *   src/app/favicon.ico     - /favicon.ico for crawlers and older browsers
 *                             (a PNG wrapped in an ICO container)
 *
 *   npx tsx scripts/build-icons.mts
 *
 * Next.js App Router picks these up by filename convention and emits the
 * <link rel="icon"> tags automatically. The mark is a simplified version of
 * NavBar's SunIcon: same gradients and palette, larger body and four bolder
 * rays so it still reads at 16 px.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, "..", "src", "app");

const rays = [0, 90, 180, 270]
  .map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x1 = (20 + 13 * Math.cos(a)).toFixed(2);
    const y1 = (20 + 13 * Math.sin(a)).toFixed(2);
    const x2 = (20 + 19 * Math.cos(a)).toFixed(2);
    const y2 = (20 + 19 * Math.sin(a)).toFixed(2);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>`;
  })
  .join("\n  ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <radialGradient id="corona"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>
    <radialGradient id="body"><stop offset="0%" stop-color="#fbbf24"/><stop offset="60%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></radialGradient>
    <radialGradient id="core"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0.6"/></radialGradient>
  </defs>
  <circle cx="20" cy="20" r="20" fill="url(#corona)" opacity="0.5"/>
  ${rays}
  <circle cx="20" cy="20" r="11.5" fill="url(#body)"/>
  <circle cx="20" cy="20" r="5.5" fill="url(#core)"/>
</svg>
`;

writeFileSync(join(appDir, "icon.svg"), svg, "utf8");
const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
writeFileSync(join(appDir, "icon.png"), png32);
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(join(appDir, "apple-icon.png"));

// ICO container around the 32px PNG: 6-byte header, one 16-byte directory entry, image data.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0); // width
entry.writeUInt8(32, 1); // height
entry.writeUInt8(0, 2); // palette
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png32.length, 8); // image size
entry.writeUInt32LE(6 + 16, 12); // image offset
writeFileSync(join(appDir, "favicon.ico"), Buffer.concat([header, entry, png32]));

console.log("Wrote src/app/icon.svg, icon.png (32px), apple-icon.png (180px), favicon.ico");
