export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function summarizeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}

export const STORAGE_KEY = "jira-gpt-conversations";
export const STORAGE_ACTIVE = "jira-gpt-active";
