import axios from "axios";

export function upstashEnabled(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

function getBase(): string {
  return (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
}

function getAuth() {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return { Authorization: `Bearer ${token}` } as Record<string, string>;
}

export async function upstashSet(key: string, value: string): Promise<boolean> {
  if (!upstashEnabled()) return false;
  const url = `${getBase()}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
  try {
    const res = await axios.post(url, undefined, { headers: getAuth(), timeout: 5000 });
    return !!res?.data?.result;
  } catch (e) {
    // Log and continue without failing app
    console.warn("[Upstash] set failed:", (e as any)?.message || e);
    return false;
  }
}

export async function publishHealthSnapshot(key: string, payload: any): Promise<boolean> {
  try {
    return await upstashSet(key, JSON.stringify(payload));
  } catch {
    return false;
  }
}

