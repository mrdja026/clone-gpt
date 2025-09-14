import { ReactNode } from "react";

export function AppHeader({ right, subtitle }: { right?: ReactNode; subtitle?: string }) {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-primary" />
          <div>
            <div className="font-semibold">JiraGPT</div>
            <div className="text-xs text-muted-foreground">
              {subtitle ?? "Deterministic prompts + branching chats"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export default AppHeader;

