import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Provider {
  name: string;
  description: string;
  to: string;
}

interface ProvidersPanelProps {
  providers: Provider[];
}

export default function ProvidersPanel({ providers }: ProvidersPanelProps) {
  return (
    <section>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-lg font-semibold mb-4">Connect to provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider) => (
            <div key={provider.name} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {provider.description}
                  </div>
                </div>
                <Button asChild>
                  <Link to={provider.to}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
