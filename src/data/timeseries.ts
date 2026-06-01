import type { TimeSeriesDataPoint } from "@/lib/types";
import { TIME_SERIES_DATA, type EventTimeSeriesData } from "./timeseries-data";

/**
 * Time series data for space weather events.
 *
 * All data is real, observed data from scientific archives:
 *   Dst: WDC for Geomagnetism, Kyoto (wdc.kugi.kyoto-u.ac.jp)
 *   Neutron monitors: NMDB (nmdb.eu)
 */

export interface EventTimeSeries {
  dst?: TimeSeriesDataPoint[];
  kp?: TimeSeriesDataPoint[];
  protonFlux?: TimeSeriesDataPoint[];
  neutronMonitor?: TimeSeriesDataPoint[];
}

/**
 * Returns observed time series data for an event, if available.
 * Returns empty object if no real data has been ingested yet.
 */
export function getEventTimeSeries(eventId: string): EventTimeSeries {
  return TIME_SERIES_DATA[eventId] || {};
}

/**
 * Check whether any time series data exists for an event.
 */
export function hasTimeSeriesData(eventId: string): boolean {
  const ts = getEventTimeSeries(eventId);
  return !!(ts.dst || ts.kp || ts.protonFlux || ts.neutronMonitor);
}
