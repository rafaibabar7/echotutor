// src/components/pages/GuidelinesPage.tsx
"use client";

import { guidelines } from "@/lib/guidelines-data";
import { ExternalLink } from "lucide-react";

const researchCards = [
  { title: "MV Assessment", desc: "Algorithmic intraoperative MV evaluation" },
  { title: "3D Tricuspid", desc: "Tricuspid annular geometry via 3D TEE" },
  { title: "AI in Echo", desc: "LLM performance on echo board questions" },
];

const GuidelinesPage = () => {
  return (
    <div className="h-full overflow-y-auto px-4 lg:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {guidelines.map((g, i) => (
          <div
            key={i}
            className="echo-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="echo-badge-blue">{g.organization}</span>
                <span className="text-sm text-muted-foreground">{g.year}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{g.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {g.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <a
              href={`/guidelines/${g.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 whitespace-nowrap"
            >
              Open PDF <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}

        {/* Research Contributions */}
        <div className="echo-card p-6 mt-8">
          <h3 className="text-lg font-bold text-foreground mb-1">
            Research Contributions
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Research integrated into EchoTutor
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {researchCards.map((r) => (
              <div
                key={r.title}
                className="rounded-xl border border-border p-4 bg-muted/30"
              >
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  {r.title}
                </h4>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesPage;
