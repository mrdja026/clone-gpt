import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import type { QueryTemplate } from "@/components/chat/types";
import { cn } from "@/lib/utils";

interface QuerySearchProps {
  queries: QueryTemplate[];
  onSelect: (template: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuerySearch({
  queries,
  onSelect,
  placeholder = "Search queries (Cmd/Ctrl+K)...",
  className,
}: QuerySearchProps) {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return queries;
    return queries.filter(
      (q) =>
        q.label.toLowerCase().includes(term) ||
        q.template.toLowerCase().includes(term),
    );
  }, [queries, value]);

  // Cmd/Ctrl+K to focus and open search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase?.();
      const isK = key === "k" || e.code === "KeyK";
      const isSlash = key === "/" || e.code === "Slash";
      if ((e.ctrlKey || e.metaKey) && (isK || isSlash)) {
        e.preventDefault();
        setOpen(true);
        // Ensure focus after any React state update cycle
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <Command className="rounded-3xl border bg-card/70 backdrop-blur-md ring-1 ring-border/60 shadow-md p-3 md:p-4">
        <CommandInput
          ref={inputRef}
          value={value}
          onValueChange={setValue}
          placeholder={placeholder}
          className="h-16 text-lg rounded-2xl"
        />
        <CommandList className={cn(!open && "hidden", "max-h-[420px]")}>
          <CommandEmpty>No matching queries.</CommandEmpty>
          <CommandGroup heading="Queries">
            {items.map((q) => (
              <CommandItem
                key={q.id}
                value={q.label}
                onSelect={() => {
                  setOpen(false);
                  onSelect(q.template);
                }}
                className="flex flex-col items-start gap-1 py-2"
              >
                <span className="text-sm font-medium">{q.label}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {q.template}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
