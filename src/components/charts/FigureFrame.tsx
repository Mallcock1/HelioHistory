"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadSvgAsPng } from "@/lib/figure-download";

interface FigureFrameProps {
  /** File name (without extension) for the downloaded PNG. */
  filename: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a figure (containing an <svg>) and overlays an unobtrusive
 * download button that exports the current snapshot as a PNG.
 */
export default function FigureFrame({
  filename,
  className,
  children,
}: FigureFrameProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = ref.current?.querySelector("svg");
    if (svg) downloadSvgAsPng(svg as SVGSVGElement, filename);
  };

  return (
    <div ref={ref} className={cn("relative group/fig", className)}>
      {children}
      <button
        type="button"
        onClick={handleDownload}
        title="Download PNG"
        aria-label="Download figure as PNG"
        className="absolute top-1 right-1 p-1 rounded-md text-foreground/30 hover:text-foreground/70 bg-overlay/5 hover:bg-overlay/10 border border-overlay/10 opacity-0 group-hover/fig:opacity-100 focus-visible:opacity-100 transition-all"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
