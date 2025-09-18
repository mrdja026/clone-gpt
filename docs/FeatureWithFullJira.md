- single **GET /rest/api/3/issue/{key}** call
- `expand=names` so we can resolve site-specific custom fields (Story Points, Sprint, Epic Link) by their display names
- parses **issue links** (inward/outward), **Sprints**, **Epic** (via **Parent** or legacy **Epic Link**), and **Time Tracking** fields with safe fallbacks

---

### One-shot Jira fetch (Sprint, Epic, time tracking included)

```js
// jiraOneShot.js
const axios = require("axios");

/** ---- auth helpers ---- */
function makeAuthHeader({ email, apiToken, bearer }) {
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  if (email && apiToken) {
    const b64 = Buffer.from(`${email}:${apiToken}`).toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  throw new Error("Provide either { bearer } or { email, apiToken }");
}

/** ---- minimal ADF -> plain text ---- */
function adfToText(adf) {
  if (!adf || typeof adf !== "object") return "";
  const walk = (n) => {
    if (!n) return "";
    switch (n.type) {
      case "text":
        return n.text || "";
      case "hardBreak":
        return "\n";
      case "paragraph":
        return (n.content || []).map(walk).join("") + "\n";
      default:
        return (n.content || []).map(walk).join("");
    }
  };
  return walk(adf).trim();
}

/** ---- utilities to find site-specific custom field ids by display name ---- */
function findFieldIdByName(names = {}, regexes = []) {
  for (const [fieldId, display] of Object.entries(names)) {
    if (regexes.some((re) => re.test(display))) return fieldId; // e.g. "customfield_10016"
  }
  return null;
}

/** Normalize linked issues into a clean list */
function mapIssueLinks(links = []) {
  const out = [];
  for (const link of links) {
    const typeName = link?.type?.name || null;
    if (link.outwardIssue) {
      out.push({
        linkId: link.id || null,
        typeName,
        direction: "outward",
        key: link.outwardIssue.key || null,
        id: link.outwardIssue.id || null,
      });
    }
    if (link.inwardIssue) {
      out.push({
        linkId: link.id || null,
        typeName,
        direction: "inward",
        key: link.inwardIssue.key || null,
        id: link.inwardIssue.id || null,
      });
    }
  }
  return out;
}

/**
 * One-shot "full ticket" fetch.
 * Includes: summary, status, issueType, priority, storyPoints, description (ADF+text),
 * parent, subtasks, labels, components, fixVersions, assignee, reporter,
 * linked issues (ids/keys), Sprints, Epic (via parent or Epic Link), and time tracking.
 */
async function fetchJiraTicketFull({ baseUrl, issueKey, auth }) {
  const headers = { Accept: "application/json", ...makeAuthHeader(auth) };
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;

  // One-shot: ask for everything navigable + field names map
  // (fields=*all is accepted in Cloud; expand=names lets us map customfield ids to display names)
  const { data } = await axios.get(url, {
    headers,
    params: { fields: "*all", expand: "names" },
  });

  const f = data.fields || {};
  const names = data.names || {};

  // Resolve site-specific custom fields
  const storyPointsFieldId = findFieldIdByName(names, [
    /story\s*points?/i,
    /story\s*point\s*estimate/i,
  ]);
  const sprintFieldId = findFieldIdByName(names, [/^sprint$/i]);
  const epicLinkFieldId = findFieldIdByName(names, [/^epic\s*link$/i]);

  // Story Points
  let storyPoints = null;
  if (
    storyPointsFieldId &&
    Object.prototype.hasOwnProperty.call(f, storyPointsFieldId)
  ) {
    const raw = f[storyPointsFieldId];
    storyPoints = typeof raw === "number" ? raw : raw ? Number(raw) : null;
  }

  // Description (ADF -> text)
  const descriptionADF = f.description || null;
  const descriptionText = descriptionADF ? adfToText(descriptionADF) : null;

  // Linked issues
  const relatedIssues = mapIssueLinks(f.issuelinks || []);

  // Sprints (custom field array of sprint objects)
  let sprints = [];
  if (sprintFieldId && Array.isArray(f[sprintFieldId])) {
    sprints = (f[sprintFieldId] || []).map((sp) => ({
      id: sp?.id ?? null,
      name: sp?.name ?? null,
      state: sp?.state ?? null, // 'future' | 'active' | 'closed'
      boardId: sp?.originBoardId ?? sp?.boardId ?? null,
      startDate: sp?.startDate ?? null,
      endDate: sp?.endDate ?? null,
      completeDate: sp?.completeDate ?? null,
      goal: sp?.goal ?? null,
    }));
  }
  const activeSprint = sprints.find((sp) => sp.state === "active") || null;

  // Epic (newer "parent" concept; else legacy Epic Link custom field)
  let epicKey = null;
  let epicSource = null;
  // Prefer parent if it's an Epic
  const parentType =
    f.parent?.fields?.issuetype?.name || f.parent?.issuetype?.name;
  if (f.parent?.key && /epic/i.test(parentType || "")) {
    epicKey = f.parent.key;
    epicSource = "parent";
  } else if (epicLinkFieldId && f[epicLinkFieldId]) {
    const val = f[epicLinkFieldId];
    epicKey = typeof val === "string" ? val : val?.key || null;
    epicSource = "epicLink";
  }

  // Time tracking (pretty strings + numeric seconds + aggregates)
  const timeTracking = {
    originalEstimate: f.timetracking?.originalEstimate ?? null,
    remainingEstimate: f.timetracking?.remainingEstimate ?? null,
    timeSpent: f.timetracking?.timeSpent ?? null,
    originalEstimateSeconds: f.timeoriginalestimate ?? null,
    remainingEstimateSeconds: f.timeestimate ?? null,
    timeSpentSeconds: f.timespent ?? null,
    aggregate: {
      originalEstimateSeconds: f.aggregatetimeoriginalestimate ?? null,
      remainingEstimateSeconds: f.aggregatetimeestimate ?? null,
      timeSpentSeconds: f.aggregatetimespent ?? null,
    },
  };

  return {
    key: data.key,
    id: data.id,
    self: data.self,

    summary: f.summary ?? null,
    status: f.status?.name ?? null,
    issueType: f.issuetype?.name ?? null,
    priority: f.priority?.name ?? null,

    storyPointsFieldId,
    storyPoints,

    description: { adf: descriptionADF, text: descriptionText },

    parentKey: f.parent?.key ?? null,
    subtasks: (f.subtasks || []).map((st) => ({
      key: st.key,
      id: st.id,
      issueType: st.fields?.issuetype?.name,
    })),

    labels: f.labels || [],
    components: (f.components || []).map((c) => c.name),
    fixVersions: (f.fixVersions || []).map((v) => v.name),

    assignee: f.assignee?.displayName ?? null,
    reporter: f.reporter?.displayName ?? null,

    // Links & relationships
    relatedIssues,

    // Sprint / Epic
    sprintFieldId,
    sprints,
    activeSprint,
    epic: epicKey ? { key: epicKey, source: epicSource } : null,

    // Time tracking
    timeTracking,

    // Keep raw for optional debugging in MCP
    raw: data,
  };
}

module.exports = { fetchJiraTicketFull };
```

---

### Why this works (and what to know)

- **Get Issue (v3) returns the issue’s fields**; you can pass `fields=*all` to receive everything and `expand=names` to resolve custom field IDs → display names. This lets us discover **Story Points**, **Sprint**, **Epic Link** IDs at runtime (they vary by site). ([The Atlassian Developer Community][1])
- **Linked issues** are exposed under `fields.issuelinks` with `inwardIssue`/`outwardIssue` objects; we map those to `{key,id,type,direction}`. Atlassian’s model explains that structure. ([Atlassian][2])
- **Sprint** is a custom field in Jira Software. Its value is an array of Sprint objects (id, name, state, start/end dates, originBoardId). Atlassian deprecated the old `toString` but the JSON object remains, which we parse. If you don’t know the field id, find it via `names` or the admin UI; Atlassian KB shows the “Sprint custom field id” approach. ([Atlassian Developer][3])
- **Epic**: Atlassian is moving company-managed projects from **Epic Link** to the unified **parent** concept (already in team-managed). We first check `parent` for an Epic; if absent, fall back to the legacy **Epic Link** custom field. ([Atlassian Support][4])
- **Time tracking**: Jira exposes both pretty strings via `fields.timetracking` and raw seconds via `timeoriginalestimate`, `timeestimate`, `timespent` (plus aggregate variants). For detailed logs, the worklog APIs exist, but this one-shot fetch gives summary time tracking. ([Atlassian Developer][5])

---

### Drop-in MCP handler (sketch)

```js
// inside your MCP server:
const { fetchJiraTicketFull } = require("./jiraOneShot");

async function handleFetchJiraTicket({ ticketKey }) {
  const data = await fetchJiraTicketFull({
    baseUrl: process.env.JIRA_BASE, // e.g. https://your-domain.atlassian.net
    issueKey: ticketKey, // e.g. "SCRUM-8"
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN }, // or { bearer: ... }
  });
  return data;
}
```

If you want, I can also add optional **worklogs** (single extra query to `/rest/api/3/issue/{key}/worklog`) or compute a tidy **“active sprint only”** view from the `sprints` array.

[1]: https://community.developer.atlassian.com/t/jira-cloud-api-get-all-info-from-issues-jql/39051?utm_source=chatgpt.com "JIRA Cloud API get all info from issues JQL"
[2]: https://www.atlassian.com/blog/developer/jira-issue-linking-model?utm_source=chatgpt.com "Jira Issue Linking Model - Work Life by Atlassian"
[3]: https://developer.atlassian.com/cloud/jira/platform/deprecation-notice-tostring-representation-of-sprints-in-get-issue-response/?utm_source=chatgpt.com "toString representation of sprints in Get issue response"
[4]: https://support.atlassian.com/jira-software-cloud/docs/upcoming-changes-epic-link-replaced-with-parent/?utm_source=chatgpt.com "Upcoming changes: 'epic-link' replaced with 'parent' | Jira Cloud"
[5]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-time-tracking/?utm_source=chatgpt.com "The Jira Cloud platform REST API"
