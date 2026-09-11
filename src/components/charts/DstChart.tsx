"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TimeSeriesDataPoint } from "@/lib/types";
import FigureFrame from "@/components/charts/FigureFrame";

interface DstChartProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
  downloadName?: string;
  /** Optional shared x-domain (epoch ms) so multiple charts align in time. */
  domain?: [number, number];
  /** Left margin, overridable to align plot areas across charts. */
  marginLeft?: number;
}

export default function DstChart({
  data,
  width = 420,
  height = 180,
  downloadName = "dst-index",
  domain,
  marginLeft = 48,
}: DstChartProps) {
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
    const values = data.map((d) => d.value);

    const xScale = d3
      .scaleTime()
      .domain(
        domain
          ? [new Date(domain[0]), new Date(domain[1])]
          : (d3.extent(times) as [Date, Date])
      )
      .range([0, w]);

    const yMin = d3.min(values) || -500;
    const yMax = Math.max(d3.max(values) || 50, 50);
    const yScale = d3.scaleLinear().domain([yMin * 1.1, yMax]).range([h, 0]);

    // Zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)")
      .attr("stroke-dasharray", "3,3");

    // Area fill below zero
    const area = d3
      .area<TimeSeriesDataPoint>()
      .x((d) => xScale(new Date(d.time)))
      .y0(yScale(0))
      .y1((d) => yScale(d.value))
      .curve(d3.curveCatmullRom);

    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "dst-gradient")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#4ade80").attr("stop-opacity", 0.05);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#4ade80").attr("stop-opacity", 0.3);

    g.append("path")
      .datum(data)
      .attr("d", area)
      .attr("fill", "url(#dst-gradient)");

    // Line
    const line = d3
      .line<TimeSeriesDataPoint>()
      .x((d) => xScale(new Date(d.time)))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom);

    g.append("path")
      .datum(data)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#4ade80")
      .attr("stroke-width", 2);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickSize(-h);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(-w);

    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis)
      .call((g) => {
        g.selectAll("line").attr("stroke", isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
        g.selectAll("text")
          .attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
          .attr("font-size", "11px");
        g.select(".domain").remove();
      });

    g.append("g")
      .call(yAxis)
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
      .text("Dst Index (nT)");

    // Peak annotation
    const minIdx = values.indexOf(d3.min(values)!);
    if (minIdx >= 0) {
      const peakX = xScale(times[minIdx]);
      const peakY = yScale(values[minIdx]);
      g.append("circle")
        .attr("cx", peakX)
        .attr("cy", peakY)
        .attr("r", 3)
        .attr("fill", "#ef4444");
      g.append("text")
        .attr("x", peakX + 6)
        .attr("y", peakY - 6)
        .attr("fill", "#ef4444")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text(`${values[minIdx]} nT`);
    }
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
