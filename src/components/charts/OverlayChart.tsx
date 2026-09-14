"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import type { TimeSeriesDataPoint } from "@/lib/types";
import FigureFrame from "@/components/charts/FigureFrame";

export interface OverlaySeries {
  id: string;
  name: string;
  color: string;
  data: TimeSeriesDataPoint[];
}

interface OverlayChartProps {
  series: OverlaySeries[];
  /** Y-axis title, e.g. "Dst Index (nT)". */
  yLabel: string;
  /**
   * Which point each series is aligned on: its minimum ("min", e.g. Dst) or its
   * maximum ("max", e.g. Kp). That point becomes t = 0 on the shared x-axis.
   */
  alignOn: "min" | "max";
  /** Fixed y-domain; defaults to the padded extent across all series. */
  yDomain?: [number, number];
  /**
   * Hours shown either side of t = 0. Long event windows (e.g. the two-week
   * Halloween 2003 series) would otherwise squash the storm itself.
   */
  window?: [number, number];
  /** Used until the container has been measured; the chart then fills its parent. */
  width?: number;
  height?: number;
  downloadName?: string;
}

/** Distinct hues for up to four overlaid events, independent of phenomenon type. */
export const OVERLAY_COLORS = ["#4ade80", "#60a5fa", "#f59e0b", "#f472b6"];

const HOUR_MS = 3_600_000;
// Module constant so the default does not change identity on every render.
const DEFAULT_WINDOW: [number, number] = [-36, 96];

/**
 * Several events' time series on one pair of axes. Time is measured in hours
 * from each series' own peak (a superposed-epoch view), so storms of different
 * dates and durations can be compared directly; the y-axis is shared.
 */
export default function OverlayChart({
  series,
  yLabel,
  alignOn,
  yDomain,
  window: hoursWindow = DEFAULT_WINDOW,
  width: initialWidth = 720,
  height = 260,
  downloadName = "comparison",
}: OverlayChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);

  // Fill the parent's width, re-measuring on resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    if (!svgRef.current || series.length === 0) return;
    const isDark = document.documentElement.classList.contains("dark");
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Legend rows live in the top margin so they never sit on the lines.
    const legendItems = series.map((s) => ({ ...s, label: s.name.length > 34 ? s.name.slice(0, 33) + "…" : s.name }));
    const itemWidth = (label: string) => 18 + label.length * 6.5 + 16;
    const rows: (typeof legendItems)[] = [[]];
    let rowWidth = 0;
    for (const item of legendItems) {
      const iw = itemWidth(item.label);
      if (rowWidth + iw > width - 68 && rows[rows.length - 1].length > 0) { rows.push([]); rowWidth = 0; }
      rows[rows.length - 1].push(item);
      rowWidth += iw;
    }
    const margin = { top: 12 + rows.length * 16, right: 16, bottom: 40, left: 52 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Re-express every series as (hours from its peak, value).
    const aligned = series.map((s) => {
      const values = s.data.map((d) => d.value);
      const peakIdx = alignOn === "min" ? d3.minIndex(values) : d3.maxIndex(values);
      const t0 = new Date(s.data[peakIdx].time).getTime();
      return {
        ...s,
        points: s.data
          .map((d) => ({ t: (new Date(d.time).getTime() - t0) / HOUR_MS, v: d.value }))
          .filter((p) => p.t >= hoursWindow[0] && p.t <= hoursWindow[1]),
      };
    });

    const allT = aligned.flatMap((s) => s.points.map((p) => p.t));
    const allV = aligned.flatMap((s) => s.points.map((p) => p.v));
    const xScale = d3.scaleLinear().domain(d3.extent(allT) as [number, number]).range([0, w]);
    const [vMin, vMax] = d3.extent(allV) as [number, number];
    const yScale = d3
      .scaleLinear()
      .domain(yDomain ?? [Math.min(vMin * 1.1, 0), Math.max(vMax * 1.1, 0)])
      .range([h, 0]);

    // Grid + axes
    const axisText = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
    const gridLine = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(-h).tickFormat((d) => `${d}h`))
      .call((ax) => {
        ax.select(".domain").remove();
        ax.selectAll("line").attr("stroke", gridLine);
        ax.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-w))
      .call((ax) => {
        ax.select(".domain").remove();
        ax.selectAll("line").attr("stroke", gridLine);
        ax.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });

    // Zero-value line (Dst baseline) and the t = 0 alignment line
    if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", yScale(0)).attr("y2", yScale(0))
        .attr("stroke", isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)")
        .attr("stroke-dasharray", "3,3");
    }
    g.append("line")
      .attr("x1", xScale(0)).attr("x2", xScale(0)).attr("y1", 0).attr("y2", h)
      .attr("stroke", isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)")
      .attr("stroke-dasharray", "4,3");

    // Axis titles
    g.append("text")
      .attr("x", w / 2).attr("y", h + 34)
      .attr("text-anchor", "middle")
      .attr("fill", axisText).attr("font-size", "11px")
      .text(`Hours from ${alignOn === "min" ? "minimum" : "maximum"} (t = 0)`);
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("fill", axisText).attr("font-size", "12px")
      .text(yLabel);

    // Series lines
    const line = d3
      .line<{ t: number; v: number }>()
      .x((p) => xScale(p.t))
      .y((p) => yScale(p.v))
      .curve(d3.curveMonotoneX);
    for (const s of aligned) {
      g.append("path")
        .datum(s.points)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 1.8)
        .attr("stroke-linejoin", "round")
        .attr("d", line);
    }

    // Legend in the top margin
    const legend = svg.append("g").attr("transform", `translate(${margin.left}, 4)`);
    rows.forEach((row, r) => {
      let x = 0;
      for (const item of row) {
        const gItem = legend.append("g").attr("transform", `translate(${x}, ${r * 16})`);
        gItem.append("rect").attr("x", 0).attr("y", 2).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", item.color);
        gItem.append("text")
          .attr("x", 16).attr("y", 11)
          .attr("fill", isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)")
          .attr("font-size", "11px")
          .text(item.label);
        x += itemWidth(item.label);
      }
    });
  }, [series, yLabel, alignOn, yDomain, hoursWindow, width, height]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handler = () => drawRef.current?.();
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  useEffect(() => {
    drawRef.current = draw;
  });

  return (
    <div ref={wrapRef} className="w-full">
      <FigureFrame filename={downloadName}>
        <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
      </FigureFrame>
    </div>
  );
}
