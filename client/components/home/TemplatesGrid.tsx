import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import type { QueryTemplate } from "@/components/chat/types";

export function TemplatesGrid({
  queries,
  onSelect,
}: {
  queries: QueryTemplate[];
  onSelect: (template: string) => void;
}) {
  return (
    <div className="space-y-6 pt-8">
      <h2 className="text-2xl font-semibold text-foreground">
        Popular Templates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {queries.map((query) => (
          <Card
            key={query.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-primary/50"
            onClick={() => onSelect(query.template)}
          >
            <CardContent className="p-6">
              <CardTitle className="text-lg mb-2 text-left">
                {query.label}
              </CardTitle>
              <CardDescription className="text-left text-sm">
                {query.template}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
