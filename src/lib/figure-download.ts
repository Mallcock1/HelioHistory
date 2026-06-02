// Utilities for exporting on-screen figures (SVG / canvas) as PNG snapshots.

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
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

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
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = background ?? getFigureBackground();
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  out.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  }, "image/png");
}
