// Named grand minima and maxima of solar activity, for subtle timeline overlays.
//
// Date ranges are inherently fuzzy (decadal smoothing, isotope dating
// uncertainty), so these are approximate. Telescopic-era minima (Maunder,
// Spörer, Wolf) and the prehistoric named minima (Homeric, Greek) follow the
// commonly cited ranges; Dalton is a secular (minor) minimum, not a true grand
// minimum, and the Modern Maximum is flagged as contested.
//
// Sources:
//   Usoskin, Solanki & Kovaltsov (2007), A&A 471, 301. doi:10.1051/0004-6361:20077704
//   Usoskin (2017), Living Reviews in Solar Physics 14, 3. doi:10.1007/s41116-017-0006-9
//   Eddy (1976), Science 192, 1189. doi:10.1126/science.192.4245.1189

export type GrandPeriodType = "minimum" | "maximum" | "secular";

export interface GrandPeriod {
  name: string;
  type: GrandPeriodType;
  start: number; // decimal year; negative = BC
  end: number;
  note?: string;
}

export const GRAND_PERIODS: GrandPeriod[] = [
  { name: "Modern Maximum", type: "maximum", start: 1920, end: 2000, note: "contested" },
  { name: "Dalton Minimum", type: "secular", start: 1790, end: 1830, note: "secular (minor) minimum" },
  { name: "Maunder Minimum", type: "minimum", start: 1645, end: 1715 },
  { name: "Spörer Minimum", type: "minimum", start: 1390, end: 1550 },
  { name: "Wolf Minimum", type: "minimum", start: 1270, end: 1340 },
  { name: "Medieval Maximum", type: "maximum", start: 1100, end: 1250 },
  { name: "Oort Minimum", type: "minimum", start: 1010, end: 1070 },
  { name: "Greek Minimum", type: "minimum", start: -430, end: -330 },
  { name: "Homeric Minimum", type: "minimum", start: -810, end: -720 },
];
