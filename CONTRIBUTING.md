# Contributing to HelioHistory

Thank you for helping build an open record of space weather history! Both
**data** contributions (new events, corrections, better sources) and **code**
contributions (app features, tooling) are welcome.

By contributing you agree that your contributions are licensed under the
project's licenses: code under [MIT](LICENSE), data under [CC BY 4.0](LICENSE-DATA).

## Contributing data

The dataset lives in [`data/events/`](data/events), one JSON file per event,
validated against [`schema/event.schema.json`](schema/event.schema.json). Full
field documentation is in [`data/README.md`](data/README.md).

### Add or edit an event

1. Create/edit `data/events/<id>.json`. The filename **must** equal the `id`.
   Use `evt-<year>-<shortname>` with a zero-padded 4-digit year, e.g.
   `evt-1859-carrington`.
2. Validate locally:
   ```bash
   npm install
   npm run data:validate
   ```
3. Build (optional locally; `npm run dev` does it automatically):
   ```bash
   npm run data:build
   ```
4. Open a pull request. CI re-validates and test-builds.

### Sourcing standard

This is what makes the catalogue trustworthy:

- **Every quantitative claim must be traceable to a citable source.** Add it to
  the event's `papers[]` array (DOI preferred). The validator warns if an event
  has indices or flare data but no `papers`.
- Prefer **peer-reviewed literature** and authoritative data centres
  (WDC Kyoto for Dst, GFZ Potsdam for Kp, NOAA SWPC, NMDB, etc.).
- For **pre-instrumental or reconstructed** events, report the published
  estimate and describe its uncertainty in `description` (e.g. a Dst range).
  Don't invent precision the sources don't support.
- Use `null` for genuinely unknown values, never a guessed placeholder.

### Inclusion criteria

Events should be **notable and documented**: a measurable geophysical signature
(e.g. G-scale storm, significant flare/SEP/GLE) or well-attested historical
impact, with at least one reliable source. Borderline cases are fine to propose
in an issue first; see [GOVERNANCE.md](GOVERNANCE.md).

## Contributing code

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
```

Keep changes focused, match the surrounding style, and don't edit
`src/data/events.generated.ts` or `public/data/*` by hand; they are generated.

## Reporting issues

Use the issue templates: **Propose new event**, **Data correction**, or a
general bug/feature report. For data issues, include your source(s).

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
