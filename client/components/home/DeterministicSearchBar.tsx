import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeterministicSearchBarProps = {
  onApply: (query: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  // New optional props (backward-compatible)
  suggestions?: string[];
  onSelect?: (value: string) => void;
  autoExecuteOnSelect?: boolean;
  openOnFocus?: boolean;
};

export function DeterministicSearchBar({
  onApply,
  placeholder = "Type to search deterministic queries...",
  value: externalValue,
  onChange,
  suggestions,
  onSelect,
  autoExecuteOnSelect = false,
  openOnFocus = true,
}: DeterministicSearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = "deterministic-suggestions";

  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;

  const setValue = (newValue: string) => {
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  // Compute filtered suggestions
  const filtered = useMemo(() => {
    const all = suggestions ?? [];
    const term = value?.trim().toLowerCase() ?? "";
    if (!term) return all;
    return all.filter((s) => s.toLowerCase().includes(term));
  }, [suggestions, value]);

  useEffect(() => {
    if (isControlled && externalValue !== undefined) {
      // Focus the input when external value changes
      const input = inputRef.current;
      if (input) {
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
      }
    }
  }, [externalValue, isControlled]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = inputRef.current?.closest(
        '[data-role="deterministic-search"]',
      );
      if (wrapper && !wrapper.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selectItem = (text: string) => {
    onSelect?.(text);
    setValue(text);
    if (autoExecuteOnSelect) {
      onApply(text);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (open && filtered.length > 0) {
        e.preventDefault();
        selectItem(
          filtered[Math.max(0, Math.min(highlight, filtered.length - 1))],
        );
        return;
      }
      if (value?.trim()) onApply(value.trim());
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if ((suggestions?.length ?? 0) > 0) setOpen(true);
      return;
    }
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) =>
          filtered.length === 0 ? 0 : (h + 1) % filtered.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) =>
          filtered.length === 0
            ? 0
            : (h - 1 + filtered.length) % filtered.length,
        );
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
  };

  return (
    <div
      className="max-w-2xl mx-auto space-y-4"
      data-role="deterministic-search"
    >
      <div className="flex gap-4 relative">
        <Input
          ref={inputRef}
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            open && filtered.length > 0
              ? `${listboxId}-option-${highlight}`
              : undefined
          }
          role="combobox"
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            if (openOnFocus && (suggestions?.length ?? 0) > 0) {
              setOpen(true);
            }
          }}
          onChange={(e) => {
            setValue(e.target.value);
            if ((suggestions?.length ?? 0) > 0) setOpen(true);
            setHighlight(0);
          }}
          className="h-16 text-xl rounded-3xl border-2 shadow-xl px-6"
          onKeyDown={onKeyDown}
        />
        <Button
          onClick={() => value?.trim() && onApply(value.trim())}
          disabled={!value?.trim()}
          size="lg"
          className="h-16 px-10 text-xl font-semibold rounded-3xl shadow-xl min-w-[120px]"
        >
          Apply
        </Button>

        {open && (suggestions?.length ?? 0) > 0 && (
          <div
            className="absolute left-0 right-0 top-[72px] z-20 rounded-2xl border bg-popover shadow-xl ring-1 ring-border max-h-80 overflow-auto"
            role="listbox"
            id={listboxId}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No matches
              </div>
            ) : (
              filtered.map((s, idx) => (
                <button
                  key={`${s}-${idx}`}
                  id={`${listboxId}-option-${idx}`}
                  role="option"
                  aria-selected={idx === highlight}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                    idx === highlight ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => selectItem(s)}
                >
                  {s}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
