"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SpaceWeatherEvent } from "@/lib/types";
import { PHENOMENON_CONFIG, G_SCALE_LABELS } from "@/lib/types";
import { formatEventDate, isEstimated, ESTIMATED_HINT } from "@/lib/timeline-utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { eventCitation } from "@/lib/citation";
import DstChart from "@/components/charts/DstChart";
import KpChart from "@/components/charts/KpChart";
import NeutronMonitorChart from "@/components/charts/NeutronMonitorChart";
import { getEventTimeSeries } from "@/data/timeseries";

interface EventDetailPanelProps {
  event: SpaceWeatherEvent | null;
  onClose: () => void;
}

function IndexCard({
  label,
  value,
  unit,
  estimated,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  estimated?: boolean;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="glass rounded-lg p-3 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-foreground/40">
        {label}
        {estimated && (
          <span className="ml-1 normal-case tracking-normal text-foreground/30" title={ESTIMATED_HINT}>
            est.
          </span>
        )}
      </span>
      <span className="text-lg font-mono font-semibold text-foreground">
        {estimated && <span className="text-foreground/40 mr-0.5" title={ESTIMATED_HINT}>≈</span>}
        {value}
        {unit && (
          <span className="text-xs text-foreground/50 ml-1">{unit}</span>
        )}
      </span>
    </div>
  );
}

function ImpactCard({
  impact,
}: {
  impact: SpaceWeatherEvent["impacts"][number];
}) {
  const sectorIcons: Record<string, string> = {
    power: "⚡",
    satellite: "🛰️",
    aviation: "✈️",
    communications: "📡",
    navigation: "🧭",
    pipeline: "🔧",
    aurora: "🌌",
    cultural: "📜",
    biological: "🧬",
    military: "🎖️",
  };

  const severityColors: Record<string, string> = {
    minor: "border-severity-minor/30 bg-severity-minor/5",
    moderate: "border-severity-moderate/30 bg-severity-moderate/5",
    severe: "border-severity-severe/30 bg-severity-severe/5",
    extreme: "border-severity-extreme/30 bg-severity-extreme/5",
  };

  return (
    <div
      className={`rounded-lg border p-3 ${severityColors[impact.severity] || "border-overlay/10"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{sectorIcons[impact.sector] || "📋"}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
          {impact.sector}
        </span>
        {impact.location && (
          <span className="text-xs text-foreground/40">· {impact.location}</span>
        )}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        {impact.description}
      </p>
      {impact.economicCostUsd && (
        <p className="text-xs text-severity-severe mt-1 font-mono">
          ${(impact.economicCostUsd / 1e6).toFixed(0)}M estimated damage
        </p>
      )}
    </div>
  );
}

export default function EventDetailPanel({
  event,
  onClose,
}: EventDetailPanelProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute top-0 right-0 h-full w-full sm:w-[480px] z-50 glass-strong border-l border-overlay/[0.06]"
        >
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-overlay/5 hover:bg-overlay/10 flex items-center justify-center transition-colors z-10"
              >
                <X className="w-4 h-4 text-foreground/60" />
              </button>

              {/* Header */}
              <div className="pr-8">
                <h2 className="heading-display-lg text-2xl text-foreground mb-2">
                  {event.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-foreground/50 mb-3">
                  <span>{formatEventDate(event.startDate)}</span>
                  {event.startDate !== event.endDate && (
                    <>
                      <span>→</span>
                      <span>{formatEventDate(event.endDate)}</span>
                    </>
                  )}
                  <span className="text-foreground/30">·</span>
                  <span>{event.durationHours}h</span>
                </div>

                {/* Phenomena badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {event.phenomena.map((p, i) => {
                    const config = PHENOMENON_CONFIG[p.type];
                    return (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-overlay/20"
                        style={{ color: config.color }}
                      >
                        {config.shortLabel}
                        {p.subtype && ` ${p.subtype}`}
                      </Badge>
                    );
                  })}
                </div>

                {/* NOAA Scale badges */}
                <div className="flex gap-2 flex-wrap">
                  {event.noaaGScale && (
                    <Badge className="bg-geomag/20 text-geomag border-geomag/30 text-xs">
                      {isEstimated(event, "noaaGScale") && "≈"}
                      {G_SCALE_LABELS[event.noaaGScale]}
                    </Badge>
                  )}
                  {event.noaaSScale && (
                    <Badge className="bg-sep/20 text-sep border-sep/30 text-xs">
                      {isEstimated(event, "noaaSScale") && "≈"}S{event.noaaSScale}
                    </Badge>
                  )}
                  {event.noaaRScale && (
                    <Badge className="bg-radio-blackout/20 text-radio-blackout border-radio-blackout/30 text-xs">
                      {isEstimated(event, "noaaRScale") && "≈"}R{event.noaaRScale}
                    </Badge>
                  )}
                </div>

                {/* Cite this event */}
                <div className="mt-3">
                  <CopyButton value={eventCitation(event)} label="Cite event" />
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-foreground/70 leading-relaxed">
                {event.description}
              </p>

              {/* Historical images / artwork */}
              {event.images.length > 0 && (
                <div className="space-y-3">
                  {event.images.map((img, i) => (
                    <figure key={i} className="glass rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.caption}
                        loading="lazy"
                        className="w-full h-auto bg-overlay/5"
                      />
                      <figcaption className="p-3 text-xs text-foreground/50 leading-relaxed">
                        {img.caption}
                        {img.credit && (
                          <span className="block text-foreground/30 mt-1">{img.credit}</span>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}

              <Separator className="bg-overlay/10" />

              {/* Key Indices */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                  Key Indices
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <IndexCard label="Peak Dst" value={event.peakDst} unit="nT" estimated={isEstimated(event, "peakDst")} />
                  <IndexCard label="Peak Kp" value={event.peakKp} estimated={isEstimated(event, "peakKp")} />
                  <IndexCard label="Peak Ap" value={event.peakAp} estimated={isEstimated(event, "peakAp")} />
                  <IndexCard label="Flare Class" value={event.flareClass} estimated={isEstimated(event, "flareClass")} />
                  <IndexCard
                    label="CME Speed"
                    value={event.cmeSpeedKmS}
                    unit="km/s"
                    estimated={isEstimated(event, "cmeSpeedKmS")}
                  />
                  <IndexCard
                    label="Solar Wind"
                    value={event.solarWindSpeedPeak}
                    unit="km/s"
                    estimated={isEstimated(event, "solarWindSpeedPeak")}
                  />
                  <IndexCard label="Bz Min" value={event.bzMin} unit="nT" estimated={isEstimated(event, "bzMin")} />
                  <IndexCard
                    label="Proton Flux"
                    value={
                      event.protonFluxPeak
                        ? event.protonFluxPeak.toExponential(1)
                        : null
                    }
                    unit="pfu"
                    estimated={isEstimated(event, "protonFluxPeak")}
                  />
                </div>
                {event.estimatedFields && event.estimatedFields.length > 0 && (
                  <p className="mt-2 text-[11px] text-foreground/35">
                    ≈ marks values reconstructed from historical records or published estimates rather than instrumental measurements.
                  </p>
                )}
              </div>

              <Separator className="bg-overlay/10" />

              {/* Solar Context */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                  Solar Context
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <IndexCard
                    label="Solar Cycle"
                    value={
                      event.solarCycleNumber != null && event.solarCycleNumber > 0
                        ? event.solarCycleNumber
                        : "Unknown"
                    }
                  />
                  <IndexCard
                    label="Cycle Phase"
                    value={event.cyclePhase}
                  />
                  <IndexCard
                    label="Active Region"
                    value={event.sourceActiveRegion || "–"}
                  />
                  <IndexCard
                    label="Sunspot #"
                    value={event.sunspotNumberDaily}
                  />
                </div>
              </div>

              {/* Aurora */}
              {event.auroraLowestLatitude && (
                <>
                  <Separator className="bg-overlay/10" />
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                      Aurora Visibility
                    </h3>
                    <div className="glass rounded-lg p-3 flex items-center gap-3">
                      <span className="text-2xl">🌌</span>
                      <div>
                        <p className="text-sm text-foreground/80">
                          Visible to{" "}
                          <span className="font-mono font-semibold text-aurora-green">
                            {event.auroraLowestLatitude}°
                          </span>{" "}
                          magnetic latitude
                        </p>
                        <p className="text-xs text-foreground/40">
                          {event.auroraLowestLatitude <= 20
                            ? "Tropical aurora – extremely rare"
                            : event.auroraLowestLatitude <= 30
                              ? "Subtropical aurora – very rare"
                              : event.auroraLowestLatitude <= 40
                                ? "Mid-latitude aurora"
                                : "High-latitude aurora"}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Time Series Charts */}
              {(() => {
                const ts = getEventTimeSeries(event.id);
                const hasData = ts.dst || ts.kp || ts.protonFlux || ts.neutronMonitor;

                // Shared time x-domain across all charts so they stack in time.
                const allMs = [
                  ...(ts.dst ?? []),
                  ...(ts.kp ?? []),
                  ...(ts.neutronMonitor ?? []),
                ].map((d) => new Date(d.time).getTime());
                const sharedDomain = allMs.length
                  ? ([Math.min(...allMs), Math.max(...allMs)] as [number, number])
                  : undefined;
                return (
                  <>
                    <Separator className="bg-overlay/10" />
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                        Time Series Data
                      </h3>
                      {hasData ? (
                        <div className="space-y-4">
                          {ts.dst && (
                            <div className="glass rounded-lg p-3 overflow-x-auto">
                              <DstChart data={ts.dst} width={400} height={170} domain={sharedDomain} downloadName={`${event.id}-dst`} />
                            </div>
                          )}
                          {ts.kp && (
                            <div className="glass rounded-lg p-3 overflow-x-auto">
                              <KpChart data={ts.kp} width={400} height={140} domain={sharedDomain} downloadName={`${event.id}-kp`} />
                            </div>
                          )}
                          {ts.neutronMonitor && (
                            <div className="glass rounded-lg p-3 overflow-x-auto">
                              <NeutronMonitorChart data={ts.neutronMonitor} width={400} height={170} domain={sharedDomain} downloadName={`${event.id}-neutron-monitor`} />
                              {ts.neutronMonitorModelled && (
                                <p className="mt-1 text-[11px] text-foreground/40">
                                  Modelled profile: a parametric curve fitted to the published peak enhancement, not archived neutron-monitor data.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="glass rounded-lg p-4 text-center">
                          <p className="text-xs text-foreground/30">
                            No time series data for this event.
                          </p>
                          <p className="text-xs text-foreground/20 mt-1">
                            Peak indices are shown above.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              <Separator className="bg-overlay/10" />

              {/* Impacts */}
              {event.impacts.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                    Impacts ({event.impacts.length})
                  </h3>
                  <div className="space-y-2">
                    {event.impacts.map((impact, i) => (
                      <ImpactCard key={i} impact={impact} />
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {event.papers.length > 0 && (
                <>
                  <Separator className="bg-overlay/10" />
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                      Scientific References ({event.papers.length})
                    </h3>
                    <div className="space-y-3">
                      {event.papers.map((paper, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-foreground/80 leading-relaxed">
                            {paper.title}
                          </p>
                          <p className="text-xs text-foreground/40 mt-0.5">
                            {paper.authors} ({paper.year})
                            {paper.journal && ` – ${paper.journal}`}
                          </p>
                          {paper.doi && (
                            <a
                              href={`https://doi.org/${paper.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-solar hover:text-solar-bright transition-colors"
                            >
                              {paper.doi}
                            </a>
                          )}
                          {!paper.doi && paper.url && (
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-solar hover:text-solar-bright transition-colors break-all"
                            >
                              {paper.url.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                          {paper.keyFinding && (
                            <p className="text-xs text-foreground/50 mt-1 italic">
                              {paper.keyFinding}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Bottom padding */}
              <div className="h-8" />
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
