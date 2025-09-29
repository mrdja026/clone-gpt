import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, SunMedium } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark"),
  );

  const setTheme = (enabled: boolean) => {
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(!dark)}
    >
      {dark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export default ThemeToggle;

