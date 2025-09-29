import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QueryTemplate } from "@/components/chat/types";

// Extract entity ID from query label (everything after the last dash)
function extractEntityId(label: string): string | null {
  const parts = label.split(" - ");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return null;
}

// Extract category emoji and name from label
function extractCategory(label: string): { emoji: string; name: string } {
  const emojiMatch = label.match(/^([🎯🏗️🏃‍♂️🔍⚡🚀]+)\s+(.+)/);
  if (emojiMatch) {
    return { emoji: emojiMatch[1], name: emojiMatch[2].split(" - ")[0] };
  }
  return { emoji: "📋", name: label.split(" - ")[0] };
}

// Group queries by category
function groupQueriesByCategory(queries: QueryTemplate[]) {
  const groups: Record<string, QueryTemplate[]> = {};

  queries.forEach((query) => {
    const { emoji } = extractCategory(query.label);
    let categoryKey = "Other";

    if (emoji.includes("🎯")) categoryKey = "JIRA Actions";
    else if (emoji.includes("🏗️")) categoryKey = "Project Management";
    else if (emoji.includes("🏃‍♂️")) categoryKey = "Agile & Sprint";
    else if (emoji.includes("🔍")) categoryKey = "Web Search";
    else if (emoji.includes("⚡")) categoryKey = "Quick Actions";
    else if (emoji.includes("🚀")) categoryKey = "Development";

    if (!groups[categoryKey]) groups[categoryKey] = [];
    groups[categoryKey].push(query);
  });

  return groups;
}

export function TemplatesGrid({
  queries,
  onSelect,
}: {
  queries: QueryTemplate[];
  onSelect: (template: string) => void;
}) {
  const groupedQueries = groupQueriesByCategory(queries);
  const categoryOrder = [
    "JIRA Actions",
    "Project Management",
    "Agile & Sprint",
    "Development",
    "Web Search",
    "Quick Actions",
  ];

  return (
    <div className="space-y-8 pt-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Query Templates</h2>
        <p className="text-muted-foreground text-lg">
          Explore our three-lane analysis system with these curated queries
        </p>
      </div>

      {categoryOrder.map((categoryName) => {
        const categoryQueries = groupedQueries[categoryName];
        if (!categoryQueries || categoryQueries.length === 0) return null;

        return (
          <div key={categoryName} className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-foreground">
                {categoryName}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {categoryQueries.length} templates
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {categoryQueries.map((query) => {
                const { emoji, name } = extractCategory(query.label);
                const entityId = extractEntityId(query.label);

                return (
                  <Card
                    key={query.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/50 group"
                    onClick={() => onSelect(query.template)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-2xl">{emoji}</div>
                        {entityId && (
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {entityId}
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-base mb-2 text-left group-hover:text-primary transition-colors">
                        {name}
                      </CardTitle>

                      <CardDescription
                        className="text-left text-sm overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: "1.4em",
                          maxHeight: "2.8em",
                        }}
                      >
                        {query.template}
                      </CardDescription>

                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Click to apply & edit</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="text-center pt-6 border-t border-border/20">
        <p className="text-sm text-muted-foreground">
          Each query demonstrates our <strong>Lane A</strong> (Intent
          Detection), <strong>Lane B</strong> (Data Acquisition), and{" "}
          <strong>Lane C</strong> (Analysis) system
        </p>
      </div>
    </div>
  );
}
