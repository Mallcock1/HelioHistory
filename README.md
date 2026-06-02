# HelioHistory

**A living, open database of space weather history**, from the 774 AD Miyake
event to modern superstorms, with an interactive timeline, cross-event
analytics, and downloadable, machine-readable data.

> Status: early development. The catalogue currently holds 45 curated events
> spanning ~1,250 years.

## What's here

- **A curated dataset** of major space weather events with geomagnetic indices,
  solar context, impacts, and scientific references. See [`data/`](data/).
- **A web app** (Next.js) to explore it: timeline, event detail, side-by-side
  comparison, and a cross-event analytics page.
- **Open downloads**: the full dataset as JSON and CSV, plus a JSON Schema.

## Using the data

The dataset is the source of truth, independent of the app:

| File | Format | Use |
| --- | --- | --- |
| `data/events/<id>.json` | JSON (one per event) | Canonical records |
| `public/data/events.json` | JSON | Full dataset for code / APIs |
| `public/data/events.csv` | CSV | Spreadsheets, pandas, R |
| `schema/event.schema.json` | JSON Schema | Field contract & validation |

Quick analysis example (Python):

```python
import pandas as pd
df = pd.read_csv("public/data/events.csv")

# What proportion of Kp>7 storms occurred on the descending phase?
strong = df[df.peakKp > 7]
print((strong.cyclePhase == "descending").mean())
```

Every field is documented in [`data/README.md`](data/README.md).

## Running the app

```bash
npm install
npm run dev          # builds the dataset, then starts the dev server
```

Other commands:

```bash
npm run data:validate   # validate data/events/*.json against the schema
npm run data:build      # compile JSON → app module + public/data artifacts
npm run build           # validate + build data, then build the app
```

## Contributing

Corrections and new events are very welcome. This is a community catalogue.
Start with [CONTRIBUTING.md](CONTRIBUTING.md). In short: edit/add a JSON file
under `data/events/`, run `npm run data:validate`, cite your sources in
`papers[]`, and open a pull request. CI validates every change automatically.

## Licensing

This project is **dual-licensed**:

- **Code** (app, scripts, schema, tooling): [MIT](LICENSE).
- **Dataset** (`data/`, `public/data/`): [CC BY 4.0](LICENSE-DATA).

## Citing

Please cite the dataset using [CITATION.cff](CITATION.cff) (GitHub shows a
"Cite this repository" button) and pin a released version where possible.
