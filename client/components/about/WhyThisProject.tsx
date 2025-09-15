import { Card, CardContent } from "@/components/ui/card";

export default function WhyThisProject() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-semibold">Why this project</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Deterministic prompt library with one-click placeholders</li>
          <li>
            Branchable conversations grouped as tabs for rapid exploration
          </li>
          <li>
            Jira-inspired theming with dark and complementary light palettes
          </li>
          <li>Local persistence: responsive, accessible UI</li>
        </ul>
      </CardContent>
    </Card>
  );
}
