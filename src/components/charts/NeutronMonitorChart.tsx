"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TimeSeriesDataPoint } from "@/lib/types";
import FigureFrame from "@/components/charts/FigureFrame";

interface NeutronMonitorChartProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
  downloadName?: string;
  /** Optional shared x-domain (epoch ms) so multiple charts align in time. */
  domain?: [number, number];
  /** Left margin, overridable to align plot areas across charts. */
  marginLeft?: number;
}

export default function NeutronMonitorChart({
  data,
  width = 420,
  height = 180,
  downloadName = "neutron-monitor",
  domain,
  marginLeft = 48,
}: NeutronMonitorChartProps) {
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

    const yMin = d3.min(values) || -5;
    const yMax = d3.max(values) || 5;
    const padding = Math.max(Math.abs(yMax - yMin) * 0.1, 0.5);
    const yScale = d3.scaleLinear().domain([yMin - padding, yMax + padding]).range([h, 0]);

    // Zero baseline
    g.append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)")
      .attr("stroke-dasharray", "3,3");

    // Area fill – positive = GLE enhancement (purple), negative = Forbush decrease (blue)
    const areaAbove = d3
      .area<TimeSeriesDataPoint>()
      .x((d) => xScale(new Date(d.time)))
      .y0(yScale(0))
      .y1((d) => yScale(Math.max(0, d.value)))
      .curve(d3.curveCatmullRom);

    const areaBelow = d3
      .area<TimeSeriesDataPoint>()
      .x((d) => xScale(new Date(d.time)))
      .y0(yScale(0))
      .y1((d) => yScale(Math.min(0, d.value)))
      .curve(d3.curveCatmullRom);

    const defs = svg.append("defs");

    const gradUp = defs.append("linearGradient")
      .attr("id", "nm-grad-up").attr("x1", "0").attr("y1", "1").attr("x2", "0").attr("y2", "0");
    gradUp.append("stop").attr("offset", "0%").attr("stop-color", "#a855f7").attr("stop-opacity", 0.05);
    gradUp.append("stop").attr("offset", "100%").attr("stop-color", "#a855f7").attr("stop-opacity", 0.35);

    const gradDown = defs.append("linearGradient")
      .attr("id", "nm-grad-down").attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    gradDown.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.05);
    gradDown.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.35);

    g.append("path").datum(data).attr("d", areaAbove).attr("fill", "url(#nm-grad-up)");
    g.append("path").datum(data).attr("d", areaBelow).attr("fill", "url(#nm-grad-down)");

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
      .attr("stroke", "#a855f7")
      .attr("stroke-width", 2);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickSize(-h);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(-w);

    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis)
      .call((g) => {
        g.selectAll("line").attr("stroke", isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
        g.selectAll("text").attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)").attr("font-size", "11px");
        g.select(".domain").remove();
      });

    g.append("g")
      .call(yAxis)
      .call((g) => {
        g.selectAll("line").attr("stroke", isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
        g.selectAll("text").attr("fill", isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)").attr("font-size", "11px");
        g.select(".domain").remove();
      });

    // Label
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 12)
      .attr("fill", isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "12px")
      .text("Neutron Monitor (% deviation)");

    // Peak annotation
    const maxIdx = values.indexOf(d3.max(values)!);
    if (maxIdx >= 0 && values[maxIdx] > 0) {
      const peakX = xScale(times[maxIdx]);
      const peakY = yScale(values[maxIdx]);
      g.append("circle").attr("cx", peakX).attr("cy", peakY).attr("r", 3).attr("fill", "#a855f7");
      g.append("text")
        .attr("x", peakX + 6).attr("y", peakY - 6)
        .attr("fill", "#a855f7").attr("font-size", "11px").attr("font-weight", "bold")
        .text(`+${values[maxIdx].toFixed(1)}%`);
    }
  }, [data, width, height, domain, marginLeft]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handler = () => drawRef.current?.();
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  drawRef.current = draw;

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
