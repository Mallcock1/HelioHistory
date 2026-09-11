// ============================================
// Space Weather Event Data Model
// ============================================

export type PhenomenonType =
  | "geomag_storm"
  | "solar_flare"
  | "cme"
  | "sep"
  | "gle"
  | "radio_blackout"
  | "forbush_decrease";

export type CyclePhase = "ascending" | "maximum" | "descending" | "minimum" | "unknown";

export type ImpactSector =
  | "power"
  | "satellite"
  | "aviation"
  | "communications"
  | "navigation"
  | "pipeline"
  | "aurora"
  | "cultural"
  | "biological"
  | "military";

export type ImpactSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface Phenomenon {
  type: PhenomenonType;
  subtype?: string; // e.g. "X45", "G5", "S4"
  details?: string;
  peakTime?: string;
}

export interface Impact {
  sector: ImpactSector;
  location?: string;
  description: string;
  severity: ImpactSeverity;
  durationHours?: number;
  economicCostUsd?: number;
}

export interface TimeSeriesRef {
  parameter: string; // e.g. "dst", "kp", "proton_flux"
  source: string;
  data?: TimeSeriesDataPoint[];
}

export interface TimeSeriesDataPoint {
  time: string; // ISO datetime
  value: number;
}

export interface EventImage {
  url: string;
  caption: string;
  credit?: string;
  date?: string;
}

export interface ScientificPaper {
  doi?: string;
  /** Link for sources without a DOI (e.g. agency reports). */
  url?: string;
  title: string;
  authors: string;
  year: number;
  journal?: string;
  keyFinding?: string;
}

export interface SpaceWeatherEvent {
  id: string;
  slug: string;
  name: string;
  altNames: string[];

  startDate: string; // ISO date
  peakDate: string;
  endDate: string;
  durationHours: number;

  // Classification
  phenomena: Phenomenon[];
  noaaGScale: number | null; // 1-5
  noaaSScale: number | null; // 1-5
  noaaRScale: number | null; // 1-5

  // Indices
  peakDst: number | null;
  peakKp: number | null;
  peakAp: number | null;
  peakAE: number | null;
  flareClass: string | null;
  cmeSpeedKmS: number | null;
  solarWindSpeedPeak: number | null;
  bzMin: number | null;
  protonFluxPeak: number | null;

  // Solar context
  solarCycleNumber: number | null;
  cyclePhase: CyclePhase;
  sourceActiveRegion: string | null;
  sunspotNumberDaily: number | null;

  /**
   * Top-level fields whose values are published reconstructions or estimates
   * rather than instrumental measurements (e.g. peakDst before 1957, flareClass
   * before GOES). Optional; absent means all values are measured.
   */
  estimatedFields?: string[];

  // Impacts
  impacts: Impact[];
  auroraLowestLatitude: number | null;

  // Time series data
  timeSeries: TimeSeriesRef[];

  // Media
  images: EventImage[];

  // References
  papers: ScientificPaper[];

  // Text
  summary: string;
  description: string;
}

// ============================================
// Phenomena display config
// ============================================

export const PHENOMENON_CONFIG: Record<
  PhenomenonType,
  { label: string; color: string; shortLabel: string }
> = {
  geomag_storm: {
    label: "Geomagnetic Storm",
    color: "var(--geomag)",
    shortLabel: "GMS",
  },
  solar_flare: {
    label: "Solar Flare",
    color: "var(--flare)",
    shortLabel: "FLR",
  },
  cme: {
    label: "Coronal Mass Ejection",
    color: "var(--cme)",
    shortLabel: "CME",
  },
  sep: {
    label: "Solar Energetic Particles",
    color: "var(--sep)",
    shortLabel: "SEP",
  },
  gle: {
    label: "Ground Level Enhancement",
    color: "var(--gle)",
    shortLabel: "GLE",
  },
  radio_blackout: {
    label: "Radio Blackout",
    color: "var(--radio-blackout)",
    shortLabel: "RBO",
  },
  forbush_decrease: {
    label: "Forbush Decrease",
    color: "var(--aurora-purple)",
    shortLabel: "FBD",
  },
};

export const SEVERITY_COLORS = {
  1: "var(--severity-minor)",
  2: "var(--severity-moderate)",
  3: "var(--severity-strong)",
  4: "var(--severity-severe)",
  5: "var(--severity-extreme)",
} as const;

export const G_SCALE_LABELS: Record<number, string> = {
  1: "G1 Minor",
  2: "G2 Moderate",
  3: "G3 Strong",
  4: "G4 Severe",
  5: "G5 Extreme",
};

// ============================================
// Timeline zoom levels
// ============================================

export type ZoomLevel =
  | "millennia"
  | "centuries"
  | "decades"
  | "years"
  | "months"
  | "days"
  | "hours";

export const ZOOM_LEVELS: ZoomLevel[] = [
  "millennia",
  "centuries",
  "decades",
  "years",
  "months",
  "days",
  "hours",
];
