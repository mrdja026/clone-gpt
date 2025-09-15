import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Experience } from "@/content/experience";

export default function ExperienceCard({
  item,
  className,
}: {
  item: Experience;
  className?: string;
}) {
  const isFeatured = Boolean(item.featured);
  return (
    <Card className={cn("rounded-xl", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{item.company}</div>
            <div className="text-xs text-muted-foreground">{item.role}</div>
          </div>
          {item.source && (
            <div className="text-xs text-muted-foreground select-none">
              {item.source}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
          <span>
            {item.dateStart} — {item.dateEnd}
          </span>
        </div>
        {isFeatured && item.bullets?.length ? (
          <ul className="mt-4 list-disc pl-5 space-y-1 text-sm">
            {item.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
