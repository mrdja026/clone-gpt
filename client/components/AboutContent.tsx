import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import React from "react";

export function AboutContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-10", compact && "space-y-6")}>
      <section className={cn("text-center max-w-3xl mx-auto")}>
        <h1 className={cn(
          "font-semibold tracking-tight",
          compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl",
        )}>
          Ship faster with deterministic prompts + branching chats
        </h1>
        <p className="mt-4 text-muted-foreground">
          A modern, minimal workspace powered by MCP integrations and a focused chat UI. Built for Product and Delivery teams who value clarity and speed.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/chat" className="inline-flex items-center gap-2">
              Open Chat <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/about">Full About</Link>
          </Button>
        </div>
      </section>

      <section
        className={cn(
          "max-w-4xl mx-auto",
          "rounded-3xl border bg-card/60 backdrop-blur ring-1 ring-border",
          compact ? "p-5 grid gap-5" : "p-6 md:p-10 grid gap-6",
        )}
      >
        <div>
          <h2 className={cn("font-semibold", compact ? "text-lg" : "text-xl md:text-2xl")}>Developer</h2>
          <p className="text-muted-foreground mt-1">
            Minimalist, pragmatic, outcome‑driven. Focused on DX and maintainability.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div>
              <div className="text-sm uppercase tracking-wide text-muted-foreground">Summary</div>
              <p className="mt-1">
                Full‑stack engineer with experience in product delivery, AI tooling, and integrations. Comfortable leading from prototype to production with type‑safe, testable stacks.
              </p>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wide text-muted-foreground">Core Skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["React", "TypeScript", "Node/Express", "MCP Integrations", "Tailwind", "Vite"].map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs bg-background"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm uppercase tracking-wide text-muted-foreground">Contact</div>
              <div className="mt-2 grid gap-2 text-sm">
                <a className="hover:underline" href="#">Website</a>
                <a className="hover:underline" href="#">GitHub</a>
                <a className="hover:underline" href="#">LinkedIn</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutContent;

