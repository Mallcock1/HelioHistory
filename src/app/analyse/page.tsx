"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import { EVENTS } from "@/data/events";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DataExplorer from "@/components/analyse/DataExplorer";
import type { SpaceWeatherEvent } from "@/lib/types";
import { getEventColor, getEventSeverity, formatEventDate } from "@/lib/timeline-utils";
import { PHENOMENON_CONFIG } from "@/lib/types";
import { downloadSvgAsPng } from "@/lib/figure-download";
import { Download } from "lucide-react";
type AxisParam =
  | "peakDst"
  | "peakKp"
  | "peakAp"
  | "cmeSpeedKmS"
  | "solarWindSpeedPeak"
  | "bzMin"
  | "protonFluxPeak"
  | "durationHours"
  | "auroraLowestLatitude"
  | "solarCycleNumber"
  | "impactCount"
  | "year";

const PARAM_LABELS: Record<AxisParam, string> = {
  peakDst: "Peak Dst (nT)",
  peakKp: "Peak Kp",
  peakAp: "Peak Ap",
  cmeSpeedKmS: "CME Speed (km/s)",
  solarWindSpeedPeak: "Solar Wind Speed (km/s)",
  bzMin: "Bz Min (nT)",
  protonFluxPeak: "Proton Flux Peak (pfu)",
  durationHours: "Duration (hours)",
  auroraLowestLatitude: "Aurora Lowest Lat (°)",
  solarCycleNumber: "Solar Cycle #",
  impactCount: "Number of Impacts",
  year: "Year",
};

function getParamValue(event: SpaceWeatherEvent, param: AxisParam): number | null {
  switch (param) {
    case "impactCount":
      return event.impacts.length;
    case "year":
      return parseInt(event.startDate.split("-")[0], 10);
    default:
      return (event[param] as number) ?? null;
  }
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    obs.observe(ref.current);
    setWidth(Math.floor(ref.current.clientWidth));
    return () => obs.disconnect();
  }, [ref]);
  return width;
}

function padDomain(extent: [number, number], fraction = 0.05): [number, number] {
  const range = extent[1] - extent[0];
  const pad = range === 0 ? 1 : range * fraction;
  return [extent[0] - pad, extent[1] + pad];
}

function ScatterPlot({
  events,
  xParam,
  yParam,
}: {
  events: SpaceWeatherEvent[];
  xParam: AxisParam;
  yParam: AxisParam;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    event: SpaceWeatherEvent;
    x: number;
    y: number;
    xVal: number;
    yVal: number;
  } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const drawRef = useRef<(() => void) | null>(null);

  const containerWidth = useContainerWidth(containerRef);

  const data = useMemo(() => {
    return events
      .map((e) => ({
        event: e,
        x: getParamValue(e, xParam),
        y: getParamValue(e, yParam),
      }))
      .filter((d) => d.x !== null && d.y !== null) as {
      event: SpaceWeatherEvent;
      x: number;
      y: number;
    }[];
  }, [events, xParam, yParam]);

  const drawChart = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const dark = document.documentElement.classList.contains("dark");
    const width = containerWidth;
    const height = 500;
    const margin = { top: 24, right: 32, bottom: 48, left: 72 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    // Clip path for the plot area
    svg.append("defs")
      .append("clipPath")
      .attr("id", "plot-clip")
      .append("rect")
      .attr("width", w)
      .attr("height", h);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (data.length === 0) {
      g.append("text")
        .attr("x", w / 2)
        .attr("y", h / 2)
        .attr("text-anchor", "middle")
        .attr("fill", dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)")
        .text("No data for selected parameters");
      return;
    }

    const xExtent = d3.extent(data, (d) => d.x) as [number, number];
    const yExtent = d3.extent(data, (d) => d.y) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain(padDomain(xExtent))
      .range([0, w])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain(padDomain(yExtent))
      .range([h, 0])
      .nice();

    const xScaleOrig = xScale.copy();
    const yScaleOrig = yScale.copy();

    // Grid + axes groups
    const xAxisG = g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${h})`);

    const yAxisG = g.append("g")
      .attr("class", "y-axis");

    function drawAxes() {
      xAxisG.call(d3.axisBottom(xScale).ticks(Math.floor(w / 80)).tickSize(-h))
        .call((sel) => {
          sel.selectAll("line").attr("stroke", dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
          sel.selectAll("text")
            .attr("fill", dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
            .attr("font-size", "10px");
          sel.select(".domain").remove();
        });

      yAxisG.call(d3.axisLeft(yScale).ticks(Math.floor(h / 50)).tickSize(-w))
        .call((sel) => {
          sel.selectAll("line").attr("stroke", dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
          sel.selectAll("text")
            .attr("fill", dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)")
            .attr("font-size", "10px");
          sel.select(".domain").remove();
        });
    }
    drawAxes();

    // Axis labels
    svg
      .append("text")
      .attr("x", margin.left + w / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .attr("fill", dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "11px")
      .text(PARAM_LABELS[xParam]);

    svg
      .append("text")
      .attr("x", -(margin.top + h / 2))
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "11px")
      .text(PARAM_LABELS[yParam]);

    // Clipped plot content
    const plotArea = g.append("g")
      .attr("clip-path", "url(#plot-clip)");

    // Points
    const points = plotArea.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", (d) => 4 + getEventSeverity(d.event) * 1.5)
      .attr("fill", (d) => getEventColor(d.event) + "88")
      .attr("stroke", (d) => getEventColor(d.event))
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 4 + getEventSeverity(d.event) * 1.5 + 3)
          .attr("fill", getEventColor(d.event) + "cc")
          .attr("stroke-width", 2.5);
        setTooltip({
          event: d.event,
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
          xVal: d.x,
          yVal: d.y,
        });
      })
      .on("mousemove", function (ev) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip((prev) =>
          prev
            ? { ...prev, x: ev.clientX - rect.left, y: ev.clientY - rect.top }
            : null
        );
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 4 + getEventSeverity(d.event) * 1.5)
          .attr("fill", getEventColor(d.event) + "88")
          .attr("stroke-width", 1.5);
        setTooltip(null);
      });

    // Labels
    const labels = plotArea.selectAll(".point-label")
      .data(data.filter((d) => getEventSeverity(d.event) >= 4))
      .enter()
      .append("text")
      .attr("class", "point-label")
      .attr("x", (d) => xScale(d.x) + 10)
      .attr("y", (d) => yScale(d.y) - 8)
      .attr("fill", dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)")
      .attr("font-size", "9px")
      .attr("pointer-events", "none")
      .text((d) => d.event.name.length > 20 ? d.event.name.slice(0, 18) + "..." : d.event.name);

    // Zoom behaviour
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        const { transform } = event;
        const newXScale = transform.rescaleX(xScaleOrig);
        const newYScale = transform.rescaleY(yScaleOrig);
        xScale.domain(newXScale.domain());
        yScale.domain(newYScale.domain());

        drawAxes();

        points
          .attr("cx", (d) => xScale(d.x))
          .attr("cy", (d) => yScale(d.y));

        labels
          .attr("x", (d) => xScale(d.x) + 10)
          .attr("y", (d) => yScale(d.y) - 8);

        setIsZoomed(transform.k !== 1 || transform.x !== 0 || transform.y !== 0);
        setTooltip(null);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Invisible rect to catch zoom events on empty space
    plotArea.insert("rect", ":first-child")
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "transparent");
  }, [data, xParam, yParam, containerWidth]);

  // Draw chart on data/param/size changes
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Re-draw on theme change via custom event (avoids React state/compiler conflicts)
  useEffect(() => {
    const handler = () => drawRef.current?.();
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  // Keep drawRef in sync with latest drawChart
  drawRef.current = drawChart;

  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    setIsZoomed(false);
  };

  const handleDownload = () => {
    if (svgRef.current) {
      downloadSvgAsPng(svgRef.current, `scatter-${xParam}-vs-${yParam}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full group/fig">
      <svg ref={svgRef} className="w-full" style={{ display: "block" }} />
      <button
        type="button"
        onClick={handleDownload}
        title="Download PNG"
        aria-label="Download figure as PNG"
        className="absolute top-2 left-2 p-1 rounded-md text-foreground/30 hover:text-foreground/70 bg-overlay/10 hover:bg-overlay/15 border border-overlay/10 opacity-0 group-hover/fig:opacity-100 focus-visible:opacity-100 transition-all"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
      {isZoomed && (
        <button
          onClick={handleReset}
          className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider bg-overlay/10 hover:bg-overlay/15 text-foreground/60 hover:text-foreground/80 border border-overlay/10 transition-all"
        >
          Reset Zoom
        </button>
      )}
      <div className="absolute bottom-14 right-2 text-[11px] text-foreground/20">
        Scroll to zoom · Drag or swipe to pan
      </div>
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 8,
            transform: tooltip.x > containerWidth * 0.6 ? "translateX(calc(-100% - 32px))" : undefined,
          }}
        >
          <div className="glass-strong rounded-lg border border-overlay/10 p-3 shadow-xl min-w-[200px] max-w-[280px]">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-none"
                style={{ backgroundColor: getEventColor(tooltip.event) }}
              />
              <span className="text-sm font-medium text-foreground truncate">
                {tooltip.event.name}
              </span>
            </div>
            <p className="text-[11px] text-foreground/40 mb-2">
              {formatEventDate(tooltip.event.startDate)}
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs gap-4">
                <span className="text-foreground/40">{PARAM_LABELS[xParam]}</span>
                <span className="font-mono text-foreground/80">{tooltip.xVal}</span>
              </div>
              <div className="flex justify-between text-xs gap-4">
                <span className="text-foreground/40">{PARAM_LABELS[yParam]}</span>
                <span className="font-mono text-foreground/80">{tooltip.yVal}</span>
              </div>
              {tooltip.event.peakDst !== null && xParam !== "peakDst" && yParam !== "peakDst" && (
                <div className="flex justify-between text-xs gap-4">
                  <span className="text-foreground/40">Peak Dst</span>
                  <span className="font-mono text-foreground/80">{tooltip.event.peakDst} nT</span>
                </div>
              )}
              {tooltip.event.noaaGScale && (
                <div className="flex justify-between text-xs gap-4">
                  <span className="text-foreground/40">NOAA Scale</span>
                  <span className="font-mono text-foreground/80">G{tooltip.event.noaaGScale}</span>
                </div>
              )}
            </div>
            {tooltip.event.phenomena.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {tooltip.event.phenomena.slice(0, 3).map((p, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-overlay/10"
                    style={{ color: PHENOMENON_CONFIG[p.type].color }}
                  >
                    {PHENOMENON_CONFIG[p.type].shortLabel}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RankingTable({
  events,
  sortParam,
}: {
  events: SpaceWeatherEvent[];
  sortParam: AxisParam;
}) {
  const sorted = useMemo(() => {
    return [...events]
      .map((e) => ({ event: e, value: getParamValue(e, sortParam) }))
      .filter((d) => d.value !== null)
      .sort((a, b) => {
        // For Dst and Bz, more negative = more severe
        if (sortParam === "peakDst" || sortParam === "bzMin") {
          return (a.value as number) - (b.value as number);
        }
        // For aurora latitude, lower = more impressive
        if (sortParam === "auroraLowestLatitude") {
          return (a.value as number) - (b.value as number);
        }
        return (b.value as number) - (a.value as number);
      })
      .slice(0, 10);
  }, [events, sortParam]);

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-overlay/5">
        <h3 className="text-xs uppercase tracking-wider text-foreground/40">
          Top 10 by {PARAM_LABELS[sortParam]}
        </h3>
      </div>
      <div className="divide-y divide-overlay/3">
        {sorted.map(({ event, value }, i) => (
          <div
            key={event.id}
            className="px-4 py-2 flex items-center gap-3 hover:bg-overlay/3 transition-colors"
          >
            <span className="text-xs font-mono text-foreground/30 w-5">
              {i + 1}
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getEventColor(event) }}
            />
            <span className="text-sm text-foreground/80 flex-1">{event.name}</span>
            <span className="text-sm font-mono text-solar">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const [xParam, setXParam] = useState<AxisParam>("year");
  const [yParam, setYParam] = useState<AxisParam>("peakDst");
  const [rankParam, setRankParam] = useState<AxisParam>("peakDst");

  const params: AxisParam[] = [
    "year",
    "peakDst",
    "peakKp",
    "cmeSpeedKmS",
    "solarWindSpeedPeak",
    "bzMin",
    "protonFluxPeak",
    "durationHours",
    "auroraLowestLatitude",
    "solarCycleNumber",
    "impactCount",
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <NavBar eventCount={EVENTS.length} />

      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div>
          <h2 className="heading-display text-xl text-foreground mb-1">
            Cross-Event Analytics
          </h2>
          <p className="text-sm text-foreground/40">
            Explore relationships between parameters across all {EVENTS.length}{" "}
            catalogued events. Values for pre-instrumental events are published
            reconstructions (marked ≈ on event pages) and are included here.
          </p>
        </div>

        {/* Faceted explorer */}
        <DataExplorer events={EVENTS} />

        {/* Scatter plot section */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-foreground/40 uppercase tracking-wider">
                X Axis
              </label>
              <select
                value={xParam}
                onChange={(e) => setXParam(e.target.value as AxisParam)}
                className="bg-overlay/5 border border-overlay/10 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:border-solar/50"
              >
                {params.map((p) => (
                  <option key={p} value={p} className="bg-background">
                    {PARAM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-foreground/20">vs</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-foreground/40 uppercase tracking-wider">
                Y Axis
              </label>
              <select
                value={yParam}
                onChange={(e) => setYParam(e.target.value as AxisParam)}
                className="bg-overlay/5 border border-overlay/10 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:border-solar/50"
              >
                {params.map((p) => (
                  <option key={p} value={p} className="bg-background">
                    {PARAM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ScatterPlot events={EVENTS} xParam={xParam} yParam={yParam} />
        </div>

        {/* Rankings */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium text-foreground/60">Rankings by</h3>
            <select
              value={rankParam}
              onChange={(e) => setRankParam(e.target.value as AxisParam)}
              className="bg-overlay/5 border border-overlay/10 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:border-solar/50"
            >
              {params
                .filter((p) => p !== "year")
                .map((p) => (
                  <option key={p} value={p} className="bg-background">
                    {PARAM_LABELS[p]}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankingTable events={EVENTS} sortParam={rankParam} />
            <RankingTable events={EVENTS} sortParam="peakKp" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Most Severe Dst",
              value: `${Math.min(...EVENTS.filter((e) => e.peakDst).map((e) => e.peakDst!))} nT`,
            },
            {
              label: "Highest Kp",
              value: `${Math.max(...EVENTS.filter((e) => e.peakKp).map((e) => e.peakKp!))}`,
            },
            {
              label: "Fastest CME",
              value: `${Math.max(...EVENTS.filter((e) => e.cmeSpeedKmS).map((e) => e.cmeSpeedKmS!))} km/s`,
            },
            {
              label: "Lowest Aurora Lat",
              value: `${Math.min(...EVENTS.filter((e) => e.auroraLowestLatitude).map((e) => e.auroraLowestLatitude!))}°`,
            },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">
                {stat.label}
              </p>
              <p className="text-xl font-mono font-semibold text-solar">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
