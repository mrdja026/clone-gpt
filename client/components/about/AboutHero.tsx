import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Github, Linkedin } from "lucide-react";

export default function AboutHero() {
  return (
    <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-muted">
      <CardContent className="p-6 md:p-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Mrdjan Stajic
          </h1>
          <p className="mt-3 text-muted-foreground text-sm md:text-base">
            10+ years of experience — Full‑stack engineer building stuff.
          </p>
          <div className="mt-5 flex gap-3">
            <Button asChild variant="outline" size="sm">
              <a href="https://github.com/" target="_blank" rel="noreferrer">
                <Github className="h-4 w-4 mr-2" /> GitHub
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noreferrer"
              >
                <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
