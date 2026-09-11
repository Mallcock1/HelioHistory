import type { TimeSeriesDataPoint } from "@/lib/types";
import { TIME_SERIES_DATA } from "./timeseries-data";

/**
 * Time series data for space weather events.
 *
 * Dst and Kp series are observed data from scientific archives:
 *   Dst: WDC for Geomagnetism, Kyoto (wdc.kugi.kyoto-u.ac.jp)
 *   Kp:  GFZ Potsdam (doi:10.5880/Kp.0001)
 * Neutron-monitor series are NMDB (nmdb.eu) observations except where
 * `neutronMonitorModelled` is set, in which case they are parametric profiles
 * fitted to a published peak magnitude and the UI labels them as modelled.
 */

export interface EventTimeSeries {
  dst?: TimeSeriesDataPoint[];
  kp?: TimeSeriesDataPoint[];
  protonFlux?: TimeSeriesDataPoint[];
  neutronMonitor?: TimeSeriesDataPoint[];
  neutronMonitorModelled?: boolean;
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
