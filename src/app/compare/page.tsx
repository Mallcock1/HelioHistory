"use client";

import { useState } from "react";
import { EVENTS } from "@/data/events";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { PHENOMENON_CONFIG, G_SCALE_LABELS } from "@/lib/types";
import { formatEventDate, getEventColor, isEstimated, ESTIMATED_HINT } from "@/lib/timeline-utils";
import OverlayChart, { OVERLAY_COLORS } from "@/components/charts/OverlayChart";
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
                : "border-overlay/5 text-foreground/55 hover:text-foreground/80 hover:bg-overlay/5"
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
  estimated,
}: {
  label: string;
  values: (string | number | null)[];
  format?: (v: string | number | null) => string;
  /** Per-column flag: value is a reconstruction/estimate, shown with a "≈" prefix. */
  estimated?: boolean[];
}) {
  const fmt = format || ((v) => (v !== null && v !== undefined ? String(v) : "–"));
  return (
    <div className="flex border-b border-overlay/3">
      <div className="w-36 flex-none px-4 py-2 text-xs text-foreground/55 uppercase tracking-wider">
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="flex-1 px-4 py-2 text-sm font-mono text-foreground/80 text-center">
          {estimated?.[i] && v !== null && v !== undefined && (
            <span className="text-foreground/55 mr-0.5" title={ESTIMATED_HINT}>≈</span>
          )}
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

      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div>
          <h2 className="heading-display text-xl text-foreground mb-1">
            Event Comparison
          </h2>
          <p className="text-sm text-foreground/55">
            Select up to 4 events to compare side-by-side.
          </p>
        </div>

        {/* Event selector */}
        <EventSelector selectedIds={selectedIds} onToggle={toggleEvent} />

        {selectedEvents.length === 0 ? (
          <div className="text-center py-20 text-foreground/55">
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
                  <p className="text-xs text-foreground/55">
                    {formatEventDate(event.startDate)}
                  </p>
                  <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
                    {event.phenomena.slice(0, 2).map((p, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-1 py-0.5 rounded border border-overlay/10"
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
                estimated={selectedEvents.map((e) => isEstimated(e, "noaaGScale"))}
                format={(v) =>
                  v ? G_SCALE_LABELS[v as number] || `G${v}` : "–"
                }
              />
              <ComparisonRow
                label="Peak Dst"
                values={selectedEvents.map((e) => e.peakDst)}
                estimated={selectedEvents.map((e) => isEstimated(e, "peakDst"))}
                format={(v) => (v !== null ? `${v} nT` : "–")}
              />
              <ComparisonRow
                label="Peak Kp"
                values={selectedEvents.map((e) => e.peakKp)}
                estimated={selectedEvents.map((e) => isEstimated(e, "peakKp"))}
              />
              <ComparisonRow
                label="Flare Class"
                values={selectedEvents.map((e) => e.flareClass)}
                estimated={selectedEvents.map((e) => isEstimated(e, "flareClass"))}
              />
              <ComparisonRow
                label="CME Speed"
                values={selectedEvents.map((e) => e.cmeSpeedKmS)}
                estimated={selectedEvents.map((e) => isEstimated(e, "cmeSpeedKmS"))}
                format={(v) => (v !== null ? `${v} km/s` : "–")}
              />
              <ComparisonRow
                label="Solar Wind"
                values={selectedEvents.map((e) => e.solarWindSpeedPeak)}
                estimated={selectedEvents.map((e) => isEstimated(e, "solarWindSpeedPeak"))}
                format={(v) => (v !== null ? `${v} km/s` : "–")}
              />
              <ComparisonRow
                label="Bz Min"
                values={selectedEvents.map((e) => e.bzMin)}
                estimated={selectedEvents.map((e) => isEstimated(e, "bzMin"))}
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

            {/* Time series overlaid on shared axes, aligned on each storm's peak */}
            {(() => {
              const withColor = selectedEvents.map((e, i) => ({ event: e, color: OVERLAY_COLORS[i % OVERLAY_COLORS.length] }));
              const dstSeries = withColor.flatMap(({ event, color }) => {
                const ts = getEventTimeSeries(event.id);
                return ts.dst ? [{ id: event.id, name: event.name, color, data: ts.dst }] : [];
              });
              const kpSeries = withColor.flatMap(({ event, color }) => {
                const ts = getEventTimeSeries(event.id);
                return ts.kp ? [{ id: event.id, name: event.name, color, data: ts.kp }] : [];
              });
              const missing = selectedEvents.filter((e) => !getEventTimeSeries(e.id).dst);
              if (dstSeries.length === 0 && kpSeries.length === 0) return null;
              return (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-foreground/55 mb-1">
                    Time Series Comparison
                  </h3>
                  <p className="text-xs text-foreground/60 mb-3">
                    Shared axes; time is measured from each storm&apos;s own peak so
                    events of different dates can be compared directly.
                    {missing.length > 0 && (
                      <> No time series for {missing.map((e) => e.name).join(", ")}.</>
                    )}
                  </p>
                  <div className="space-y-4">
                    {dstSeries.length > 0 && (
                      <div className="glass rounded-lg p-3 overflow-x-auto">
                        <OverlayChart
                          series={dstSeries}
                          yLabel="Dst Index (nT)"
                          alignOn="min"
                          downloadName="compare-dst"
                        />
                      </div>
                    )}
                    {kpSeries.length > 0 && (
                      <div className="glass rounded-lg p-3 overflow-x-auto">
                        <OverlayChart
                          series={kpSeries}
                          yLabel="Kp"
                          alignOn="max"
                          yDomain={[0, 9]}
                          height={200}
                          downloadName="compare-kp"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Impact comparison */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-foreground/55 mb-3">
                Impact Summary
              </h3>
              <div className="flex border-b border-overlay/5 pb-2">
                <div className="w-36 flex-none" />
                {selectedEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex-1 px-3 text-xs text-foreground/60 text-center"
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
                    <div className="w-36 flex-none px-4 py-2 text-xs text-foreground/55 capitalize">
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
                            <span className="text-foreground/40">–</span>
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

        <Footer />
      </div>
    </div>
  );
}
