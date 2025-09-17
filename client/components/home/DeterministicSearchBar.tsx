import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeterministicSearchBar({
  onApply,
  placeholder = "Type to search deterministic queries...",
  value: externalValue,
  onChange,
}: {
  onApply: (query: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;

  const setValue = (newValue: string) => {
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  useEffect(() => {
    if (isControlled && externalValue !== undefined) {
      // Focus the input when external value changes
      const input = document.querySelector(
        'input[placeholder*="deterministic"]',
      ) as HTMLInputElement;
      if (input) {
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
      }
    }
  }, [externalValue, isControlled]);
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-16 text-xl rounded-3xl border-2 shadow-xl px-6"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onApply(value.trim());
          }}
        />
        <Button
          onClick={() => value.trim() && onApply(value.trim())}
          disabled={!value.trim()}
          size="lg"
          className="h-16 px-10 text-xl font-semibold rounded-3xl shadow-xl min-w-[120px]"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
