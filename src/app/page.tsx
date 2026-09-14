"use client";

import { useState, useCallback, useMemo } from "react";
import type { SpaceWeatherEvent, PhenomenonType } from "@/lib/types";
import { EVENTS } from "@/data/events";
import { PHENOMENON_CONFIG } from "@/lib/types";
import TimelineCanvas from "@/components/timeline/TimelineCanvas";
import EventDetailPanel from "@/components/timeline/EventDetailPanel";
import EventTooltip from "@/components/timeline/EventTooltip";
import NavBar from "@/components/NavBar";
import {
  VERTICAL_METRIC_LABELS,
  type VerticalMetric,
} from "@/lib/timeline-utils";

const METRIC_OPTIONS: VerticalMetric[] = [
  "auto",
  "noaaG",
  "noaaS",
  "noaaR",
  "peakDst",
  "peakKp",
  "impactCount",
  "cmeSpeed",
  "duration",
];

// Collect all phenomenon types actually present in the data
const ALL_PHENOMENON_TYPES: PhenomenonType[] = Array.from(
  new Set(EVENTS.flatMap((e) => e.phenomena.map((p) => p.type)))
).sort();

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<SpaceWeatherEvent | null>(
    null
  );
  const [hoveredEvent, setHoveredEvent] = useState<SpaceWeatherEvent | null>(
    null
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [verticalMetric, setVerticalMetric] = useState<VerticalMetric>("auto");
  const [activeFilters, setActiveFilters] = useState<Set<PhenomenonType>>(
    new Set()
  );
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");

  const toggleFilter = useCallback((type: PhenomenonType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeFilters.size === 0) return EVENTS;
    return EVENTS.filter((e) => {
      const types = new Set(e.phenomena.map((p) => p.type));
      return matchMode === "all"
        ? [...activeFilters].every((t) => types.has(t))
        : [...activeFilters].some((t) => types.has(t));
    });
  }, [activeFilters, matchMode]);

  const handleEventClick = useCallback((event: SpaceWeatherEvent) => {
    setSelectedEvent((prev) => (prev?.id === event.id ? null : event));
  }, []);

  const handleEventHover = useCallback((event: SpaceWeatherEvent | null) => {
    setHoveredEvent(event);
  }, []);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <NavBar eventCount={filteredEvents.length} />

      {/* Timeline */}
      <main className="flex-1 relative overflow-hidden">
        <TimelineCanvas
          events={filteredEvents}
          onEventClick={handleEventClick}
          onEventHover={handleEventHover}
          onDeselect={() => setSelectedEvent(null)}
          hoveredEvent={hoveredEvent}
          selectedEvent={selectedEvent}
          verticalMetric={verticalMetric}
        />

        {/* Controls bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {/* Phenomenon filters */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-foreground/55 uppercase tracking-widest mr-0.5">
              Filter
            </label>
            {ALL_PHENOMENON_TYPES.map((type) => {
              const config = PHENOMENON_CONFIG[type];
              const isActive = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all border ${
                    isActive
                      ? "border-overlay/20 bg-overlay/10 text-foreground"
                      : "border-overlay/[0.06] text-foreground/50 hover:text-foreground/75 hover:bg-overlay/[0.03]"
                  }`}
                  style={
                    isActive
                      ? { borderColor: `color-mix(in srgb, ${config.color} 50%, transparent)`, color: config.color }
                      : undefined
                  }
                  title={config.label}
                >
                  {config.shortLabel}
                </button>
              );
            })}
            {activeFilters.size >= 2 && (
              <div className="flex items-center rounded border border-overlay/10 overflow-hidden ml-1">
                {(["any", "all"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMatchMode(mode)}
                    title={
                      mode === "any"
                        ? "Match any selected phenomenon (union)"
                        : "Match all selected phenomena (intersection)"
                    }
                    className={`px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                      matchMode === mode
                        ? "bg-overlay/10 text-foreground"
                        : "text-foreground/50 hover:text-foreground/75"
                    }`}
                  >
                    {mode === "any" ? "Any" : "All"}
                  </button>
                ))}
              </div>
            )}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-[11px] text-foreground/50 hover:text-foreground/80 ml-1 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-overlay/10" />

          {/* Vertical metric selector */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-foreground/55 uppercase tracking-widest">
              Y-Axis
            </label>
            <select
              value={verticalMetric}
              onChange={(e) => setVerticalMetric(e.target.value as VerticalMetric)}
              className="bg-overlay/[0.05] border border-overlay/[0.08] rounded-md px-2.5 py-1 text-[12px] text-foreground/70 focus:outline-none focus:border-solar/40 transition-colors cursor-pointer"
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-background text-foreground">
                  {VERTICAL_METRIC_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event detail panel */}
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />

        {/* Hover tooltip */}
        {!selectedEvent && (
          <EventTooltip
            event={hoveredEvent}
            mouseX={mousePos.x}
            mouseY={mousePos.y}
          />
        )}
      </main>
    </div>
  );
}
