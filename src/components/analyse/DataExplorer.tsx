"use client";

import { useMemo, useRef, useState } from "react";
import type { SpaceWeatherEvent } from "@/lib/types";
import { PHENOMENON_CONFIG } from "@/lib/types";
import CopyButton from "@/components/CopyButton";

/**
 * Faceted data explorer: filter the catalogue, group by a dimension, and read
 * off counts / proportions / summary statistics. Answers questions such as
 * "What proportion of Kp>7 storms occurred in the descending phase?"
 */

// ── Field registry ──────────────────────────────────────────────────────────

type Kind = "number" | "single" | "multi";

interface FieldDef {
  key: string;
  label: string;
  kind: Kind;
  num?: (e: SpaceWeatherEvent) => number | null;
  cat?: (e: SpaceWeatherEvent) => string | null;
  multi?: (e: SpaceWeatherEvent) => string[];
  /** Preferred display/sort order for category values. */
  order?: string[];
}

const year = (e: SpaceWeatherEvent) => {
  const neg = e.startDate.startsWith("-");
  const body = neg ? e.startDate.slice(1) : e.startDate;
  const y = parseInt(body.slice(0, body.indexOf("-")), 10);
  return neg ? -y : y;
};

const NUMERIC: FieldDef[] = [
  { key: "year", label: "Year", kind: "number", num: (e) => year(e) },
  { key: "peakDst", label: "Peak Dst (nT)", kind: "number", num: (e) => e.peakDst },
  { key: "peakKp", label: "Peak Kp", kind: "number", num: (e) => e.peakKp },
  { key: "peakAp", label: "Peak Ap", kind: "number", num: (e) => e.peakAp },
  { key: "peakAE", label: "Peak AE", kind: "number", num: (e) => e.peakAE },
  { key: "cmeSpeedKmS", label: "CME Speed (km/s)", kind: "number", num: (e) => e.cmeSpeedKmS },
  { key: "solarWindSpeedPeak", label: "Solar Wind (km/s)", kind: "number", num: (e) => e.solarWindSpeedPeak },
  { key: "bzMin", label: "Bz Min (nT)", kind: "number", num: (e) => e.bzMin },
  { key: "protonFluxPeak", label: "Proton Flux (pfu)", kind: "number", num: (e) => e.protonFluxPeak },
  { key: "durationHours", label: "Duration (h)", kind: "number", num: (e) => e.durationHours },
  { key: "auroraLowestLatitude", label: "Aurora Lowest Lat (°)", kind: "number", num: (e) => e.auroraLowestLatitude },
  { key: "sunspotNumberDaily", label: "Sunspot Number", kind: "number", num: (e) => e.sunspotNumberDaily },
  { key: "solarCycleNumber", label: "Solar Cycle #", kind: "number", num: (e) => (e.solarCycleNumber && e.solarCycleNumber > 0 ? e.solarCycleNumber : null) },
  { key: "impactCount", label: "Number of Impacts", kind: "number", num: (e) => e.impacts.length },
  { key: "paperCount", label: "Number of Papers", kind: "number", num: (e) => e.papers.length },
];

const flareLetter = (e: SpaceWeatherEvent): string | null => {
  const m = e.flareClass?.match(/[ABCMX]/);
  return m ? m[0] : null;
};

const SINGLE: FieldDef[] = [
  {
    key: "cyclePhase",
    label: "Solar-cycle phase",
    kind: "single",
    cat: (e) => e.cyclePhase ?? null,
    order: ["ascending", "maximum", "descending", "minimum"],
  },
  {
    key: "gScale",
    label: "NOAA G scale",
    kind: "single",
    cat: (e) => (e.noaaGScale ? `G${e.noaaGScale}` : null),
    order: ["G1", "G2", "G3", "G4", "G5"],
  },
  {
    key: "dominantPhenomenon",
    label: "Dominant phenomenon",
    kind: "single",
    cat: (e) => (e.phenomena[0] ? PHENOMENON_CONFIG[e.phenomena[0].type].label : null),
  },
  { key: "flareLetter", label: "Flare class (letter)", kind: "single", cat: flareLetter, order: ["A", "B", "C", "M", "X"] },
  {
    key: "decade",
    label: "Decade",
    kind: "single",
    cat: (e) => {
      const y = year(e);
      const d = Math.floor(Math.abs(y) / 10) * 10;
      return y < 0 ? `${d}s BC` : `${d}s`;
    },
  },
  {
    key: "solarCycle",
    label: "Solar cycle",
    kind: "single",
    cat: (e) => (e.solarCycleNumber && e.solarCycleNumber > 0 ? `Cycle ${e.solarCycleNumber}` : null),
  },
];

const MULTI: FieldDef[] = [
  {
    key: "anyPhenomenon",
    label: "Phenomenon (any)",
    kind: "multi",
    multi: (e) => e.phenomena.map((p) => PHENOMENON_CONFIG[p.type].label),
  },
  {
    key: "impactSector",
    label: "Impact sector (any)",
    kind: "multi",
    multi: (e) => e.impacts.map((i) => i.sector),
  },
];

const ALL_FIELDS: FieldDef[] = [...NUMERIC, ...SINGLE, ...MULTI];
const fieldByKey = (key: string) => ALL_FIELDS.find((f) => f.key === key)!;

const NUM_OPS = [
  { op: ">", label: ">" },
  { op: ">=", label: "≥" },
  { op: "<", label: "<" },
  { op: "<=", label: "≤" },
  { op: "==", label: "=" },
  { op: "!=", label: "≠" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function categoryOptions(field: FieldDef, events: SpaceWeatherEvent[]): string[] {
  const present = new Set<string>();
  for (const e of events) {
    if (field.kind === "single") {
      const v = field.cat!(e);
      if (v !== null) present.add(v);
    } else if (field.kind === "multi") {
      for (const v of field.multi!(e)) present.add(v);
    }
  }
  const values = [...present];
  if (field.order) {
    return values.sort((a, b) => {
      const ia = field.order!.indexOf(a);
      const ib = field.order!.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }
  // Decade / solar-cycle read best sorted numerically.
  return values.sort((a, b) => {
    const na = parseFloat(a.replace(/[^0-9.-]/g, ""));
    const nb = parseFloat(b.replace(/[^0-9.-]/g, ""));
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

interface Filter {
  id: number;
  fieldKey: string;
  op: string; // numeric operator, or "is" / "includes"
  value: string;
}

function passesFilter(f: Filter, e: SpaceWeatherEvent): boolean {
  const field = fieldByKey(f.fieldKey);
  if (field.kind === "number") {
    const v = field.num!(e);
    if (v === null) return false;
    const t = parseFloat(f.value);
    if (Number.isNaN(t)) return true; // incomplete filter → no-op
    switch (f.op) {
      case ">": return v > t;
      case ">=": return v >= t;
      case "<": return v < t;
      case "<=": return v <= t;
      case "==": return v === t;
      case "!=": return v !== t;
      default: return true;
    }
  }
  if (!f.value) return true; // no value chosen yet → no-op
  if (field.kind === "single") return field.cat!(e) === f.value;
  return field.multi!(e).includes(f.value); // multi → "includes"
}

type Metric = "count" | "share" | "mean" | "median" | "max" | "min";

function aggregate(metric: Metric, valueKey: string, rows: SpaceWeatherEvent[], matchedTotal: number): number | null {
  if (metric === "count") return rows.length;
  if (metric === "share") return matchedTotal === 0 ? 0 : (rows.length / matchedTotal) * 100;
  const field = fieldByKey(valueKey);
  const nums = rows.map((e) => field.num!(e)).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  if (metric === "max") return Math.max(...nums);
  if (metric === "min") return Math.min(...nums);
  if (metric === "mean") return nums.reduce((a, b) => a + b, 0) / nums.length;
  // median
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(n: number | null, metric: Metric): string {
  if (n === null) return "–";
  if (metric === "share") return `${n.toFixed(1)}%`;
  if (metric === "count") return String(n);
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// ── Presets ─────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  filters: Omit<Filter, "id">[];
  groupBy: string;
  metric: Metric;
  valueKey?: string;
}

const PRESETS: Preset[] = [
  {
    label: "Kp > 7 storms by cycle phase",
    filters: [{ fieldKey: "peakKp", op: ">", value: "7" }],
    groupBy: "cyclePhase",
    metric: "share",
  },
  {
    label: "Severe storms (Dst ≤ −250) by cycle phase",
    filters: [{ fieldKey: "peakDst", op: "<=", value: "-250" }],
    groupBy: "cyclePhase",
    metric: "share",
  },
  {
    label: "GLE events by solar cycle",
    filters: [{ fieldKey: "anyPhenomenon", op: "includes", value: "Ground Level Enhancement" }],
    groupBy: "solarCycle",
    metric: "count",
  },
  {
    label: "Mean peak Dst by cycle phase",
    filters: [],
    groupBy: "cyclePhase",
    metric: "mean",
    valueKey: "peakDst",
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function DataExplorer({ events }: { events: SpaceWeatherEvent[] }) {
  const nextId = useRef(1);
  const mkFilter = (f: Omit<Filter, "id">): Filter => ({ ...f, id: nextId.current++ });

  const [filters, setFilters] = useState<Filter[]>([mkFilter(PRESETS[0].filters[0])]);
  const [groupBy, setGroupBy] = useState<string>("cyclePhase");
  const [metric, setMetric] = useState<Metric>("share");
  const [valueKey, setValueKey] = useState<string>("peakDst");

  const applyPreset = (p: Preset) => {
    setFilters(p.filters.map(mkFilter));
    setGroupBy(p.groupBy);
    setMetric(p.metric);
    if (p.valueKey) setValueKey(p.valueKey);
  };

  const matched = useMemo(
    () => events.filter((e) => filters.every((f) => passesFilter(f, e))),
    [events, filters]
  );

  const groupField = groupBy === "__overall__" ? null : fieldByKey(groupBy);

  const result = useMemo(() => {
    if (!groupField) {
      return [{ key: "All matched", rows: matched }];
    }
    const map = new Map<string, SpaceWeatherEvent[]>();
    for (const e of matched) {
      const k = groupField.cat!(e) ?? "Unknown";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].map(([key, rows]) => ({ key, rows }));
  }, [groupField, matched]);

  const rowsWithMetric = useMemo(() => {
    const withVal = result.map((g) => ({
      key: g.key,
      count: g.rows.length,
      value: aggregate(metric, valueKey, g.rows, matched.length),
    }));
    return withVal.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  }, [result, metric, valueKey, matched.length]);

  const maxValue = Math.max(1, ...rowsWithMetric.map((r) => Math.abs(r.value ?? 0)));

  const metricLabel =
    metric === "count" ? "Count"
    : metric === "share" ? "Share of matched"
    : `${metric[0].toUpperCase()}${metric.slice(1)} ${fieldByKey(valueKey).label}`;

  const copyText = useMemo(() => {
    const header = `group,count,${metric === "count" || metric === "share" ? metric : `${metric}_${valueKey}`}`;
    const lines = rowsWithMetric.map((r) => `${r.key},${r.count},${fmt(r.value, metric).replace("%", "")}`);
    return [header, ...lines].join("\n");
  }, [rowsWithMetric, metric, valueKey]);

  const selectCls =
    "bg-overlay/5 border border-overlay/10 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:border-solar/50";

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="heading-display text-lg text-foreground mb-1">Data Explorer</h3>
          <p className="text-sm text-foreground/40">
            Filter, group, and aggregate the catalogue to answer questions directly.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap max-w-full">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium border border-overlay/10 text-foreground/50 hover:text-foreground/80 hover:bg-overlay/5 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-foreground/40">Filters</span>
          <button
            onClick={() => setFilters((prev) => [...prev, mkFilter({ fieldKey: "peakDst", op: "<=", value: "" })])}
            className="text-xs text-solar hover:text-solar-bright transition-colors"
          >
            + Add
          </button>
          {filters.length > 0 && (
            <button
              onClick={() => setFilters([])}
              className="text-xs text-foreground/30 hover:text-foreground/50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {filters.length === 0 && (
          <p className="text-xs text-foreground/30">No filters: all {events.length} events included.</p>
        )}

        {filters.map((f) => {
          const field = fieldByKey(f.fieldKey);
          return (
            <div key={f.id} className="flex items-center gap-2 flex-wrap">
              <select
                value={f.fieldKey}
                onChange={(e) => {
                  const nf = fieldByKey(e.target.value);
                  setFilters((prev) =>
                    prev.map((x) =>
                      x.id === f.id
                        ? { ...x, fieldKey: nf.key, op: nf.kind === "number" ? ">" : nf.kind === "multi" ? "includes" : "is", value: "" }
                        : x
                    )
                  );
                }}
                className={selectCls}
              >
                <optgroup label="Numeric">
                  {NUMERIC.map((nf) => <option key={nf.key} value={nf.key} className="bg-background">{nf.label}</option>)}
                </optgroup>
                <optgroup label="Category">
                  {SINGLE.map((nf) => <option key={nf.key} value={nf.key} className="bg-background">{nf.label}</option>)}
                </optgroup>
                <optgroup label="Contains">
                  {MULTI.map((nf) => <option key={nf.key} value={nf.key} className="bg-background">{nf.label}</option>)}
                </optgroup>
              </select>

              {field.kind === "number" ? (
                <>
                  <select
                    value={f.op}
                    onChange={(e) => setFilters((prev) => prev.map((x) => (x.id === f.id ? { ...x, op: e.target.value } : x)))}
                    className={selectCls}
                  >
                    {NUM_OPS.map((o) => <option key={o.op} value={o.op} className="bg-background">{o.label}</option>)}
                  </select>
                  <input
                    type="number"
                    value={f.value}
                    placeholder="value"
                    onChange={(e) => setFilters((prev) => prev.map((x) => (x.id === f.id ? { ...x, value: e.target.value } : x)))}
                    className={`${selectCls} w-24`}
                  />
                </>
              ) : (
                <>
                  <span className="text-xs text-foreground/40">{field.kind === "multi" ? "includes" : "is"}</span>
                  <select
                    value={f.value}
                    onChange={(e) => setFilters((prev) => prev.map((x) => (x.id === f.id ? { ...x, value: e.target.value } : x)))}
                    className={selectCls}
                  >
                    <option value="" className="bg-background">choose…</option>
                    {categoryOptions(field, events).map((v) => <option key={v} value={v} className="bg-background">{v}</option>)}
                  </select>
                </>
              )}

              <button
                onClick={() => setFilters((prev) => prev.filter((x) => x.id !== f.id))}
                className="text-foreground/30 hover:text-foreground/60 transition-colors text-sm px-1"
                aria-label="Remove filter"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Group & metric */}
      <div className="flex items-center gap-4 flex-wrap border-t border-overlay/5 pt-4">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-foreground/40">Group by</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={selectCls}>
            <option value="__overall__" className="bg-background">(overall)</option>
            {SINGLE.map((f) => <option key={f.key} value={f.key} className="bg-background">{f.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-foreground/40">Metric</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className={selectCls}>
            <option value="count" className="bg-background">Count</option>
            <option value="share" className="bg-background">Share of matched (%)</option>
            <option value="mean" className="bg-background">Mean of…</option>
            <option value="median" className="bg-background">Median of…</option>
            <option value="max" className="bg-background">Max of…</option>
            <option value="min" className="bg-background">Min of…</option>
          </select>
          {metric !== "count" && metric !== "share" && (
            <select value={valueKey} onChange={(e) => setValueKey(e.target.value)} className={selectCls}>
              {NUMERIC.map((f) => <option key={f.key} value={f.key} className="bg-background">{f.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground/60">
            <span className="font-mono text-solar">{matched.length}</span> of {events.length} events match
            {filters.length === 0 ? " (no filters)" : ""}.
          </p>
          {rowsWithMetric.length > 0 && <CopyButton value={copyText} label="Copy result (CSV)" />}
        </div>

        {matched.length === 0 ? (
          <p className="text-sm text-foreground/30 py-4">No events match the current filters.</p>
        ) : (
          <div className="glass rounded-lg overflow-hidden">
            <div className="flex px-4 py-2 border-b border-overlay/5 text-[11px] uppercase tracking-wider text-foreground/40">
              <div className="flex-1">{groupField ? groupField.label : "Result"}</div>
              <div className="w-20 text-right">Count</div>
              <div className="w-40 text-right">{metricLabel}</div>
            </div>
            {rowsWithMetric.map((r) => (
              <div key={r.key} className="flex items-center px-4 py-2 border-b border-overlay/3 last:border-0">
                <div className="flex-1 text-sm text-foreground/80 capitalize">{r.key}</div>
                <div className="w-20 text-right text-sm font-mono text-foreground/50">{r.count}</div>
                <div className="w-40 flex items-center justify-end gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-overlay/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-solar/60"
                      style={{ width: `${Math.min(100, (Math.abs(r.value ?? 0) / maxValue) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-foreground/80 w-16 text-right">{fmt(r.value, metric)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
