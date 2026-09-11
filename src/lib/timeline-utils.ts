import type { SpaceWeatherEvent, ZoomLevel, PhenomenonType } from "./types";

// ============================================
// Timeline coordinate system utilities
// ============================================

/**
 * Convert a date string to a year number (fractional for sub-year precision).
 * Handles ancient AD dates like "0774-01-01" and BC dates with a leading
 * minus like "-0660-01-01" (660 BC) or "-12350-01-01" (12350 BC).
 */
export function dateToYear(dateStr: string): number {
  const neg = dateStr.startsWith("-");
  const body = neg ? dateStr.slice(1) : dateStr;
  const parts = body.split("-");
  const year = parseInt(parts[0], 10);
  const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts[2] ? parseInt(parts[2], 10) - 1 : 0;
  // For BC the base year is negative; sub-year fractions still advance forward in time.
  return (neg ? -year : year) + month / 12 + day / 365;
}

/**
 * The present moment expressed as a fractional year (e.g. mid-2026 -> 2026.45).
 * Evaluated from the client clock, so the timeline's "now" edge advances on its
 * own as months pass, with no rebuild required.
 */
export function currentDecimalYear(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (now.getTime() - start) / (end - start);
}

/** Convert a fractional year number back to a Date object */
function yearToDate(y: number): Date {
  const year = Math.floor(y);
  const frac = y - year;
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return new Date(start + frac * (end - start));
}

/** Convert a year number to a pixel position given viewport state */
export function yearToPixel(
  year: number,
  viewportStart: number,
  viewportEnd: number,
  canvasWidth: number
): number {
  const range = viewportEnd - viewportStart;
  if (range === 0) return 0;
  return ((year - viewportStart) / range) * canvasWidth;
}

/** Convert a pixel position to a year number */
export function pixelToYear(
  pixel: number,
  viewportStart: number,
  viewportEnd: number,
  canvasWidth: number
): number {
  const range = viewportEnd - viewportStart;
  return viewportStart + (pixel / canvasWidth) * range;
}

/** Determine zoom level based on the year range visible */
export function getZoomLevel(yearRange: number): ZoomLevel {
  if (yearRange > 800) return "millennia";
  if (yearRange > 200) return "centuries";
  if (yearRange > 40) return "decades";
  if (yearRange > 5) return "years";
  if (yearRange > 0.5) return "months";
  if (yearRange > 0.04) return "days";
  return "hours";
}

/** Get appropriate grid line intervals for the current zoom level */
export function getGridInterval(zoomLevel: ZoomLevel): {
  major: number;
  minor: number;
  labelFormat: (year: number) => string;
} {
  switch (zoomLevel) {
    case "millennia":
      return {
        major: 500,
        minor: 100,
        labelFormat: (y) => `${Math.round(y)}`,
      };
    case "centuries":
      return {
        major: 100,
        minor: 25,
        labelFormat: (y) => `${Math.round(y)}`,
      };
    case "decades":
      return {
        major: 10,
        minor: 5,
        labelFormat: (y) => `${Math.round(y)}`,
      };
    case "years":
      return {
        major: 1,
        minor: 0.25,
        labelFormat: (y) => `${Math.round(y)}`,
      };
    case "months":
      return {
        major: 1 / 12,
        minor: 1 / 52,
        labelFormat: (y) => {
          const d = yearToDate(y);
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        },
      };
    case "days":
      return {
        major: 1 / 365,
        minor: 1 / 365 / 6,
        labelFormat: (y) => {
          const d = yearToDate(y);
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
        },
      };
    case "hours":
      return {
        major: 1 / 365 / 24,
        minor: 1 / 365 / 24 / 6,
        labelFormat: (y) => {
          const d = yearToDate(y);
          return `${d.getUTCHours()}:00`;
        },
      };
  }
}

/** Get the primary phenomenon color for an event */
export function getEventColor(event: SpaceWeatherEvent): string {
  const colors: Record<PhenomenonType, string> = {
    geomag_storm: "#4ade80", // aurora green
    solar_flare: "#f59e0b", // solar amber
    cme: "#ef4444", // red/orange
    sep: "#dc2626", // strong red
    gle: "#a855f7", // purple
    radio_blackout: "#3b82f6", // blue
    forbush_decrease: "#8b5cf6", // violet
  };

  if (event.phenomena.length === 0) return "#6b7280";
  return colors[event.phenomena[0].type] || "#6b7280";
}

/** Get severity as 1-5 from event indices */
export function getEventSeverity(event: SpaceWeatherEvent): number {
  if (event.noaaGScale) return event.noaaGScale;
  if (event.peakKp) {
    if (event.peakKp >= 9) return 5;
    if (event.peakKp >= 8) return 4;
    if (event.peakKp >= 7) return 3;
    if (event.peakKp >= 5) return 2;
    return 1;
  }
  if (event.peakDst) {
    const dst = Math.abs(event.peakDst);
    if (dst >= 500) return 5;
    if (dst >= 300) return 4;
    if (dst >= 200) return 3;
    if (dst >= 100) return 2;
    return 1;
  }
  if (event.noaaSScale) return Math.min(event.noaaSScale, 5);
  return 3; // default for events where we don't have indices
}

/** Get visible events for the current viewport */
export function getVisibleEvents(
  events: SpaceWeatherEvent[],
  viewportStart: number,
  viewportEnd: number
): SpaceWeatherEvent[] {
  return events.filter((e) => {
    const start = dateToYear(e.startDate);
    const end = dateToYear(e.endDate);
    return end >= viewportStart && start <= viewportEnd;
  });
}

/**
 * True when the event marks `field` as a published reconstruction/estimate rather
 * than an instrumental measurement (see `estimatedFields` in the schema).
 */
export function isEstimated(event: SpaceWeatherEvent, field: keyof SpaceWeatherEvent): boolean {
  return event.estimatedFields?.includes(field as string) ?? false;
}

/** Tooltip text shown on the "≈" marker next to estimated values. */
export const ESTIMATED_HINT = "Reconstructed or estimated value, not an instrumental measurement";

/** Format a year number for display */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(Math.round(year))} BC`;
  if (year < 1000) return `${Math.round(year)} AD`;
  return `${Math.round(year)}`;
}

// ============================================
// Vertical metric system for timeline
// ============================================

export type VerticalMetric =
  | "auto"
  | "noaaG"
  | "noaaS"
  | "noaaR"
  | "peakDst"
  | "peakKp"
  | "impactCount"
  | "cmeSpeed"
  | "duration";

export const VERTICAL_METRIC_LABELS: Record<VerticalMetric, string> = {
  auto: "Auto (severity)",
  noaaG: "NOAA G-Scale",
  noaaS: "NOAA S-Scale",
  noaaR: "NOAA R-Scale",
  peakDst: "Peak Dst",
  peakKp: "Peak Kp",
  impactCount: "Impact Count",
  cmeSpeed: "CME Speed",
  duration: "Duration",
};

/**
 * Get a normalized 0-1 value for an event's position on the chosen vertical metric.
 * Higher values = more severe = rendered higher on the timeline.
 * Returns null if the event has no data for this metric.
 */
export function getVerticalMetricValue(
  event: SpaceWeatherEvent,
  metric: VerticalMetric
): number | null {
  switch (metric) {
    case "auto":
      return getEventSeverity(event) / 5;
    case "noaaG":
      return event.noaaGScale ? event.noaaGScale / 5 : null;
    case "noaaS":
      return event.noaaSScale ? event.noaaSScale / 5 : null;
    case "noaaR":
      return event.noaaRScale ? event.noaaRScale / 5 : null;
    case "peakDst": {
      if (event.peakDst === null) return null;
      // Dst ranges roughly from 0 to -1600 nT (Carrington)
      // More negative = more severe = higher position
      const absDst = Math.abs(event.peakDst);
      return Math.min(1, absDst / 800);
    }
    case "peakKp":
      if (event.peakKp === null) return null;
      return event.peakKp / 9;
    case "impactCount":
      return Math.min(1, event.impacts.length / 6);
    case "cmeSpeed": {
      if (event.cmeSpeedKmS === null) return null;
      // CME speeds range roughly 300–3000 km/s
      return Math.min(1, event.cmeSpeedKmS / 3000);
    }
    case "duration":
      return Math.min(1, event.durationHours / 120);
  }
}

/** Format date string for display */
export function formatEventDate(dateStr: string): string {
  const neg = dateStr.startsWith("-");
  const body = neg ? dateStr.slice(1) : dateStr;
  const parts = body.split("-");
  const year = parseInt(parts[0], 10);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (neg) {
    const month = parts[1] ? months[parseInt(parts[1], 10) - 1] : "";
    return `${month} ${year} BC`.trim();
  }
  if (year < 1000) {
    const month = parts[1] ? months[parseInt(parts[1], 10) - 1] : "";
    return `${month} ${year} AD`.trim();
  }
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
