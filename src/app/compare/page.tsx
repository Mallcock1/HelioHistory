"use client";

import { useState } from "react";
import { EVENTS } from "@/data/events";
import NavBar from "@/components/NavBar";
import { PHENOMENON_CONFIG, G_SCALE_LABELS } from "@/lib/types";
import type { SpaceWeatherEvent } from "@/lib/types";
import { formatEventDate, getEventSeverity, getEventColor } from "@/lib/timeline-utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import DstChart from "@/components/charts/DstChart";
import KpChart from "@/components/charts/KpChart";
import { getEventTimeSeries } from "@/data/timeseries";

function EventSelector({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {EVENTS.map((event) => {
        const isSelected = selectedIds.includes(event.id);
        return (
          <button
            key={event.id}
            onClick={() => onToggle(event.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isSelected
                ? "border-overlay/20 bg-overlay/10 text-foreground shadow-lg"
                : "border-overlay/5 text-foreground/30 hover:text-foreground/60 hover:bg-overlay/5"
            }`}
            style={
              isSelected
                ? { borderColor: getEventColor(event) + "44" }
                : undefined
            }
          >
            {event.name}
          </button>
        );
      })}
    </div>
  );
}

function ComparisonRow({
  label,
  values,
  format,
}: {
  label: string;
  values: (string | number | null)[];
  format?: (v: string | number | null) => string;
}) {
  const fmt = format || ((v) => (v !== null && v !== undefined ? String(v) : "–"));
  return (
    <div className="flex border-b border-overlay/3">
      <div className="w-36 flex-none px-4 py-2 text-xs text-foreground/40 uppercase tracking-wider">
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="flex-1 px-4 py-2 text-sm font-mono text-foreground/80 text-center">
          {fmt(v)}
        </div>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "evt-1859-carrington",
    "evt-1989-quebec",
    "evt-2003-halloween",
    "evt-2024-gannon",
  ]);

  const toggleEvent = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  };

  const selectedEvents = EVENTS.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <NavBar eventCount={EVENTS.length} />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <h2 className="heading-display text-xl text-foreground mb-1">
            Event Comparison
          </h2>
          <p className="text-sm text-foreground/40">
            Select up to 4 events to compare side-by-side.
          </p>
        </div>

        {/* Event selector */}
        <EventSelector selectedIds={selectedIds} onToggle={toggleEvent} />

        {selectedEvents.length === 0 ? (
          <div className="text-center py-20 text-foreground/30">
            Select events above to compare
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event headers */}
            <div className="flex border-b border-overlay/10 pb-4">
              <div className="w-36 flex-none" />
              {selectedEvents.map((event) => (
                <div key={event.id} className="flex-1 px-4 text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: getEventColor(event) }}
                  />
                  <h3 className="text-sm font-medium text-foreground">
                    {event.name}
                  </h3>
                  <p className="text-xs text-foreground/40">
                    {formatEventDate(event.startDate)}
                  </p>
                  <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
                    {event.phenomena.slice(0, 2).map((p, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1 py-0.5 rounded border border-overlay/10"
                        style={{ color: PHENOMENON_CONFIG[p.type].color }}
                      >
                        {PHENOMENON_CONFIG[p.type].shortLabel}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="glass rounded-xl overflow-hidden">
              <ComparisonRow
                label="NOAA G Scale"
                values={selectedEvents.map((e) => e.noaaGScale)}
                format={(v) =>
                  v ? G_SCALE_LABELS[v as number] || `G${v}` : "–"
                }
              />
              <ComparisonRow
                label="Peak Dst"
                values={selectedEvents.map((e) => e.peakDst)}
                format={(v) => (v !== null ? `${v} nT` : "–")}
              />
              <ComparisonRow
                label="Peak Kp"
                values={selectedEvents.map((e) => e.peakKp)}
              />
              <ComparisonRow
                label="Flare Class"
                values={selectedEvents.map((e) => e.flareClass)}
              />
              <ComparisonRow
                label="CME Speed"
                values={selectedEvents.map((e) => e.cmeSpeedKmS)}
                format={(v) => (v !== null ? `${v} km/s` : "–")}
              />
              <ComparisonRow
                label="Solar Wind"
                values={selectedEvents.map((e) => e.solarWindSpeedPeak)}
                format={(v) => (v !== null ? `${v} km/s` : "–")}
              />
              <ComparisonRow
                label="Bz Min"
                values={selectedEvents.map((e) => e.bzMin)}
                format={(v) => (v !== null ? `${v} nT` : "–")}
              />
              <ComparisonRow
                label="Duration"
                values={selectedEvents.map((e) => e.durationHours)}
                format={(v) => (v !== null ? `${v}h` : "–")}
              />
              <ComparisonRow
                label="Aurora Lat"
                values={selectedEvents.map((e) => e.auroraLowestLatitude)}
                format={(v) => (v !== null ? `${v}°` : "–")}
              />
              <ComparisonRow
                label="Solar Cycle"
                values={selectedEvents.map((e) =>
                  e.solarCycleNumber != null && e.solarCycleNumber > 0 ? e.solarCycleNumber : null
                )}
              />
              <ComparisonRow
                label="Cycle Phase"
                values={selectedEvents.map((e) => e.cyclePhase)}
              />
              <ComparisonRow
                label="Impacts"
                values={selectedEvents.map((e) => e.impacts.length)}
              />
              <ComparisonRow
                label="Papers"
                values={selectedEvents.map((e) => e.papers.length)}
              />
            </div>

            {/* Dst Charts side by side – only shown when real data is available */}
            {selectedEvents.some((e) => getEventTimeSeries(e.id).dst) && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                  Dst Time Series Comparison
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEvents.map((event) => {
                    const ts = getEventTimeSeries(event.id);
                    if (!ts.dst) return null;
                    return (
                      <div key={event.id} className="glass rounded-lg p-3">
                        <p className="text-xs text-foreground/50 mb-2">{event.name}</p>
                        <DstChart data={ts.dst} width={320} height={150} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Impact comparison */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                Impact Summary
              </h3>
              <div className="flex border-b border-overlay/5 pb-2">
                <div className="w-36 flex-none" />
                {selectedEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex-1 px-3 text-xs text-foreground/50 text-center"
                  >
                    {e.name}
                  </div>
                ))}
              </div>
              {["power", "satellite", "communications", "aurora", "cultural"].map(
                (sector) => (
                  <div
                    key={sector}
                    className="flex border-b border-overlay/3"
                  >
                    <div className="w-36 flex-none px-4 py-2 text-xs text-foreground/40 capitalize">
                      {sector}
                    </div>
                    {selectedEvents.map((event) => {
                      const impact = event.impacts.find(
                        (i) => i.sector === sector
                      );
                      return (
                        <div
                          key={event.id}
                          className="flex-1 px-3 py-2 text-xs text-foreground/60"
                        >
                          {impact ? (
                            <span
                              className={
                                impact.severity === "extreme"
                                  ? "text-severity-extreme"
                                  : impact.severity === "severe"
                                    ? "text-severity-severe"
                                    : "text-foreground/60"
                              }
                            >
                              {impact.severity}
                            </span>
                          ) : (
                            <span className="text-foreground/15">–</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
