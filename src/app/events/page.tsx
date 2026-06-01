"use client";

import { useState, useMemo } from "react";
import { EVENTS } from "@/data/events";
import NavBar from "@/components/NavBar";
import { PHENOMENON_CONFIG, G_SCALE_LABELS } from "@/lib/types";
import type { SpaceWeatherEvent, PhenomenonType } from "@/lib/types";
import { formatEventDate, getEventSeverity, getEventColor } from "@/lib/timeline-utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import EventDetailPanel from "@/components/timeline/EventDetailPanel";

type SortKey = "date" | "name" | "severity" | "dst" | "kp" | "flare";
type SortDir = "asc" | "desc";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [selectedPhenomena, setSelectedPhenomena] = useState<PhenomenonType[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedEvent, setSelectedEvent] = useState<SpaceWeatherEvent | null>(null);

  const filteredEvents = useMemo(() => {
    let events = [...EVENTS];

    // Text search
    if (search) {
      const q = search.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.impacts.some((i) => i.description.toLowerCase().includes(q))
      );
    }

    // Phenomena filter
    if (selectedPhenomena.length > 0) {
      events = events.filter((e) =>
        e.phenomena.some((p) => selectedPhenomena.includes(p.type))
      );
    }

    // Sort
    events.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.startDate.localeCompare(b.startDate);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "severity":
          cmp = getEventSeverity(a) - getEventSeverity(b);
          break;
        case "dst":
          cmp = (a.peakDst || 0) - (b.peakDst || 0);
          break;
        case "kp":
          cmp = (a.peakKp || 0) - (b.peakKp || 0);
          break;
        case "flare":
          cmp = (a.flareClass || "").localeCompare(b.flareClass || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return events;
  }, [search, selectedPhenomena, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const phenomenaTypes: PhenomenonType[] = [
    "geomag_storm",
    "solar_flare",
    "cme",
    "sep",
    "gle",
    "radio_blackout",
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative">
      <NavBar eventCount={EVENTS.length} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="flex-none p-4 border-b border-overlay/5 space-y-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search events, impacts, descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md bg-overlay/5 border border-overlay/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-solar/50 focus:ring-1 focus:ring-solar/20 transition-colors"
          />

          {/* Phenomena filter */}
          <div className="flex gap-1.5 flex-wrap">
            {phenomenaTypes.map((type) => {
              const config = PHENOMENON_CONFIG[type];
              const isActive = selectedPhenomena.includes(type);
              return (
                <button
                  key={type}
                  onClick={() =>
                    setSelectedPhenomena((prev) =>
                      isActive
                        ? prev.filter((p) => p !== type)
                        : [...prev, type]
                    )
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                    isActive
                      ? "border-overlay/20 bg-overlay/10 text-foreground"
                      : "border-overlay/5 text-foreground/40 hover:text-foreground/60 hover:bg-overlay/5"
                  }`}
                  style={isActive ? { color: config.color } : undefined}
                >
                  {config.label}
                </button>
              );
            })}
            {selectedPhenomena.length > 0 && (
              <button
                onClick={() => setSelectedPhenomena([])}
                className="px-2.5 py-1 rounded-md text-xs text-foreground/30 hover:text-foreground/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1">
          <div className="min-w-[900px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-background/90 backdrop-blur-xl z-10">
                <tr className="border-b border-overlay/5 text-xs text-foreground/40 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">
                    <button
                      onClick={() => toggleSort("date")}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      Date {sortKey === "date" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <button
                      onClick={() => toggleSort("name")}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      Event {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Phenomena</th>
                  <th className="px-4 py-3 text-center font-medium">
                    <button
                      onClick={() => toggleSort("severity")}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      G {sortKey === "severity" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button
                      onClick={() => toggleSort("dst")}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      Dst {sortKey === "dst" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    <button
                      onClick={() => toggleSort("kp")}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      Kp {sortKey === "kp" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Flare</th>
                  <th className="px-4 py-3 text-right font-medium">Duration</th>
                  <th className="px-4 py-3 text-right font-medium">Impacts</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const severity = getEventSeverity(event);
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="border-b border-overlay/3 hover:bg-overlay/3 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-xs text-foreground/50 font-mono whitespace-nowrap">
                        {formatEventDate(event.startDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground group-hover:text-solar transition-colors">
                          {event.name}
                        </span>
                        <p className="text-xs text-foreground/30 mt-0.5 line-clamp-1">
                          {event.summary}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {event.phenomena.slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-overlay/10"
                              style={{ color: PHENOMENON_CONFIG[p.type].color }}
                            >
                              {PHENOMENON_CONFIG[p.type].shortLabel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {event.noaaGScale ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-overlay/20"
                            style={{
                              color:
                                severity >= 4
                                  ? "var(--severity-extreme)"
                                  : severity >= 3
                                    ? "var(--severity-strong)"
                                    : "var(--severity-moderate)",
                            }}
                          >
                            G{event.noaaGScale}
                          </Badge>
                        ) : (
                          <span className="text-xs text-foreground/20">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {event.peakDst ? (
                          <span
                            className={
                              Math.abs(event.peakDst) >= 500
                                ? "text-severity-extreme"
                                : Math.abs(event.peakDst) >= 200
                                  ? "text-severity-severe"
                                  : "text-foreground/60"
                            }
                          >
                            {event.peakDst}
                          </span>
                        ) : (
                          <span className="text-foreground/20">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {event.peakKp ? (
                          <span
                            className={
                              event.peakKp >= 8
                                ? "text-severity-extreme"
                                : event.peakKp >= 6
                                  ? "text-severity-strong"
                                  : "text-foreground/60"
                            }
                          >
                            {event.peakKp}
                          </span>
                        ) : (
                          <span className="text-foreground/20">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-solar">
                        {event.flareClass || (
                          <span className="text-foreground/20">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-foreground/50">
                        {event.durationHours}h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-foreground/40">
                          {event.impacts.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>

      {/* Detail panel overlay */}
      <EventDetailPanel
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
