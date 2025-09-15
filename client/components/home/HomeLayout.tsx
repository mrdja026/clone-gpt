import { cn } from "@/lib/utils";

export function HomeLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[calc(100vh-4rem)]", className)}>
      <div className="container mx-auto px-4 py-16 max-w-4xl">{children}</div>
    </div>
  );
}
