**Project → Epics → Issues (Story/Task/Bug) → Subtasks.**

Below is a _single-callable_ helper that builds exactly that tree with safe fallbacks for **Epic link vs parent**, handles **pagination**, and returns a clean structure you can feed to your MCP.

I’m using **JQL via `/rest/api/3/search`** (portable to both company-managed and team-managed). I rely on `expand=names` to discover site-specific custom fields and on the recent **Parent** unification (so `parent = EPIC-123` works where Atlassian has rolled it out); if that yields nothing, I fall back to `Epic Link` by custom field id (e.g., `cf[10014]`). ([Atlassian Developer Docs][1])

> Note: when you fetch a parent with `subtasks` inline, Jira returns only a tiny subset of subtask fields; to get full subtask details we run a **separate JQL** for the subtasks. ([community.atlassian.com][2])

---

### Drop-in: build a 3-level project tree

```js
// jiraProjectTree.js
const axios = require("axios");

/** ---------- Auth header (Bearer OR Basic) ---------- */
function makeAuthHeader({ email, apiToken, bearer }) {
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  if (email && apiToken) {
    const b64 = Buffer.from(`${email}:${apiToken}`).toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  throw new Error("Provide either { bearer } or { email, apiToken }");
}

/** ---------- Field-name helpers ---------- */
function findFieldIdByDisplay(names = {}, regexes = []) {
  for (const [fieldId, display] of Object.entries(names)) {
    if (regexes.some((re) => re.test(display))) return fieldId; // e.g. "customfield_10014"
  }
  return null;
}
const idNum = (customfield) => (customfield || "").replace(/^customfield_/, "");

/** ---------- JQL search with pagination ---------- */
async function jqlSearchPaged({
  baseUrl,
  headers,
  jql,
  fields = [],
  expandNames = false,
  pageSize = 100,
}) {
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/search`;
  const issues = [];
  let startAt = 0;
  let names = null;

  while (true) {
    const { data } = await axios.get(url, {
      headers,
      params: {
        jql,
        startAt,
        maxResults: pageSize,
        fields: fields.length ? fields.join(",") : "*all",
        ...(expandNames ? { expand: "names" } : {}),
      },
    });
    if (expandNames && data.names && !names) names = data.names;
    issues.push(...(data.issues || []));
    if (startAt + (data.issues?.length || 0) >= (data.total || 0)) break;
    startAt += data.issues.length || 0;
    if (!data.issues?.length) break;
  }

  return { issues, names };
}

/** ---------- Normalize a subset of fields for nodes ---------- */
function normIssue(issue, { storyPointsFieldId, sprintFieldId } = {}) {
  const f = issue.fields || {};
  const sp =
    storyPointsFieldId && f.hasOwnProperty(storyPointsFieldId)
      ? f[storyPointsFieldId]
      : null;
  const sprint =
    sprintFieldId && f.hasOwnProperty(sprintFieldId) ? f[sprintFieldId] : null;

  return {
    id: issue.id,
    key: issue.key,
    summary: f.summary || null,
    status: f.status?.name || null,
    issuetype: f.issuetype?.name || null,
    priority: f.priority?.name || null,
    assignee: f.assignee?.displayName || null,
    reporter: f.reporter?.displayName || null,
    storyPoints: typeof sp === "number" ? sp : sp ? Number(sp) : null,
    sprint: sprint || null,
    timeTracking: {
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
    },
  };
}

/** ---------- Build 3-level tree: Project -> Epics -> Issues -> Subtasks ---------- */
async function fetchProjectTree3Levels({
  baseUrl,
  auth, // { email, apiToken } or { bearer }
  projectKeyOrId, // e.g. "WEB" or 10010
  pageSize = 100,
}) {
  const headers = { Accept: "application/json", ...makeAuthHeader(auth) };

  // 0) Discover Story Points + Sprint IDs once via expand=names
  //    (We can piggyback on the epics query to get `names`.)
  const baseFields = [
    "summary",
    "status",
    "issuetype",
    "priority",
    "assignee",
    "reporter",
    "timetracking",
    "timeoriginalestimate",
    "timeestimate",
    "timespent",
    "aggregatetimeoriginalestimate",
    "aggregatetimeestimate",
    "aggregatetimespent",
    "subtasks",
    "parent",
  ];

  // 1) Get all Epics in the project
  const epicsJql = `project = "${projectKeyOrId}" AND issuetype = Epic ORDER BY rank`;
  const { issues: epicIssues, names } = await jqlSearchPaged({
    baseUrl,
    headers,
    jql: epicsJql,
    fields: baseFields,
    expandNames: true,
    pageSize,
  });

  // Map field ids
  const storyPointsFieldId = findFieldIdByDisplay(names, [
    /story\s*points?/i,
    /story\s*point\s*estimate/i,
  ]);
  const sprintFieldId = findFieldIdByDisplay(names, [/^sprint$/i]);

  // Normalize epics
  const epics = epicIssues.map((e) =>
    normIssue(e, { storyPointsFieldId, sprintFieldId }),
  );
  const epicKeys = epics.map((e) => e.key);
  const epicKeySet = new Set(epicKeys);

  // 2) Get all direct children of the epics (stories/tasks/bugs)
  // Preferred (new model): parent in (EPIC-1, EPIC-2, ...)
  // Fallback (old model):  cf[<EpicLinkId>] in (...)
  let childrenJql = "";
  if (epicKeys.length) {
    const chunks = (arr, n = 50) =>
      arr.reduce((a, _, i) => (i % n ? a : [...a, arr.slice(i, i + n)]), []);
    const epicKeyChunks = chunks(epicKeys, 50);

    // Try parent-in (requires rollout of Parent unification)
    const parentClauses = epicKeyChunks.map(
      (ks) => `parent in (${ks.map((k) => `"${k}"`).join(",")})`,
    );
    childrenJql = `project = "${projectKeyOrId}" AND issuetype in (Story, Task, Bug, "Change Request", "Service Request", "Incident") AND (${parentClauses.join(" OR ")})`;
    let { issues: children } = await jqlSearchPaged({
      baseUrl,
      headers,
      jql: childrenJql,
      fields: baseFields.concat(storyPointsFieldId || [], sprintFieldId || []),
      pageSize,
    });

    // Fallback if nothing came back (older company-managed projects still using Epic Link)
    if (!children.length) {
      const epicLinkFieldId = findFieldIdByDisplay(names, [/^epic\s*link$/i]);
      if (epicLinkFieldId) {
        const cf = idNum(epicLinkFieldId); // "10014"
        const epicLinkClauses = epicKeyChunks.map(
          (ks) => `cf[${cf}] in (${ks.map((k) => `"${k}"`).join(",")})`,
        );
        const jql2 = `project = "${projectKeyOrId}" AND (${epicLinkClauses.join(" OR ")})`;
        const resp2 = await jqlSearchPaged({
          baseUrl,
          headers,
          jql: jql2,
          fields: baseFields.concat(
            storyPointsFieldId || [],
            sprintFieldId || [],
          ),
          pageSize,
        });
        children = resp2.issues;
      }

      // if still empty, we leave children empty
    }

    var childIssues = children.map((i) =>
      normIssue(i, { storyPointsFieldId, sprintFieldId }),
    );
  } else {
    var childIssues = [];
  }

  const childrenByEpic = new Map(epicKeys.map((k) => [k, []]));
  // Attach children to their epic (by parent or Epic Link)
  for (const i of childIssues) {
    const f = i.rawFields || null; // not set; we’ll infer from search result objects instead
  }

  // We need parent mapping; re-run minimal search to bring back parent + epic link ids on the child set
  if (childIssues.length) {
    const childKeys = childIssues.map((i) => i.key);
    const chunks = (arr, n = 50) =>
      arr.reduce(
        (a, _, ix) => (ix % n ? a : [...a, arr.slice(ix, ix + n)]),
        [],
      );
    const childKeyChunks = chunks(childKeys, 100);
    const childrenWithParents = [];
    for (const group of childKeyChunks) {
      const { issues } = await jqlSearchPaged({
        baseUrl,
        headers,
        jql: `key in (${group.map((k) => `"${k}"`).join(",")})`,
        fields: ["parent"].concat(
          findFieldIdByDisplay(names, [/^epic\s*link$/i]) || [],
        ),
        pageSize,
      });
      childrenWithParents.push(...issues);
    }
    const epicLinkFieldId = findFieldIdByDisplay(names, [/^epic\s*link$/i]);

    const epicOfChild = (iss) => {
      const pf = iss.fields || {};
      // Prefer parent if it's an Epic (team-managed & new parent model)
      const pKey = pf.parent?.key;
      const pType = pf.parent?.fields?.issuetype?.name;
      if (pKey && /epic/i.test(pType || "")) return pKey;
      // Fallback to Epic Link
      if (epicLinkFieldId && pf[epicLinkFieldId])
        return typeof pf[epicLinkFieldId] === "string"
          ? pf[epicLinkFieldId]
          : pf[epicLinkFieldId].key || null;
      return null;
    };

    const byKey = new Map(childIssues.map((x) => [x.key, x]));
    for (const c of childrenWithParents) {
      const ek = epicOfChild(c);
      if (ek && epicKeySet.has(ek)) {
        const node = byKey.get(c.key);
        if (!childrenByEpic.has(ek)) childrenByEpic.set(ek, []);
        childrenByEpic.get(ek).push(node);
      }
    }
  }

  // 3) Fetch all subtasks for those children (level 3)
  let subtasksByParent = new Map();
  if (childIssues.length) {
    const parentKeys = childIssues.map((i) => i.key);
    const chunks = (arr, n = 50) =>
      arr.reduce(
        (a, _, ix) => (ix % n ? a : [...a, arr.slice(ix, ix + n)]),
        [],
      );
    const parentKeyChunks = chunks(parentKeys, 50);
    const allSubtasks = [];
    for (const group of parentKeyChunks) {
      const { issues } = await jqlSearchPaged({
        baseUrl,
        headers,
        jql: `parent in (${group.map((k) => `"${k}"`).join(",")})`,
        fields: baseFields.concat(
          storyPointsFieldId || [],
          sprintFieldId || [],
        ),
        pageSize,
      });
      allSubtasks.push(...issues);
    }
    const normalizedSubs = allSubtasks.map((s) =>
      normIssue(s, { storyPointsFieldId, sprintFieldId }),
    );
    subtasksByParent = new Map();
    for (const s of normalizedSubs) {
      // We need parent keys; do a thin fetch for them (cheap because count is small)
      // (Alternatively: include 'parent' above; we already did.)
    }
    // rehydrate parent mapping from the already fetched 'parent' field
    for (const raw of allSubtasks) {
      const parentKey = raw.fields?.parent?.key;
      if (!parentKey) continue;
      const norm = normalizedSubs.find((n) => n.key === raw.key);
      if (!subtasksByParent.has(parentKey)) subtasksByParent.set(parentKey, []);
      subtasksByParent.get(parentKey).push(norm);
    }
  }

  // 4) Build final tree: for each epic → attach children → attach subtasks
  const epicsWithChildren = epics.map((e) => {
    const children = childrenByEpic.get(e.key) || [];
    const childrenWithSubs = children.map((ch) => ({
      ...ch,
      subtasks: subtasksByParent.get(ch.key) || [],
    }));
    return { ...e, children: childrenWithSubs };
  });

  return {
    project: projectKeyOrId,
    levels: 3,
    stats: {
      epics: epics.length,
      children: childIssues.length,
      subtasks: Array.from(subtasksByParent.values()).reduce(
        (a, arr) => a + arr.length,
        0,
      ),
    },
    epics: epicsWithChildren,
  };
}

module.exports = { fetchProjectTree3Levels };
```

**Why this approach is solid:**

- Uses the **v3 Search API + JQL** (stable, paginated) and `expand=names` to discover custom fields at runtime. ([Atlassian Developer Docs][1])
- Leans on Atlassian’s **Parent** unification so `parent in (EPIC-keys)` captures children across project types; if the rollout isn’t complete on your site, it **falls back** to `Epic Link` via `cf[ID]`. ([Atlassian Support][3])
- Fetches **subtasks** with their own JQL so you’re not limited by the tiny inline subtask snippet on parent issues. ([community.atlassian.com][2])

---

### Example MCP handler

```js
// in your MCP server
const { fetchProjectTree3Levels } = require("./jiraProjectTree");

async function handleProjectTree({ projectKey }) {
  return await fetchProjectTree3Levels({
    baseUrl: process.env.JIRA_BASE,
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN }, // or { bearer: ... }
    projectKeyOrId: projectKey,
  });
}
```

---
