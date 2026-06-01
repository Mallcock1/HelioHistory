"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TimeSeriesDataPoint } from "@/lib/types";

interface KpChartProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
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
}: KpChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawRef = useRef<(() => void) | null>(null);

  const draw = useCallback(() => {
    if (!svgRef.current || data.length === 0) return;
    const isDark = document.documentElement.classList.contains("dark");

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 16, right: 16, bottom: 28, left: 32 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const times = data.map((d) => new Date(d.time));
    const barWidth = Math.max(4, w / data.length - 1);

    const xScale = d3
      .scaleBand<number>()
      .domain(d3.range(data.length))
      .range([0, w])
      .padding(0.15);

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
      .attr("x", (_, i) => xScale(i) || 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
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
          .attr("font-size", "9px");
        g.select(".domain").remove();
      });

    // X axis labels (sparse)
    const step = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += step) {
      const x = (xScale(i) || 0) + xScale.bandwidth() / 2;
      const d = times[i];
      g.append("text")
        .attr("x", x)
        .attr("y", h + 16)
        .attr("text-anchor", "middle")
        .attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
        .attr("font-size", "9px")
        .text(
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
    }

    // Label
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 12)
      .attr("fill", isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "10px")
      .text("Kp Index (3-hour)");
  }, [data, width, height]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handler = () => drawRef.current?.();
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  drawRef.current = draw;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="overflow-visible"
    />
  );
}
