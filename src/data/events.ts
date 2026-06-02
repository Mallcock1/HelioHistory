// The canonical dataset lives in data/events/*.json (validated against
// schema/event.schema.json). Those files are compiled to events.generated.ts by
// `npm run data:build`. This module simply re-exports the result so the rest of
// the app keeps importing { EVENTS } from "@/data/events" unchanged.
//
// To change event data: edit data/events/<id>.json, then run `npm run data:build`.
export { EVENTS } from "./events.generated";
