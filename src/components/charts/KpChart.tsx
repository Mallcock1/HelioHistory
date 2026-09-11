"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TimeSeriesDataPoint } from "@/lib/types";
import FigureFrame from "@/components/charts/FigureFrame";

interface KpChartProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
  downloadName?: string;
  /** Optional shared x-domain (epoch ms) so multiple charts align in time. */
  domain?: [number, number];
  /** Left margin, overridable to align plot areas across charts. */
  marginLeft?: number;
}

const KP_COLORS = [
  "#4ade80", // 0 - green
  "#4ade80", // 1
  "#4ade80", // 2
  "#4ade80", // 3
  "#facc15", // 4 - yellow
  "#f59e0b", // 5 - amber
  "#f97316", // 6 - orange
  "#ef4444", // 7 - red
  "#dc2626", // 8
  "#b91c1c", // 9 - dark red
];

export default function KpChart({
  data,
  width = 420,
  height = 140,
  downloadName = "kp-index",
  domain,
  marginLeft = 48,
}: KpChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawRef = useRef<(() => void) | null>(null);

  const draw = useCallback(() => {
    if (!svgRef.current || data.length === 0) return;
    const isDark = document.documentElement.classList.contains("dark");

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 16, right: 16, bottom: 28, left: marginLeft };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const times = data.map((d) => new Date(d.time));

    // Time-based x-axis (shared domain when provided) so Kp bars align with the
    // Dst/neutron-monitor charts above. Bars are placed at their real timestamp.
    const xScale = d3
      .scaleTime()
      .domain(
        domain
          ? [new Date(domain[0]), new Date(domain[1])]
          : (d3.extent(times) as [Date, Date])
      )
      .range([0, w]);

    // Bar width derived from the tightest observed cadence, so bars never overlap.
    const sortedMs = times.map((t) => +t).sort((a, b) => a - b);
    let minDt = Infinity;
    for (let i = 1; i < sortedMs.length; i++) {
      minDt = Math.min(minDt, sortedMs[i] - sortedMs[i - 1]);
    }
    if (!Number.isFinite(minDt) || minDt <= 0) minDt = 3 * 3600 * 1000; // default 3h
    const t0 = sortedMs[0] ?? 0;
    const barWidth = Math.max(2, (xScale(new Date(t0 + minDt)) - xScale(new Date(t0))) * 0.8);

    const yScale = d3.scaleLinear().domain([0, 9]).range([h, 0]);

    // G-scale threshold lines
    [5, 7, 9].forEach((threshold) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", yScale(threshold))
        .attr("y2", yScale(threshold))
        .attr("stroke", isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")
        .attr("stroke-dasharray", "2,4");
    });

    // Bars
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(new Date(d.time)) - barWidth / 2)
      .attr("y", (d) => yScale(d.value))
      .attr("width", barWidth)
      .attr("height", (d) => h - yScale(d.value))
      .attr("rx", 2)
      .attr("fill", (d) => KP_COLORS[Math.min(9, Math.round(d.value))]);

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .call((g) => {
        g.selectAll("line").remove();
        g.selectAll("text")
          .attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
          .attr("font-size", "11px");
        g.select(".domain").remove();
      });

    // X axis (time): matches the Dst chart's formatting and ticks.
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-h))
      .call((g) => {
        g.selectAll("line").attr("stroke", isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
        g.selectAll("text")
          .attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
          .attr("font-size", "11px");
        g.select(".domain").remove();
      });

    // Label
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 12)
      .attr("fill", isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "12px")
      .text("Kp Index (3-hour)");
  }, [data, width, height, domain, marginLeft]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handler = () => drawRef.current?.();
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  // Keep the theme-change handler pointing at the latest draw closure (updated
  // in an effect, not during render, per react-hooks/refs).
  useEffect(() => {
    drawRef.current = draw;
  });

  return (
    <FigureFrame filename={downloadName}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
    </FigureFrame>
  );
}
