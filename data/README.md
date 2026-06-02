# HelioHistory dataset

This directory is the **canonical source of truth** for the HelioHistory space
weather catalogue. Each event is one JSON file: `events/<id>.json`.

Everything the app and the public downloads show is compiled from these files —
they are not edited by hand:

| Artifact | How it's produced | Purpose |
| --- | --- | --- |
| `src/data/events.generated.ts` | `npm run data:build` | Typed array the Next.js app imports |
| `public/data/events.json` | `npm run data:build` | Full dataset for download / API |
| `public/data/events.csv` | `npm run data:build` | Flattened core fields for spreadsheets / pandas |

The structure of every event file is defined and enforced by
[`schema/event.schema.json`](../schema/event.schema.json) (JSON Schema draft-07).

## Editing or adding an event

1. Create or edit `data/events/<id>.json`. The filename **must** equal the `id`.
   Use the id convention `evt-<year>-<shortname>` with a zero-padded 4-digit
   year (e.g. `evt-0774-miyake`, `evt-1859-carrington`) so files sort
   chronologically.
2. Run `npm run data:validate` to check it against the schema and integrity rules.
3. Run `npm run data:build` (or just `npm run dev`, which builds automatically).
4. Open a pull request. CI re-validates and test-builds your change.

## Sourcing requirement

Every **quantitative** claim should be traceable to a citable source. Add the
reference(s) to the event's `papers[]` array (DOI preferred). The validator warns
when an event has indices/flare data but no papers. For pre-instrumental or
reconstructed events, prefer reporting the published estimate and note its
uncertainty in `description`.

## Field reference

See the schema for the authoritative contract. Key fields and units:

| Field | Type | Units / notes |
| --- | --- | --- |
| `id`, `slug` | string | Stable identifiers; `id` matches the filename |
| `name`, `altNames` | string / string[] | Display name and alternates |
| `startDate`, `peakDate`, `endDate` | ISO date(time) | Supports ancient dates (e.g. `0774-01-01`) |
| `durationHours` | number | Event duration in hours |
| `phenomena[]` | object[] | One of: geomag_storm, solar_flare, cme, sep, gle, radio_blackout, forbush_decrease |
| `noaaGScale` / `noaaSScale` / `noaaRScale` | 1–5 or null | NOAA storm / radiation / radio-blackout scales |
| `peakDst` | number / null | Most negative Dst, nT |
| `peakKp` | 0–9 / null | Peak planetary Kp |
| `peakAp`, `peakAE` | number / null | Geomagnetic indices |
| `flareClass` | string / null | GOES X-ray class, e.g. `X45`, `M9.3`, `>X10`, `X` |
| `cmeSpeedKmS` | number / null | CME speed, km/s |
| `solarWindSpeedPeak` | number / null | Peak solar wind speed, km/s |
| `bzMin` | number / null | Minimum (southward) IMF Bz, nT |
| `protonFluxPeak` | number / null | Peak >10 MeV proton flux, pfu |
| `solarCycleNumber` | number / null | Modern numbering; null/negative = unknown |
| `cyclePhase` | enum | ascending, maximum, descending, minimum |
| `sourceActiveRegion` | string / null | NOAA/Nable AR designation |
| `sunspotNumberDaily` | number / null | Daily sunspot number |
| `impacts[]` | object[] | Sector, severity, description, optional cost |
| `auroraLowestLatitude` | number / null | Lowest geomagnetic latitude aurora was seen, ° |
| `timeSeries[]` | object[] | Parameter + source (+ optional inline data points) |
| `images[]` | object[] | url, caption, credit, date |
| `papers[]` | object[] | doi, title, authors, year, journal, keyFinding |
| `summary`, `description` | string | Short and long prose |
