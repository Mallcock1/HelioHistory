"use client";

import Link from "next/link";
import { PROJECT } from "@/lib/citation";

/** Site footer: licensing summary, data links, citation pointer, author credit. */
export default function Footer() {
  return (
    <footer className="mt-10 border-t border-overlay/[0.06] pt-6 pb-8 text-xs text-foreground/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-foreground/50">HelioHistory</span>
          <span className="text-foreground/20">·</span>
          <span>
            Data{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/70 transition-colors"
            >
              {PROJECT.dataLicense}
            </a>{" "}
            · Code {PROJECT.codeLicense}
          </span>
          <span className="text-foreground/20">·</span>
          <Link href="/about" className="hover:text-foreground/70 transition-colors">
            About &amp; cite
          </Link>
          <span className="text-foreground/20">·</span>
          <a
            href="/data/events.json"
            className="hover:text-foreground/70 transition-colors"
          >
            Download data
          </a>
          <span className="text-foreground/20">·</span>
          <a
            href={PROJECT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground/70 transition-colors"
          >
            GitHub
          </a>
        </div>
        <div className="text-foreground/30">
          Built by{" "}
          <a
            href="https://matt.neowatt.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/50 hover:text-solar transition-colors"
          >
            Matt
          </a>
        </div>
      </div>
    </footer>
  );
}
