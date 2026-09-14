# HelioHistory

**A space weather living archive**: an open catalogue of major space weather
events, from the extreme solar particle events of the last Ice Age to modern
superstorms, with an interactive timeline, cross-event analytics, and
downloadable, machine-readable data.

> Status: early development. The catalogue holds 57 events spanning
> ~14,000 years; every reference is resolved against CrossRef in CI.

## What's here

- **A curated dataset** of major space weather events with geomagnetic indices,
  solar context, impacts, and scientific references. See [`data/`](data/).
- **A web app** (Next.js) to explore it: timeline, event detail, side-by-side
  comparison, and cross-event analytics. Values reconstructed for
  pre-instrumental events are marked ≈.
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

# What proportion of storms with Kp above 7 occurred on the descending phase?
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
npm run data:validate   # schema + integrity rules; add -- --check-dois to resolve DOIs
npm run data:build      # compile JSON → app module + public/data artifacts
npm run lint            # ESLint
npm run build           # validate + build data, then build the app
```

## Contributing

Corrections and new events are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). In short: edit or add a JSON file under
`data/events/`, run `npm run data:validate`, cite your sources in `papers[]`
with DOIs, and open a pull request. CI validates every change, including
resolving each DOI.

## Licensing

This project is **dual-licensed**:

- **Code** (app, scripts, schema, tooling): [MIT](LICENSE).
- **Dataset** (`data/`, `public/data/`): [CC BY 4.0](LICENSE-DATA).

## Citing

Please cite the dataset using [CITATION.cff](CITATION.cff) (GitHub shows a
"Cite this repository" button). Figures exported from the site carry a credit
line; the data behind them is CC BY 4.0, so publishing one requires citation.
