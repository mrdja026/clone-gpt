import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

interface TabInfo {
  id: string;
  label: React.ReactNode;
  closable?: boolean;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeId: string;
  onChange: (id: string) => void;
  onClose?: (id: string) => void;
}

export function TabBar({ tabs, activeId, onChange, onClose }: TabBarProps) {
  return (
    <Tabs value={activeId} onValueChange={onChange} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="relative pr-7">
            {t.label}
            {onClose && t.closable !== false && (
              <button
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded hover:bg-secondary p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
