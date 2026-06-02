# Governance

HelioHistory is a community-curated, open-source project. This document explains
how decisions are made and how data quality is maintained. It is intentionally
lightweight and will evolve as the community grows.

## Roles

- **Contributors** open issues and pull requests (data or code).
- **Maintainers** review and merge, curate the roadmap, and cut releases.

## Review criteria

Data pull requests are evaluated on:

1. **Schema validity**: passes `npm run data:validate` (enforced by CI).
2. **Sourcing**: quantitative claims cite reliable references in `papers[]`.
3. **Accuracy & neutrality**: values reflect the cited sources; uncertainty in
   reconstructed/historical values is stated rather than hidden.
4. **Notability**: the event meets the inclusion criteria in
   [CONTRIBUTING.md](CONTRIBUTING.md).

## Handling uncertain or disputed values

Many historical events have a *range* of published estimates (e.g. the
Carrington Dst). The convention:

- Record a representative published value in the numeric field.
- Describe the range and the disagreement, with citations, in `description`.
- When sources genuinely conflict, prefer the most recent peer-reviewed
  reconstruction and note the alternatives.

Field-level provenance and explicit uncertainty bounds are a planned schema
enhancement; until then, `description` + `papers[]` carry this context.

## Releases & citation

Releases are tagged (`vX.Y.Z`) with a changelog. We recommend archiving each
release on Zenodo to mint a citable DOI; the DOI is then recorded in
[CITATION.cff](CITATION.cff).

## Changing this process

Propose changes to governance via a pull request to this file.
