// Utilities for exporting on-screen figures (SVG / canvas) as PNG snapshots.
//
// Every export gets an attribution strip along the bottom. The data behind a
// figure is CC BY 4.0, so a figure that leaves the site needs to carry its
// credit with it - readers rarely follow a link back to a licence page.

import { PROJECT } from "@/lib/citation";

const CREDIT_HEIGHT = 20; // CSS px, before the export scale factor
const CREDIT_URL = PROJECT.url.replace(/^https?:\/\//, "");
// Longest first; the first variant that fits the figure width is used.
const CREDIT_VARIANTS = [
  `HelioHistory – ${PROJECT.tagline} · ${PROJECT.dataLicense} · ${CREDIT_URL}`,
  `HelioHistory · ${PROJECT.dataLicense} · ${CREDIT_URL}`,
  `HelioHistory · ${PROJECT.dataLicense}`,
];

/** Draw the attribution strip into the bottom CREDIT_HEIGHT px of a canvas (in CSS px units). */
function drawCredit(ctx: CanvasRenderingContext2D, width: number, height: number, background: string) {
  const dark = isDark(background);
  ctx.fillStyle = background;
  ctx.fillRect(0, height - CREDIT_HEIGHT, width, CREDIT_HEIGHT);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  ctx.fillRect(0, height - CREDIT_HEIGHT, width, 1);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const text = CREDIT_VARIANTS.find((t) => ctx.measureText(t).width <= width - 16) ?? CREDIT_VARIANTS[CREDIT_VARIANTS.length - 1];
  ctx.fillText(text, 8, height - CREDIT_HEIGHT / 2);
}

/**
 * Whether a CSS colour is dark. Resolved by painting it, since modern CSS
 * (Tailwind v4 emits lab()/oklch()) can't be parsed with an rgb() regex.
 */
function isDark(cssColor: string): boolean {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d");
  if (!ctx) return true;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Solid page background colour, so exported figures aren't transparent. */
export function getFigureBackground(): string {
  if (typeof window === "undefined") return "#ffffff";
  const bg = getComputedStyle(document.body).backgroundColor;
  // Fall back to white if the body is transparent for some reason.
  if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return "#ffffff";
  return bg;
}

/** Render an on-screen <svg> to a PNG and download it. */
export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  opts: { scale?: number; background?: string } = {}
): Promise<void> {
  const scale = opts.scale ?? 2;
  const background = opts.background ?? getFigureBackground();

  const rect = svg.getBoundingClientRect();
  const width = svg.width?.baseVal?.value || rect.width || 400;
  const height = svg.height?.baseVal?.value || rect.height || 200;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const source = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to render figure"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round((height + CREDIT_HEIGHT) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    drawCredit(ctx, width, height + CREDIT_HEIGHT, background);

    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, filename);
        resolve();
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Download an on-screen <canvas> as a PNG. */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
  background?: string
): void {
  // Source canvases are drawn at devicePixelRatio; keep that scale for the strip.
  const dpr = window.devicePixelRatio || 1;
  const bg = background ?? getFigureBackground();
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height + Math.round(CREDIT_HEIGHT * dpr);
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  ctx.scale(dpr, dpr);
  drawCredit(ctx, canvas.width / dpr, out.height / dpr, bg);
  out.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  }, "image/png");
}
