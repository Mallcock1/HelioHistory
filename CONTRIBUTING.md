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
   npm run data:validate               # schema + integrity rules (dates, NOAA scales, estimates)
   npm run data:validate -- --check-dois   # also resolve every DOI on CrossRef (network; CI runs this)
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
- **Copy reference metadata from the DOI record, not from memory.** Look the
  paper up on CrossRef or ADS, paste the DOI, and take title/authors/year from
  the resolved record. CI resolves every DOI and fails on a mismatch.
- For **pre-instrumental or reconstructed** events, report the published
  estimate, describe its uncertainty in `description` (e.g. a Dst range), and
  list the field in `estimatedFields` so the app marks it as approximate.
  Fields that predate their instrument (Kp/Ap 1932, Dst 1957, in-situ solar
  wind 1962, GOES flare classes 1975) must be either `null` or estimated.
- NOAA G/S/R scales are derived quantities: they must agree with the stored
  peak Kp, >10 MeV proton flux, and flare class respectively.
- Use `null` for genuinely unknown values, never a guessed placeholder; use
  `cyclePhase: "unknown"` where no published estimate exists.

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
