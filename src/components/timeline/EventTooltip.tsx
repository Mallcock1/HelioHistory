"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SpaceWeatherEvent } from "@/lib/types";
import { PHENOMENON_CONFIG } from "@/lib/types";
import { formatEventDate, getEventSeverity } from "@/lib/timeline-utils";

interface EventTooltipProps {
  event: SpaceWeatherEvent | null;
  mouseX: number;
  mouseY: number;
}

export default function EventTooltip({
  event,
  mouseX,
  mouseY,
}: EventTooltipProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: mouseX + 16,
            top: mouseY - 8,
          }}
        >
          <div className="glass-strong rounded-lg px-3 py-2.5 min-w-[200px] max-w-[300px] shadow-2xl shadow-foreground/30">
            <p className="heading-display text-sm text-foreground">{event.name}</p>
            <p className="text-xs text-foreground/50 mt-0.5">
              {formatEventDate(event.startDate)}
              {event.startDate !== event.endDate &&
                ` – ${formatEventDate(event.endDate)}`}
            </p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {event.phenomena.slice(0, 3).map((p, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-overlay/10"
                  style={{ color: PHENOMENON_CONFIG[p.type].color }}
                >
                  {PHENOMENON_CONFIG[p.type].shortLabel}
                  {p.subtype ? ` ${p.subtype}` : ""}
                </span>
              ))}
            </div>
            {event.peakDst && (
              <p className="text-xs text-foreground/40 mt-1 font-mono">
                Dst: {event.peakDst} nT
                {event.peakKp && ` · Kp: ${event.peakKp}`}
              </p>
            )}
            <div className="flex mt-1.5 gap-0.5">
              {Array.from({ length: getEventSeverity(event) }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-solar"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
