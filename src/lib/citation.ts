// Canonical citation text for the HelioHistory project and for individual
// events. Kept in sync with CITATION.cff at the repo root. When a versioned
// release is archived on Zenodo, add the DOI/version here and in CITATION.cff.

import type { SpaceWeatherEvent } from "@/lib/types";

export const PROJECT = {
  title: "HelioHistory: A Living Database of Space Weather History",
  authors: "Allcock, M. and HelioHistory contributors",
  year: 2026,
  url: "https://github.com/Mallcock1/HelioHistory",
  dataLicense: "CC BY 4.0",
  codeLicense: "MIT",
};

/** Plain-text citation for the dataset as a whole. */
export function projectCitation(): string {
  return `${PROJECT.authors} (${PROJECT.year}). ${PROJECT.title} [Data set]. ${PROJECT.url}`;
}

/** BibTeX entry for the dataset. */
export function projectBibtex(): string {
  return [
    "@misc{heliohistory,",
    `  title        = {${PROJECT.title}},`,
    `  author       = {{${PROJECT.authors}}},`,
    `  year         = {${PROJECT.year}},`,
    `  howpublished = {\\url{${PROJECT.url}}},`,
    `  note         = {Dataset, ${PROJECT.dataLicense}}`,
    "}",
  ].join("\n");
}

function eventYear(event: SpaceWeatherEvent): string {
  // BC dates carry a leading minus, e.g. "-0660-01-01".
  const neg = event.startDate.startsWith("-");
  const body = neg ? event.startDate.slice(1) : event.startDate;
  const y = body.slice(0, body.indexOf("-"));
  return neg ? `${parseInt(y, 10)} BC` : y;
}

/**
 * Plain-text citation for a single event record. Points back to the dataset and
 * lists the primary scientific sources, so users credit both the compilation
 * and the underlying research.
 */
export function eventCitation(event: SpaceWeatherEvent): string {
  const base =
    `${PROJECT.authors} (${PROJECT.year}). "${event.name}" (${eventYear(event)}). ` +
    `In ${PROJECT.title} [Data set]. ${PROJECT.url} (event id: ${event.id}).`;

  const dois = event.papers.map((p) => p.doi).filter(Boolean) as string[];
  if (dois.length === 0) return base;

  const sources = dois.map((d) => `https://doi.org/${d}`).join("; ");
  return `${base} Primary sources: ${sources}`;
}
