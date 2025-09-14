import { useEffect, useState } from "react";

type Healthz = {
  status: string;
  port: string;
  host: string;
  env: Record<string, string>;
  ollamaProxy: {
    active: boolean;
    baseUrl: string;
    checkedModel: string;
    targetHost?: string | null;
    note?: string | null;
  };
  time: string;
};

export default function Diagnostics() {
  const [data, setData] = useState<Healthz | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/healthz");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Healthz;
        setData(json);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Diagnostics</h1>
      {error && (
        <div className="text-red-600 mb-4">Failed to load: {error}</div>
      )}
      {!data && !error && <div>Loading…</div>}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4 bg-card">
            <div className="font-medium mb-2">Server</div>
            <div className="text-sm">Status: {data.status}</div>
            <div className="text-sm">Host: {data.host}</div>
            <div className="text-sm">Port: {data.port}</div>
            <div className="text-xs text-muted-foreground mt-2">{data.time}</div>
          </div>
          <div className="rounded-xl border p-4 bg-card">
            <div className="font-medium mb-2">Ollama Proxy</div>
            <div className="text-sm">Active: {String(data.ollamaProxy.active)}</div>
            <div className="text-sm break-all">Base URL: {data.ollamaProxy.baseUrl}</div>
            <div className="text-sm">Model: {data.ollamaProxy.checkedModel}</div>
            {data.ollamaProxy.targetHost && (
              <div className="text-sm">Target Host: {data.ollamaProxy.targetHost}</div>
            )}
            {data.ollamaProxy.note && (
              <div className="text-sm">Note: {data.ollamaProxy.note}</div>
            )}
          </div>
          <div className="rounded-xl border p-4 bg-card md:col-span-2">
            <div className="font-medium mb-2">Environment</div>
            <div className="text-xs grid md:grid-cols-3 gap-2">
              {Object.entries(data.env).map(([k, v]) => (
                <div key={k} className="rounded border p-2 bg-background">
                  <div className="font-mono text-[11px] text-muted-foreground">{k}</div>
                  <div className="font-mono text-[12px] break-all">{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

