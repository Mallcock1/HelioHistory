"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type MouseEvent,
  type WheelEvent,
} from "react";
import type { SpaceWeatherEvent } from "@/lib/types";
import {
  dateToYear,
  yearToPixel,
  getZoomLevel,
  getGridInterval,
  getEventColor,
  getEventSeverity,
  getVisibleEvents,
  formatYear,
  getVerticalMetricValue,
  currentDecimalYear,
  VERTICAL_METRIC_LABELS,
  type VerticalMetric,
} from "@/lib/timeline-utils";
import { SUNSPOT_YEARLY } from "@/data/sunspots";
import { SUNSPOT_MONTHLY } from "@/data/sunspots-monthly";
import { getEventTimeSeries } from "@/data/timeseries";


interface TimelineCanvasProps {
  events: SpaceWeatherEvent[];
  onEventClick: (event: SpaceWeatherEvent) => void;
  onEventHover: (event: SpaceWeatherEvent | null) => void;
  onDeselect: () => void;
  hoveredEvent: SpaceWeatherEvent | null;
  selectedEvent: SpaceWeatherEvent | null;
  verticalMetric: VerticalMetric;
}

const MIN_YEAR = -12600; // reach the deep-history cosmogenic-isotope events (e.g. 12350 BC)
const NOW_YEAR = currentDecimalYear(); // present moment, advances automatically each load
const MAX_YEAR = NOW_YEAR + 2 / 12; // small margin past "now" so the marker isn't flush to the edge
const INITIAL_START = 1840;
const INITIAL_END = MAX_YEAR;

// Canvas layout
const GRID_LABEL_Y = 50;
const EVENT_MARKER_MIN_WIDTH = 24;
const TRACK_TOP = 100;
const TRACK_BOTTOM_PAD = 60;
const BASELINE_FRACTION = 0.75;
const Y_AXIS_WIDTH = 58; // pixels reserved for Y-axis labels

const MONTHLY_FIRST_YEAR = SUNSPOT_MONTHLY.length ? SUNSPOT_MONTHLY[0][0] : Infinity;
const MONTHLY_LAST_YEAR = SUNSPOT_MONTHLY.length
  ? SUNSPOT_MONTHLY[SUNSPOT_MONTHLY.length - 1][0]
  : -Infinity;

/** First index in SUNSPOT_MONTHLY whose decimal year is >= target. */
function lowerBoundMonthly(target: number): number {
  let lo = 0;
  let hi = SUNSPOT_MONTHLY.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (SUNSPOT_MONTHLY[mid][0] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Y-axis tick configurations per metric
function getYAxisTicks(metric: VerticalMetric): { label: string; value: number }[] {
  switch (metric) {
    case "auto":
      return [
        { label: "5", value: 1.0 },
        { label: "4", value: 0.8 },
        { label: "3", value: 0.6 },
        { label: "2", value: 0.4 },
        { label: "1", value: 0.2 },
      ];
    case "noaaG":
      return [
        { label: "G5", value: 1.0 },
        { label: "G4", value: 0.8 },
        { label: "G3", value: 0.6 },
        { label: "G2", value: 0.4 },
        { label: "G1", value: 0.2 },
      ];
    case "noaaS":
      return [
        { label: "S5", value: 1.0 },
        { label: "S4", value: 0.8 },
        { label: "S3", value: 0.6 },
        { label: "S2", value: 0.4 },
        { label: "S1", value: 0.2 },
      ];
    case "noaaR":
      return [
        { label: "R5", value: 1.0 },
        { label: "R4", value: 0.8 },
        { label: "R3", value: 0.6 },
        { label: "R2", value: 0.4 },
        { label: "R1", value: 0.2 },
      ];
    case "peakDst":
      return [
        { label: "-800", value: 1.0 },
        { label: "-600", value: 0.75 },
        { label: "-400", value: 0.5 },
        { label: "-200", value: 0.25 },
        { label: "0", value: 0.0 },
      ];
    case "peakKp":
      return [
        { label: "9", value: 1.0 },
        { label: "7", value: 0.78 },
        { label: "5", value: 0.56 },
        { label: "3", value: 0.33 },
        { label: "1", value: 0.11 },
      ];
    case "impactCount":
      return [
        { label: "6+", value: 1.0 },
        { label: "4", value: 0.67 },
        { label: "2", value: 0.33 },
        { label: "0", value: 0.0 },
      ];
    case "cmeSpeed":
      return [
        { label: "3000", value: 1.0 },
        { label: "2000", value: 0.67 },
        { label: "1000", value: 0.33 },
        { label: "0", value: 0.0 },
      ];
    case "duration":
      return [
        { label: "120h", value: 1.0 },
        { label: "80h", value: 0.67 },
        { label: "40h", value: 0.33 },
        { label: "0", value: 0.0 },
      ];
  }
}

export default function TimelineCanvas({
  events,
  onEventClick,
  onEventHover,
  onDeselect,
  hoveredEvent,
  selectedEvent,
  verticalMetric,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const mouseDownXRef = useRef(0);
  const velocityRef = useRef(0);

  const [viewport, setViewport] = useState({
    start: INITIAL_START,
    end: INITIAL_END,
  });
  const savedViewportRef = useRef<{ start: number; end: number } | null>(null);
  const zoomAnimRef = useRef<number>(0);

  // Smooth viewport animation
  const animateToViewport = useCallback((target: { start: number; end: number }, durationMs = 500) => {
    if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);
    const from = { ...viewport };
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const start = from.start + (target.start - from.start) * ease;
      const end = from.end + (target.end - from.end) * ease;
      setViewport({ start, end });
      if (t < 1) {
        zoomAnimRef.current = requestAnimationFrame(step);
      }
    };
    zoomAnimRef.current = requestAnimationFrame(step);
  }, [viewport]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const eventRectsRef = useRef<
    Map<string, { x: number; y: number; w: number; h: number }>
  >(new Map());

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({
        width: Math.floor(width * window.devicePixelRatio),
        height: Math.floor(height * window.devicePixelRatio),
      });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Zoom into exact cursor position, accounting for Y-axis offset
  const doZoom = useCallback(
    (clientX: number, deltaY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const axisWidthCSS = Y_AXIS_WIDTH;
      const mouseX = clientX - rect.left;
      // Map cursor position to the plot area (excluding Y-axis strip)
      const plotWidth = rect.width - axisWidthCSS;
      const fraction = Math.max(0, Math.min(1, (mouseX - axisWidthCSS) / plotWidth));
      const range = viewport.end - viewport.start;
      // At the edges, don't zoom if already clamped
      if (deltaY > 0) {
        // Zooming out – fine anywhere
      } else {
        // Zooming in – stop if already at minimum range
        if (range <= 0.02) return;
      }
      const zoomFactor = deltaY > 0 ? 1.15 : 0.87;
      const newRange = Math.max(0.01, Math.min(MAX_YEAR - MIN_YEAR, range * zoomFactor));
      const mouseYear = viewport.start + fraction * range;
      let newStart = mouseYear - fraction * newRange;
      let newEnd = newStart + newRange;
      // Clamp to bounds – if already at edge, don't shift further
      if (newStart < MIN_YEAR) { newStart = MIN_YEAR; newEnd = newStart + newRange; }
      if (newEnd > MAX_YEAR) { newEnd = MAX_YEAR; newStart = newEnd - newRange; }
      newStart = Math.max(MIN_YEAR, newStart);
      setViewport({ start: newStart, end: newEnd });
    },
    [viewport]
  );

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      doZoom(e.clientX, e.deltaY);
    },
    [doZoom]
  );

  // Capture wheel events on the page so scrolling anywhere zooms the timeline,
  // EXCEPT when the cursor is over a scrollable panel (e.g. event detail)
  const doZoomRef = useRef(doZoom);
  doZoomRef.current = doZoom;
  useEffect(() => {
    const handler = (e: globalThis.WheelEvent) => {
      // Allow normal scrolling inside scrollable containers (detail panel, etc.)
      let el = e.target as HTMLElement | null;
      while (el) {
        if (el.getAttribute("data-allow-scroll") === "true") return;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
          return; // let the scrollable element handle it
        }
        el = el.parentElement;
      }
      e.preventDefault();
      doZoomRef.current(e.clientX, e.deltaY);
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      lastMouseXRef.current = e.clientX;
      mouseDownXRef.current = e.clientX;
      velocityRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseXRef.current;
        const rect = canvas.getBoundingClientRect();
        const range = viewport.end - viewport.start;
        const plotWidth = rect.width - Y_AXIS_WIDTH;
        const yearDelta = -(dx / plotWidth) * range;
        velocityRef.current = yearDelta;
        const newStart = Math.max(MIN_YEAR, viewport.start + yearDelta);
        const newEnd = Math.min(MAX_YEAR, newStart + range);
        setViewport({ start: newStart, end: newEnd });
        lastMouseXRef.current = e.clientX;
      } else {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * window.devicePixelRatio;
        const y = (e.clientY - rect.top) * window.devicePixelRatio;
        let found: SpaceWeatherEvent | null = null;
        for (const event of events) {
          const r = eventRectsRef.current.get(event.id);
          if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
            found = event;
            break;
          }
        }
        if (found?.id !== hoveredEventId) {
          setHoveredEventId(found?.id || null);
          onEventHover(found);
        }
        canvas.style.cursor = found ? "pointer" : isDraggingRef.current ? "grabbing" : "grab";
      }
    },
    [viewport, events, hoveredEventId, onEventHover]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) {
        const totalDrag = Math.abs(e.clientX - mouseDownXRef.current);
        isDraggingRef.current = false;
        if (totalDrag < 5) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const x = (e.clientX - rect.left) * window.devicePixelRatio;
          const y = (e.clientY - rect.top) * window.devicePixelRatio;
          for (const event of events) {
            const r = eventRectsRef.current.get(event.id);
            if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
              onEventClick(event);
              return;
            }
          }
          // Clicked empty space – close any open panel
          if (selectedEvent) {
            onDeselect();
          }
        }
        if (Math.abs(velocityRef.current) > 0.01) {
          const decelerate = () => {
            velocityRef.current *= 0.92;
            if (Math.abs(velocityRef.current) < 0.001) return;
            setViewport((prev) => {
              const range = prev.end - prev.start;
              const newStart = Math.max(MIN_YEAR, prev.start + velocityRef.current);
              const newEnd = Math.min(MAX_YEAR, newStart + range);
              return { start: newStart, end: newEnd };
            });
            animFrameRef.current = requestAnimationFrame(decelerate);
          };
          animFrameRef.current = requestAnimationFrame(decelerate);
        }
      }
    },
    [events, onEventClick, onDeselect, selectedEvent]
  );

  // Animate viewport when event is selected/deselected
  const prevSelectedRef = useRef<SpaceWeatherEvent | null>(null);
  useEffect(() => {
    const prevSelected = prevSelectedRef.current;
    prevSelectedRef.current = selectedEvent;

    if (selectedEvent && !prevSelected) {
      // Event just selected – save current viewport and zoom to event
      savedViewportRef.current = { ...viewport };
      const eventStart = dateToYear(selectedEvent.startDate);
      const eventEnd = dateToYear(selectedEvent.endDate);
      // Include time series data range for zoom calculation
      const ts = getEventTimeSeries(selectedEvent.id);
      const allData = [
        ...(ts.dst || []),
        ...(ts.kp || []),
        ...(ts.neutronMonitor || []),
      ];
      let zoomStart = eventStart;
      let zoomEnd = eventEnd;
      if (allData.length > 0) {
        const isoToYr = (iso: string): number => {
          const d = new Date(iso);
          const yr = d.getUTCFullYear();
          const s = Date.UTC(yr, 0, 1);
          const e = Date.UTC(yr + 1, 0, 1);
          return yr + (d.getTime() - s) / (e - s);
        };
        zoomStart = Math.min(zoomStart, ...allData.map(d => isoToYr(d.time)));
        zoomEnd = Math.max(zoomEnd, ...allData.map(d => isoToYr(d.time)));
      }
      const eventSpan = Math.max(zoomEnd - zoomStart, 0.01);
      const eventMid = (zoomStart + zoomEnd) / 2;
      // Padding is extra space on each side beyond the event/data range
      const margin = Math.max(eventSpan * 0.4, 0.02);
      // Total viewport range = event span + margin on each side
      const totalRange = eventSpan + 2 * margin;
      // Position event at center of visible area (left of the 480px panel)
      const canvasW = canvasRef.current?.clientWidth || 1;
      const panelW = canvasW >= 640 ? 480 : 0;
      // Fraction from left edge where event should be centered
      const centerFrac = (canvasW - panelW) / (2 * canvasW);
      const vpStart = eventMid - totalRange * centerFrac;
      animateToViewport({
        start: Math.max(MIN_YEAR, vpStart),
        end: Math.min(MAX_YEAR, vpStart + totalRange),
      }, 600);
    } else if (!selectedEvent && prevSelected && savedViewportRef.current) {
      // Event deselected – restore previous viewport
      animateToViewport(savedViewportRef.current, 500);
      savedViewportRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  // ═══════════════════════════════════════════
  // STABLE LANE ASSIGNMENT (viewport-independent)
  // Prevents jitter by computing fixed vertical offsets based on temporal overlap.
  // ═══════════════════════════════════════════
  const eventLanes = useMemo(() => {
    const lanes = new Map<string, number>();
    // Sort by start date, then by severity descending (important events get lane 0)
    const sorted = [...events].sort((a, b) => {
      const aStart = dateToYear(a.startDate);
      const bStart = dateToYear(b.startDate);
      if (aStart !== bStart) return aStart - bStart;
      return getEventSeverity(b) - getEventSeverity(a);
    });

    // Greedy interval-graph coloring: assign each event to the lowest lane
    // where it doesn't overlap temporally with existing events in that lane.
    // "Overlap" means their display ranges (with padding) intersect.
    const laneEnds: number[] = []; // laneEnds[i] = the latest end-year in lane i

    for (const event of sorted) {
      const start = dateToYear(event.startDate);
      const end = dateToYear(event.endDate);
      // Add padding so nearby events don't overlap visually
      const pad = Math.max((end - start) * 0.5, 0.5);
      const displayEnd = end + pad;

      let assigned = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (start >= laneEnds[i]) {
          assigned = i;
          break;
        }
      }
      if (assigned === -1) {
        assigned = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[assigned] = displayEnd;
      lanes.set(event.id, assigned);
    }
    return lanes;
  }, [events]);

  // ═══════════════════════════════════════════
  // DRAW
  // ═══════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark");
    const dpr = window.devicePixelRatio;
    const w = canvasSize.width;
    const h = canvasSize.height;
    const axisW = Y_AXIS_WIDTH * dpr;
    const plotLeft = axisW; // plot area starts after Y-axis
    const plotW = w - plotLeft;

    ctx.clearRect(0, 0, w, h);

    const range = viewport.end - viewport.start;
    const zoomLevel = getZoomLevel(range);
    const grid = getGridInterval(zoomLevel);
    const showInlineTimeSeries = range < 5; // show when zoomed to a few years or finer

    // Helper: ISO datetime string to fractional year
    const isoToYear = (iso: string): number => {
      const d = new Date(iso);
      const year = d.getUTCFullYear();
      const start = Date.UTC(year, 0, 1);
      const end = Date.UTC(year + 1, 0, 1);
      return year + (d.getTime() - start) / (end - start);
    };

    // ── Background ──
    if (isDark) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#060a18");
      bgGrad.addColorStop(0.4, "#080e1e");
      bgGrad.addColorStop(1, "#0a1225");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      const helioGrad = ctx.createRadialGradient(w * 0.3, 0, 0, w * 0.3, 0, h * 0.8);
      helioGrad.addColorStop(0, "rgba(245, 158, 11, 0.04)");
      helioGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.01)");
      helioGrad.addColorStop(1, "transparent");
      ctx.fillStyle = helioGrad;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Light mode warm cream background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#f8f6f0");
      bgGrad.addColorStop(0.4, "#f5f2eb");
      bgGrad.addColorStop(1, "#f0ede5");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      const helioGrad = ctx.createRadialGradient(w * 0.3, 0, 0, w * 0.3, 0, h * 0.8);
      helioGrad.addColorStop(0, "rgba(245, 158, 11, 0.06)");
      helioGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.02)");
      helioGrad.addColorStop(1, "transparent");
      ctx.fillStyle = helioGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ── Track layout ──
    const trackTopY = TRACK_TOP * dpr;
    const trackArea = h - trackTopY - TRACK_BOTTOM_PAD * dpr;
    const baselineY = trackTopY + trackArea * BASELINE_FRACTION;
    const maxVerticalDisplacement = trackArea * BASELINE_FRACTION * 0.85;

    // Helper: year to pixel in plot area
    const yearToPx = (year: number) =>
      plotLeft + yearToPixel(year, viewport.start, viewport.end, plotW);

    // ── Solar cycle line (level-of-detail; drawn through real data points) ──
    // Rather than sampling a function at viewport-relative positions every frame
    // (which makes the curve "swim" as you pan/zoom), we draw a polyline through
    // the actual sunspot observations at their fixed years. Resolution steps up
    // with zoom: yearly means when zoomed out, the monthly record when zoomed in,
    // plus a scatter of the monthly observations when zoomed in far enough.
    const maxSunspot = 285;
    const cycleAmplitude = trackArea * 0.4;
    const winLo = viewport.start;
    const winHi = viewport.end;
    const useMonthly = range <= 120;

    const cyclePts: { year: number; value: number }[] = [];
    if (useMonthly) {
      // Yearly means for any visible span before the monthly record begins (pre-1749).
      if (winLo < MONTHLY_FIRST_YEAR) {
        const cap = Math.min(MONTHLY_FIRST_YEAR, winHi + 2);
        for (const d of SUNSPOT_YEARLY) {
          if (d.year < winLo - 2) continue;
          if (d.year >= cap) break;
          cyclePts.push({ year: d.year, value: d.value });
        }
      }
      // Monthly record within the window (+1 neighbour each side for edge continuity).
      if (winHi >= MONTHLY_FIRST_YEAR) {
        const a = Math.max(0, lowerBoundMonthly(winLo) - 1);
        const b = Math.min(SUNSPOT_MONTHLY.length - 1, lowerBoundMonthly(winHi) + 1);
        for (let i = a; i <= b; i++) {
          cyclePts.push({ year: SUNSPOT_MONTHLY[i][0], value: SUNSPOT_MONTHLY[i][1] });
        }
      }
    } else {
      for (const d of SUNSPOT_YEARLY) {
        if (d.year < winLo - 5) continue;
        if (d.year > winHi + 5) break;
        cyclePts.push({ year: d.year, value: d.value });
      }
    }

    if (cyclePts.length >= 2) {
      const ptX = (p: { year: number }) => yearToPx(p.year);
      const ptY = (p: { value: number }) =>
        baselineY - Math.min(1, p.value / maxSunspot) * cycleAmplitude;

      // Filled area under the line.
      ctx.beginPath();
      ctx.moveTo(ptX(cyclePts[0]), ptY(cyclePts[0]));
      for (let i = 1; i < cyclePts.length; i++) ctx.lineTo(ptX(cyclePts[i]), ptY(cyclePts[i]));
      ctx.lineTo(ptX(cyclePts[cyclePts.length - 1]), baselineY);
      ctx.lineTo(ptX(cyclePts[0]), baselineY);
      ctx.closePath();
      const cycleGrad = ctx.createLinearGradient(0, baselineY - cycleAmplitude, 0, baselineY);
      cycleGrad.addColorStop(0, "rgba(245, 158, 11, 0.10)");
      cycleGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.04)");
      cycleGrad.addColorStop(1, "rgba(245, 158, 11, 0.01)");
      ctx.fillStyle = cycleGrad;
      ctx.fill();

      // Line.
      ctx.beginPath();
      ctx.moveTo(ptX(cyclePts[0]), ptY(cyclePts[0]));
      for (let i = 1; i < cyclePts.length; i++) ctx.lineTo(ptX(cyclePts[i]), ptY(cyclePts[i]));
      ctx.strokeStyle = "rgba(245, 158, 11, 0.18)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      // Scatter of the actual monthly observations once zoomed in enough that the
      // points are visually separated.
      if (useMonthly && range <= 35) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.55)";
        for (const p of cyclePts) {
          if (p.year < MONTHLY_FIRST_YEAR || p.year > MONTHLY_LAST_YEAR) continue;
          ctx.beginPath();
          ctx.arc(ptX(p), ptY(p), 1.7 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Grid lines with overlap-aware labels ──
    const startMajor = Math.floor(viewport.start / grid.major) * grid.major;
    ctx.font = `500 ${13 * dpr}px system-ui, sans-serif`;
    const minLabelSpacing = 60 * dpr; // minimum pixels between label centres
    let lastLabelRight = -Infinity;

    for (let year = startMajor; year <= viewport.end; year += grid.major) {
      const x = yearToPx(year);
      if (x < plotLeft) continue;

      // Always draw the grid line
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Only draw label if it won't overlap the previous one
      const labelText = grid.labelFormat(year);
      const labelW = ctx.measureText(labelText).width;
      const labelLeft = x - labelW / 2;

      if (labelLeft > lastLabelRight + 12 * dpr) {
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(labelText, x, GRID_LABEL_Y * dpr);
        lastLabelRight = x + labelW / 2;
      }
    }

    // Minor grid lines (no labels)
    const startMinor = Math.floor(viewport.start / grid.minor) * grid.minor;
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.03)";
    for (let year = startMinor; year <= viewport.end; year += grid.minor) {
      const x = yearToPx(year);
      if (x < plotLeft) continue;
      ctx.beginPath();
      ctx.moveTo(x, trackTopY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // ── "Now" marker ──
    const nowX = yearToPx(NOW_YEAR);
    if (nowX >= plotLeft && nowX <= w) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(nowX, trackTopY - 10 * dpr);
      ctx.lineTo(nowX, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(245, 158, 11, 0.6)";
      ctx.font = `500 ${10 * dpr}px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("now", nowX - 4 * dpr, trackTopY - 2 * dpr);
    }

    // ── Baseline ──
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(plotLeft, baselineY);
    ctx.lineTo(w, baselineY);
    ctx.stroke();

    // ── Y-Axis ──
    // Background strip
    ctx.fillStyle = isDark ? "rgba(6, 10, 24, 0.85)" : "rgba(248, 246, 240, 0.9)";
    ctx.fillRect(0, 0, axisW, h);
    // Separator line
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(axisW, trackTopY - 10 * dpr);
    ctx.lineTo(axisW, h);
    ctx.stroke();

    // Metric label (rotated)
    ctx.save();
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
    ctx.font = `600 ${13 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.translate(12 * dpr, trackTopY + trackArea * 0.35);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(VERTICAL_METRIC_LABELS[verticalMetric], 0, 0);
    ctx.restore();

    // Tick marks and labels
    const ticks = getYAxisTicks(verticalMetric);
    ctx.font = `500 ${13 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    for (const tick of ticks) {
      const y = baselineY - tick.value * maxVerticalDisplacement;
      // Tick line
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(axisW - 4 * dpr, y);
      ctx.lineTo(axisW, y);
      ctx.stroke();
      // Dashed guide line across plot
      ctx.setLineDash([4 * dpr, 6 * dpr]);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)";
      ctx.beginPath();
      ctx.moveTo(axisW, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)";
      ctx.fillText(tick.label, axisW - 8 * dpr, y + 4 * dpr);
    }

    // ── Events ──
    const visibleEvents = getVisibleEvents(events, viewport.start, viewport.end);
    const newRects = new Map<string, { x: number; y: number; w: number; h: number }>();

    const sortedEvents = [...visibleEvents].sort((a, b) =>
      dateToYear(a.startDate) - dateToYear(b.startDate)
    );

    // Pre-measure label widths
    ctx.font = `500 ${13 * dpr}px system-ui, sans-serif`;
    const labelWidths = new Map<string, number>();
    for (const event of sortedEvents) {
      labelWidths.set(event.id, ctx.measureText(event.name).width);
    }

    // Phase 1: compute TRUE positions for every event
    interface EventLayout {
      event: SpaceWeatherEvent;
      trueX: number;       // true horizontal center (from date)
      trueY: number;       // true vertical center (from metric)
      barX: number;        // bar left edge
      barW: number;        // bar width
      barH: number;        // bar height
      displayY: number;    // where we actually render (may be displaced)
      displaced: boolean;  // whether this event was moved
      severity: number;
      color: string;
      importance: number;  // 0-10 importance score for collapse decisions
      collapsed: boolean;  // if true, render as small marker without label
    }

    const layouts: EventLayout[] = sortedEvents.map((event) => {
      let eventStart = dateToYear(event.startDate);
      let eventEnd = dateToYear(event.endDate);

      // Extend bar to cover the full time series data range
      const ts = getEventTimeSeries(event.id);
      const allData = [
        ...(ts.dst || []),
        ...(ts.kp || []),
        ...(ts.neutronMonitor || []),
      ];
      if (allData.length > 0) {
        const dataStart = Math.min(...allData.map(d => isoToYear(d.time)));
        const dataEnd = Math.max(...allData.map(d => isoToYear(d.time)));
        eventStart = Math.min(eventStart, dataStart);
        eventEnd = Math.max(eventEnd, dataEnd);
      }

      const x1 = yearToPx(eventStart);
      const x2 = yearToPx(eventEnd);
      const barW = Math.max(EVENT_MARKER_MIN_WIDTH * dpr, x2 - x1);
      const severity = getEventSeverity(event);
      const color = getEventColor(event);

      const metricVal = getVerticalMetricValue(event, verticalMetric);
      const normalizedVal = metricVal !== null ? metricVal : 0.3;
      const trueY = baselineY - normalizedVal * maxVerticalDisplacement;
      const barH = 36 * dpr; // constant height – position encodes severity

      // Importance score (0-10): higher = always shown with label
      let importance = severity * 1.5; // base: 1.5 to 7.5
      if (event.noaaGScale && event.noaaGScale >= 4) importance += 2;
      if (event.noaaGScale === 5) importance += 1;
      if (event.peakDst !== null && Math.abs(event.peakDst) >= 300) importance += 1;
      if (event.impacts.length >= 3) importance += 0.5;
      if (event.auroraLowestLatitude !== null && event.auroraLowestLatitude <= 30) importance += 0.5;
      importance = Math.min(10, importance);

      return {
        event,
        trueX: x1 + barW / 2,
        trueY,
        barX: x1,
        barW,
        barH,
        displayY: trueY,
        displaced: false,
        severity,
        color,
        importance,
        collapsed: false,
      };
    });

    // Phase 1.5: determine which events to collapse based on density
    // If there are many visible events, collapse lower-importance ones
    const pxPerEvent = w / Math.max(1, layouts.length);
    const crowded = pxPerEvent < 120 * dpr; // less than ~120px per event = crowded
    if (crowded && layouts.length > 8) {
      // Sort by importance descending to determine threshold
      const sortedByImportance = [...layouts].sort((a, b) => b.importance - a.importance);
      // Keep the top N events expanded based on available space
      const maxExpanded = Math.max(6, Math.floor(w / (120 * dpr)));
      for (let i = maxExpanded; i < sortedByImportance.length; i++) {
        const layout = sortedByImportance[i];
        // Never collapse hovered or selected events
        if (hoveredEvent?.id === layout.event.id || hoveredEventId === layout.event.id ||
            selectedEvent?.id === layout.event.id) continue;
        layout.collapsed = true;
        layout.barH = 12 * dpr; // much smaller bar
      }
    }

    // Phase 2: apply stable lane-based displacement (viewport-independent)
    // Events in lane 0 stay at their metric Y; lane 1+ are displaced downward.
    const LANE_STEP = 30 * dpr; // vertical pixels between lanes

    for (const layout of layouts) {
      const lane = eventLanes.get(layout.event.id) || 0;
      if (lane > 0) {
        layout.displayY = layout.trueY + lane * LANE_STEP;
        layout.displaced = true;
      }
    }

    // Phase 3: draw everything – collapsed events first (behind), then expanded
    const expandedLayouts = layouts.filter(l => !l.collapsed);
    const collapsedLayouts = layouts.filter(l => l.collapsed);

    // Draw collapsed events as small colored rectangles
    for (const layout of collapsedLayouts) {
      const { event, barX, barW, barH, displayY, color, severity } = layout;
      const isHovered = hoveredEvent?.id === event.id || hoveredEventId === event.id;
      const eventY = displayY - barH / 2;

      // Store hit rect (still clickable)
      newRects.set(event.id, {
        x: barX - 2 * dpr,
        y: eventY - 4 * dpr,
        w: Math.max(barW, 8 * dpr) + 4 * dpr,
        h: barH + 8 * dpr,
      });

      // Small colored marker
      const markerW = Math.max(barW, 6 * dpr);
      const radius = 2 * dpr;
      ctx.beginPath();
      ctx.roundRect(barX, eventY, markerW, barH, radius);
      const alpha = isHovered ? "cc" : severity >= 4 ? "88" : "55";
      ctx.fillStyle = color + alpha;
      ctx.fill();
      if (isHovered) {
        ctx.strokeStyle = color + "cc";
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      // Thin beacon line for collapsed events
      const markerX = barX + markerW / 2;
      ctx.strokeStyle = color + "08";
      ctx.lineWidth = 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(markerX, eventY - 4 * dpr);
      ctx.lineTo(markerX, baselineY);
      ctx.stroke();
    }

    // Draw expanded events
    for (const layout of expandedLayouts) {
      const { event, trueX, trueY, barX, barW, barH, displayY, displaced, severity, color } = layout;
      const isHovered = hoveredEvent?.id === event.id || hoveredEventId === event.id;
      const isSelected = selectedEvent?.id === event.id;
      const eventY = displayY - barH / 2;

      // Store hit rect
      newRects.set(event.id, {
        x: barX - 4 * dpr,
        y: eventY - 20 * dpr,
        w: barW + 8 * dpr,
        h: barH + 40 * dpr,
      });

      // ── Stalk from displaced position to true position ──
      if (displaced && Math.abs(displayY - trueY) > 8 * dpr) {
        // True position anchor marker (small diamond)
        ctx.fillStyle = color + "88";
        ctx.beginPath();
        const d = 4 * dpr;
        ctx.moveTo(trueX, trueY - d);
        ctx.lineTo(trueX + d, trueY);
        ctx.lineTo(trueX, trueY + d);
        ctx.lineTo(trueX - d, trueY);
        ctx.closePath();
        ctx.fill();

        // Stalk line – curved connector
        ctx.strokeStyle = color + "30";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(trueX, trueY + d);
        const midY = (trueY + displayY) / 2;
        ctx.bezierCurveTo(trueX, midY, barX + barW / 2, midY, barX + barW / 2, eventY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Bloom / glow ──
      if (severity >= 4 || isHovered || isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = (isHovered || isSelected ? 30 : severity >= 5 ? 24 : 16) * dpr;
        ctx.fillStyle = color + "00";
        ctx.fillRect(barX, eventY, barW, barH);
      }
      if (severity >= 3) {
        ctx.shadowColor = color;
        ctx.shadowBlur = (isHovered ? 20 : severity >= 4 ? 12 : 6) * dpr;
      }

      // ── Vertical beacon line ──
      const markerX = barX + barW / 2;
      const beaconTop = eventY - 15 * dpr;
      const beaconBottom = Math.min(baselineY + 15 * dpr, h - 10 * dpr);
      const markerGrad = ctx.createLinearGradient(0, beaconTop, 0, beaconBottom);
      markerGrad.addColorStop(0, color + "00");
      markerGrad.addColorStop(0.3, color + (severity >= 4 ? "20" : "10"));
      markerGrad.addColorStop(0.5, color + (severity >= 4 ? "40" : "18"));
      markerGrad.addColorStop(0.7, color + (severity >= 4 ? "20" : "10"));
      markerGrad.addColorStop(1, color + "00");
      ctx.strokeStyle = markerGrad;
      ctx.lineWidth = (isHovered ? 2 : 1) * dpr;
      ctx.beginPath();
      ctx.moveTo(markerX, beaconTop);
      ctx.lineTo(markerX, beaconBottom);
      ctx.stroke();

      // ── Event bar ──
      const radius = 4 * dpr;
      ctx.beginPath();
      ctx.roundRect(barX, eventY, barW, barH, radius);

      const grad = ctx.createLinearGradient(barX, eventY, barX, eventY + barH);
      if (severity >= 5) {
        grad.addColorStop(0, color + (isHovered ? "ff" : "ee"));
        grad.addColorStop(0.3, color + (isHovered ? "dd" : "bb"));
        grad.addColorStop(1, color + (isHovered ? "aa" : "66"));
      } else if (severity >= 4) {
        grad.addColorStop(0, color + (isHovered ? "ee" : "cc"));
        grad.addColorStop(1, color + (isHovered ? "bb" : "55"));
      } else if (severity >= 3) {
        grad.addColorStop(0, color + (isHovered ? "dd" : "aa"));
        grad.addColorStop(1, color + (isHovered ? "99" : "44"));
      } else {
        grad.addColorStop(0, color + (isHovered ? "bb" : "77"));
        grad.addColorStop(1, color + (isHovered ? "77" : "33"));
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Border
      if (isSelected) {
        ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();
      } else if (isHovered) {
        ctx.strokeStyle = color + "cc";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      } else if (severity >= 4) {
        ctx.strokeStyle = color + "66";
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      } else {
        ctx.strokeStyle = color + "33";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Inner highlight
      if (severity >= 3) {
        ctx.beginPath();
        ctx.roundRect(barX + 1 * dpr, eventY + 1 * dpr, barW - 2 * dpr, barH * 0.4, [radius, radius, 0, 0]);
        const hlGrad = ctx.createLinearGradient(0, eventY, 0, eventY + barH * 0.4);
        hlGrad.addColorStop(0, isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)");
        hlGrad.addColorStop(1, isDark ? "rgba(255,255,255,0)" : "rgba(0,0,0,0)");
        ctx.fillStyle = hlGrad;
        ctx.fill();
      }

      // ── Inline time series (when zoomed in, aligned to timeline x-axis) ──
      if (showInlineTimeSeries) {
        const ts = getEventTimeSeries(event.id);
        if (ts.dst && ts.dst.length > 2) {
          const data = ts.dst;
          const minDst = Math.min(...data.map(d => d.value));
          const maxDst = Math.max(...data.map(d => d.value));
          const dstRange = maxDst - minDst || 1;

          // Chart vertical dimensions – below the event bar
          const chartH = Math.min(60 * dpr, trackArea * 0.18);
          const chartTop = eventY + barH + 6 * dpr;

          // Find the visible data range on the timeline
          const dataPoints = data.map(d => ({ x: yearToPx(isoToYear(d.time)), value: d.value }));
          const firstVisible = dataPoints.findIndex(p => p.x >= plotLeft);
          const lastVisible = dataPoints.findLastIndex(p => p.x <= plotLeft + plotW);
          if (firstVisible < 0 || lastVisible < 0) continue;

          const chartLeft = Math.max(plotLeft, dataPoints[0].x);
          const chartRight = Math.min(plotLeft + plotW, dataPoints[dataPoints.length - 1].x);
          const chartW = chartRight - chartLeft;
          if (chartW < 20 * dpr) continue; // too narrow to draw

          // Semi-transparent background band
          ctx.fillStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)";
          ctx.beginPath();
          ctx.roundRect(chartLeft - 2 * dpr, chartTop, chartW + 4 * dpr, chartH, 3 * dpr);
          ctx.fill();

          // Zero line
          const zeroY = chartTop + ((maxDst - 0) / dstRange) * chartH;
          if (zeroY > chartTop && zeroY < chartTop + chartH) {
            ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
            ctx.lineWidth = 0.5 * dpr;
            ctx.setLineDash([2 * dpr, 2 * dpr]);
            ctx.beginPath();
            ctx.moveTo(chartLeft, zeroY);
            ctx.lineTo(chartRight, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Dst curve – x positions from timeline axis
          ctx.beginPath();
          let started = false;
          for (const pt of dataPoints) {
            if (pt.x < plotLeft || pt.x > plotLeft + plotW) continue;
            const py = chartTop + ((maxDst - pt.value) / dstRange) * chartH;
            if (!started) { ctx.moveTo(pt.x, py); started = true; }
            else ctx.lineTo(pt.x, py);
          }
          ctx.strokeStyle = "#4ade80bb";
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke();

          // Fill under curve
          if (started) {
            const visiblePts = dataPoints.filter(p => p.x >= plotLeft && p.x <= plotLeft + plotW);
            const lastPt = visiblePts[visiblePts.length - 1];
            const firstPt = visiblePts[0];
            ctx.lineTo(lastPt.x, chartTop + chartH);
            ctx.lineTo(firstPt.x, chartTop + chartH);
            ctx.closePath();
            ctx.fillStyle = "rgba(74, 222, 128, 0.06)";
            ctx.fill();
          }

          // "Dst" label + peak value
          ctx.fillStyle = "rgba(74, 222, 128, 0.6)";
          ctx.font = `500 ${10 * dpr}px system-ui, sans-serif`;
          ctx.textAlign = "left";
          ctx.fillText(`Dst ${Math.round(minDst)} nT`, chartLeft + 4 * dpr, chartTop + chartH - 3 * dpr);

          // Extend hit rect
          const existingRect = newRects.get(event.id);
          if (existingRect) {
            existingRect.h = (chartTop + chartH) - existingRect.y + 4 * dpr;
          }
        }
      }

      // ── Label ──
      const labelText = event.name;
      const fontSize = (isHovered || isSelected ? 14 : 13) * dpr;
      ctx.font = `${isHovered || isSelected ? "600 " : "500 "}${fontSize}px system-ui, sans-serif`;
      const labelMetrics = ctx.measureText(labelText);

      if (barW > labelMetrics.width + 12 * dpr) {
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)";
        ctx.textAlign = "left";
        ctx.fillText(labelText, barX + 6 * dpr, eventY + barH / 2 + 4 * dpr);
      } else {
        ctx.fillStyle = isHovered || isSelected
          ? (isDark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)")
          : (isDark ? `rgba(255,255,255,${severity >= 3 ? 0.8 : 0.6})` : `rgba(0,0,0,${severity >= 3 ? 0.7 : 0.5})`);
        ctx.textAlign = "center";
        const labelX = barX + barW / 2;
        const labelY = eventY - 8 * dpr;
        ctx.fillText(labelText, labelX, labelY);

        // Thin connector from label to bar
        ctx.strokeStyle = isDark ? `rgba(255,255,255,${isHovered ? 0.2 : 0.08})` : `rgba(0,0,0,${isHovered ? 0.15 : 0.06})`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(labelX, labelY + 3 * dpr);
        ctx.lineTo(labelX, eventY - 1 * dpr);
        ctx.stroke();
      }
    }

    eventRectsRef.current = newRects;

    // ── Viewport info ──
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
    ctx.font = `400 ${11 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(
      `${formatYear(viewport.start)} – ${formatYear(viewport.end)}`,
      w - 16 * dpr,
      24 * dpr
    );
    ctx.textAlign = "left";
    ctx.fillText(zoomLevel.toUpperCase(), plotLeft + 8 * dpr, 24 * dpr);
  }, [
    canvasSize,
    viewport,
    events,
    hoveredEvent,
    hoveredEventId,
    selectedEvent,
    verticalMetric,
  ]);

  // Re-draw canvas when theme changes
  useEffect(() => {
    const handler = () => {
      // Force a re-render by nudging viewport state, which triggers the draw useEffect
      setViewport((v) => ({ ...v }));
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 400 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: isDraggingRef.current ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setHoveredEventId(null);
          onEventHover(null);
        }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-5 right-5 flex gap-1.5">
        <button
          onClick={() => {
            const r = viewport.end - viewport.start;
            const mid = (viewport.start + viewport.end) / 2;
            const nr = r * 0.7;
            setViewport({
              start: Math.max(MIN_YEAR, mid - nr / 2),
              end: Math.min(MAX_YEAR, mid + nr / 2),
            });
          }}
          className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-overlay/[0.08] transition-all text-sm font-mono"
        >
          +
        </button>
        <button
          onClick={() => {
            const r = viewport.end - viewport.start;
            const mid = (viewport.start + viewport.end) / 2;
            const nr = r * 1.4;
            setViewport({
              start: Math.max(MIN_YEAR, mid - nr / 2),
              end: Math.min(MAX_YEAR, mid + nr / 2),
            });
          }}
          className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-overlay/[0.08] transition-all text-sm font-mono"
        >
          -
        </button>
        <button
          onClick={() => setViewport({ start: MIN_YEAR, end: MAX_YEAR })}
          className="h-8 px-3 rounded-lg glass-strong flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-overlay/[0.08] transition-all text-[11px] tracking-wider uppercase"
        >
          Fit All
        </button>
      </div>

      <div className="absolute bottom-5 left-16 text-foreground/20 text-[11px] tracking-wider">
        Scroll to zoom · Drag to pan · Click event for details
      </div>
    </div>
  );
}
