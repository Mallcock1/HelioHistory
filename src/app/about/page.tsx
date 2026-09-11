"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import { EVENTS } from "@/data/events";
import { dateToYear, formatYear } from "@/lib/timeline-utils";
import {
  PROJECT,
  projectCitation,
  projectBibtex,
} from "@/lib/citation";

const EARLIEST_YEAR = Math.min(...EVENTS.map((e) => dateToYear(e.startDate)));

// Upstream datasets the site is built on. Attribution requirements: SILSO asks
// for the observatory to be credited; GFZ Kp is CC BY 4.0; CDS/A&A data is free
// for research use with citation of the paper.
const DATA_SOURCES = [
  {
    name: "WDC-SILSO, Royal Observatory of Belgium",
    what: "Monthly and yearly total sunspot numbers (v2.0) and yearly group numbers – the solar-cycle backdrop of the timeline from 1610.",
    href: "https://www.sidc.be/SILSO/",
  },
  {
    name: "Usoskin et al. (2021), A&A 649, A141",
    what: "Annual sunspot numbers 971–1899 reconstructed from tree-ring radiocarbon (CDS J/A+A/649/A141) – the dashed ¹⁴C series before 1610.",
    href: "https://doi.org/10.1051/0004-6361/202140711",
  },
  {
    name: "WDC for Geomagnetism, Kyoto",
    what: "Hourly Dst index series for individual storms.",
    href: "https://wdc.kugi.kyoto-u.ac.jp/",
  },
  {
    name: "GFZ German Research Centre for Geosciences",
    what: "3-hourly Kp index (Matzka et al. 2021, doi:10.5880/Kp.0001, CC BY 4.0).",
    href: "https://kp.gfz-potsdam.de/",
  },
  {
    name: "NMDB – Neutron Monitor Database",
    what: "Ground-level enhancement profiles from Oulu and Dome C; modelled profiles are labelled as such.",
    href: "https://www.nmdb.eu/",
  },
  {
    name: "Shea & Smart GLE list / gle.oulu.fi",
    what: "Ground-level enhancement numbering.",
    href: "https://gle.oulu.fi/",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-foreground/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

const DOWNLOADS = [
  {
    href: "/data/events.json",
    label: "events.json",
    desc: "Full dataset, all fields, nested.",
  },
  {
    href: "/data/events.csv",
    label: "events.csv",
    desc: "Flattened core fields for spreadsheets & pandas.",
  },
  {
    href: "/data/event.schema.json",
    label: "event.schema.json",
    desc: "JSON Schema the dataset is validated against.",
  },
];

export default function AboutPage() {
  const citation = projectCitation();
  const bibtex = projectBibtex();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <NavBar eventCount={EVENTS.length} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
          {/* Mission */}
          <div className="space-y-3">
            <h1 className="heading-display-lg text-3xl text-foreground">
              About &amp; Data
            </h1>
            <p className="text-sm text-foreground/70 leading-relaxed">
              HelioHistory is an open, community-curated catalogue of major space
              weather events from antiquity to the present: geomagnetic indices,
              solar context, terrestrial impacts, and the scientific references
              behind every record. The data are published as machine-readable
              JSON and CSV, validated against a public JSON Schema, so anyone can
              analyse, reuse, and build on them.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground/40 pt-1">
              <span>
                <span className="font-mono text-solar">{EVENTS.length}</span>{" "}
                events catalogued
              </span>
              <span>{formatYear(EARLIEST_YEAR)} – present</span>
              <span>JSON · CSV · JSON Schema</span>
            </div>
          </div>

          {/* Licensing */}
          <Section title="Licensing">
            <p className="text-sm text-foreground/60 leading-relaxed">
              The project is dual-licensed so the data and the software can be
              reused with the right terms for each.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="glass rounded-lg p-4 space-y-1.5">
                <p className="text-sm font-medium text-foreground">Data &amp; content</p>
                <p className="text-xs font-mono text-aurora-green">
                  {PROJECT.dataLicense}
                </p>
                <p className="text-xs text-foreground/50 leading-relaxed">
                  Free to share and adapt, including commercially, provided you
                  give appropriate credit, i.e. cite the dataset.
                </p>
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-solar hover:text-solar-bright transition-colors"
                >
                  Read the licence →
                </a>
              </div>
              <div className="glass rounded-lg p-4 space-y-1.5">
                <p className="text-sm font-medium text-foreground">Software</p>
                <p className="text-xs font-mono text-aurora-green">
                  {PROJECT.codeLicense}
                </p>
                <p className="text-xs text-foreground/50 leading-relaxed">
                  The application code (this website, the data pipeline, and
                  charts) is permissively licensed for any use.
                </p>
                <a
                  href={`${PROJECT.url}/blob/master/LICENSE`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-solar hover:text-solar-bright transition-colors"
                >
                  View LICENSE →
                </a>
              </div>
            </div>
          </Section>

          {/* How to cite */}
          <Section title="How to cite">
            <p className="text-sm text-foreground/60 leading-relaxed">
              If you use HelioHistory data in research, writing, or a product,
              please cite the dataset. Where you rely on a specific event, also
              cite its primary sources; each event lists them, and the per-event
              “Cite” button includes their DOIs.
            </p>

            <div className="glass rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wider text-foreground/40">
                  Citation
                </span>
                <CopyButton value={citation} label="Copy" />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {citation}
              </p>
            </div>

            <div className="glass rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wider text-foreground/40">
                  BibTeX
                </span>
                <CopyButton value={bibtex} label="Copy" />
              </div>
              <pre className="text-xs font-mono text-foreground/70 overflow-x-auto whitespace-pre">
                {bibtex}
              </pre>
            </div>

            <p className="text-xs text-foreground/40">
              A versioned, DOI-archived release (via Zenodo) is planned; once
              available, cite the specific version and DOI.
            </p>
          </Section>

          {/* Downloads */}
          <Section title="Download the data">
            <div className="space-y-2">
              {DOWNLOADS.map((d) => (
                <a
                  key={d.href}
                  href={d.href}
                  download
                  className="glass rounded-lg p-3 flex items-center justify-between gap-4 hover:bg-overlay/5 transition-colors group"
                >
                  <div>
                    <span className="text-sm font-mono text-foreground group-hover:text-solar transition-colors">
                      {d.label}
                    </span>
                    <p className="text-xs text-foreground/40 mt-0.5">{d.desc}</p>
                  </div>
                  <span className="text-xs text-foreground/30 group-hover:text-foreground/60 transition-colors">
                    Download ↓
                  </span>
                </a>
              ))}
            </div>
          </Section>

          {/* Data sources */}
          <Section title="Data sources">
            <p className="text-sm text-foreground/60 leading-relaxed">
              The catalogue compiles published research (each event lists its
              papers); the charts and timeline backdrop draw on these upstream
              datasets, which should be credited alongside HelioHistory when
              reused.
            </p>
            <ul className="space-y-2">
              {DATA_SOURCES.map((d) => (
                <li key={d.name} className="glass rounded-lg p-3 text-xs">
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground/85 hover:text-foreground"
                  >
                    {d.name}
                  </a>
                  <span className="text-foreground/50"> — {d.what}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Contributing */}
          <Section title="Contributing">
            <p className="text-sm text-foreground/60 leading-relaxed">
              HelioHistory is a living archive. Corrections and new events are
              welcome. Each event is a single JSON file validated against the
              schema, and every quantitative claim should cite a source. See the
              contributing guide to propose a change.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${PROJECT.url}/blob/master/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-overlay/10 text-foreground/60 hover:text-foreground/90 hover:bg-overlay/5 transition-colors"
              >
                Contributing guide
              </a>
              <a
                href={PROJECT.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-overlay/10 text-foreground/60 hover:text-foreground/90 hover:bg-overlay/5 transition-colors"
              >
                GitHub repository
              </a>
            </div>
          </Section>

          {/* Credit */}
          <Section title="Credits">
            <p className="text-sm text-foreground/60 leading-relaxed">
              Created and maintained by{" "}
              <a
                href="https://matt.neowatt.co.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-solar hover:text-solar-bright transition-colors"
              >
                Matt
              </a>
              , with thanks to the researchers and observatories whose work the
              catalogue compiles.
            </p>
          </Section>

          <Footer />
        </div>
      </div>
    </div>
  );
}
