import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AboutContent from "@/components/AboutContent";
import React from "react";

export default function AboutDialog({
  trigger,
  compact = true,
}: {
  trigger: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>About JiraGPT</DialogTitle>
        </DialogHeader>
        <AboutContent compact={compact} />
      </DialogContent>
    </Dialog>
  );
}

