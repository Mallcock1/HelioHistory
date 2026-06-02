"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Timeline" },
  { href: "/events", label: "Events" },
  { href: "/analyse", label: "Analyse" },
  { href: "/compare", label: "Compare" },
  { href: "/about", label: "About" },
];

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      {/* Outer corona glow */}
      <circle cx="20" cy="20" r="18" fill="url(#corona)" opacity="0.3" />
      {/* Inner sun body */}
      <circle cx="20" cy="20" r="12" fill="url(#sunBody)" />
      {/* Bright core */}
      <circle cx="20" cy="20" r="6" fill="url(#sunCore)" />
      {/* Corona rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="20"
          y1="20"
          x2={20 + 18 * Math.cos((angle * Math.PI) / 180)}
          y2={20 + 18 * Math.sin((angle * Math.PI) / 180)}
          stroke="url(#rayGrad)"
          strokeWidth={angle % 90 === 0 ? 1.5 : 0.8}
          strokeLinecap="round"
          opacity={angle % 90 === 0 ? 0.6 : 0.3}
        />
      ))}
      <defs>
        <radialGradient id="corona">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunBody">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="sunCore">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="rayGrad">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function NavBar({ eventCount }: { eventCount: number }) {
  const pathname = usePathname();
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="flex-none h-16 px-6 flex items-center justify-between border-b border-overlay/[0.06] z-30 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-solar/20 blur-md group-hover:bg-solar/30 transition-colors" />
            <SunIcon className="w-9 h-9 relative" />
          </div>
          <div className="flex flex-col">
            <h1 className="heading-display text-[15px] text-foreground tracking-wide leading-tight">
              HelioHistory
            </h1>
            <span className="text-[11px] text-foreground/30 tracking-widest uppercase leading-tight">
              Space Weather Living Archive
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                pathname === item.href
                  ? "bg-overlay/[0.08] text-foreground shadow-sm shadow-overlay/5"
                  : "text-foreground/35 hover:text-foreground/70 hover:bg-overlay/[0.04]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-5 text-[12px] text-foreground/30">
        <span className="font-mono tracking-wide">{eventCount} events catalogued</span>
        <span className="w-px h-3 bg-overlay/10" />
        <span className="tracking-wider">12,350 BC – Present</span>
        <span className="w-px h-3 bg-overlay/10" />
        <button
          onClick={toggleTheme}
          className="bg-overlay/5 hover:bg-overlay/10 rounded-md p-1.5 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <circle cx="10" cy="10" r="4" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1={10 + 5.5 * Math.cos((angle * Math.PI) / 180)}
                  y1={10 + 5.5 * Math.sin((angle * Math.PI) / 180)}
                  x2={10 + 7.5 * Math.cos((angle * Math.PI) / 180)}
                  y2={10 + 7.5 * Math.sin((angle * Math.PI) / 180)}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
