Heck yeah—here’s the “one-shot” style for **Project search** and **Board search** (with config + active sprints) that matches the pattern we used for issues. It uses Jira Cloud **v3** + Jira Software **Agile v1.0**, handles pagination, and normalizes output so your MCP can consume it directly.

I verified endpoints/params & response shapes in Atlassian’s docs (project search pagination, board list query params like `projectKeyOrId`/`name`/`type`, board **configuration** with estimation + filter, and **sprints** with `state=active`). ([Atlassian Developer Docs][1])

---

### Drop-in helpers (Node + Axios)

```js
// jiraProjectBoard.js
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

/** ---------- Small pagination helper ---------- */
async function pagedGet(url, { headers, params = {}, collectPath = "values" }) {
  const all = [];
  let startAt = params.startAt || 0;
  const maxResults = params.maxResults || 50;

  // Using "isLast/nextPage" style where available; otherwise fall back to startAt/total
  while (true) {
    const { data } = await axios.get(url, {
      headers,
      params: { ...params, startAt, maxResults },
    });
    const pageValues = Array.isArray(data[collectPath])
      ? data[collectPath]
      : [];
    all.push(...pageValues);

    // Prefer "isLast/nextPage" (Agile + Project search) else compute via total
    const isLast = data.isLast === true || pageValues.length === 0;
    if (isLast) break;

    // Some endpoints return total; if present, stop when we’ve read all
    if (typeof data.total === "number") {
      const next = startAt + pageValues.length;
      if (next >= data.total) break;
      startAt = next;
    } else if (data.nextPage) {
      // If nextPage is present use it directly
      const u = new URL(data.nextPage);
      startAt = Number(
        u.searchParams.get("startAt") || startAt + pageValues.length,
      );
    } else {
      // Fallback: move by page length
      startAt += pageValues.length;
    }
  }
  return all;
}

/** ---------- PROJECT SEARCH (v3) ----------
 * One-shot search over projects with filters.
 * Normalizes to: id, key, name, type, category, simplified/style, avatarUrls.
 *
 * Params (all optional):
 *   query: string (matches name/key)
 *   status: 'live' | 'archived' | 'deleted' (Cloud supports status filtering)
 *   categoryId: string
 *   maxResults: number
 */
async function searchProjects({
  baseUrl,
  auth,
  query,
  status,
  categoryId,
  maxResults = 50,
}) {
  const headers = { Accept: "application/json", ...makeAuthHeader(auth) };
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/project/search`;

  const params = {};
  if (query) params.query = query;
  if (status) params.status = status; // e.g. 'archived' or 'live'
  if (categoryId) params.categoryId = categoryId;

  const projects = await pagedGet(url, {
    headers,
    params: { ...params, maxResults },
    collectPath: "values",
  });

  return projects.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey || p.style || null,
    simplified: p.simplified ?? null,
    style: p.style ?? null,
    category: p.projectCategory
      ? { id: p.projectCategory.id, name: p.projectCategory.name }
      : null,
    avatarUrls: p.avatarUrls || {},
    self: p.self,
  }));
}

/** ---------- BOARD SEARCH (Agile v1.0) ----------
 * One-shot board search with optional filters:
 *   name, type ('scrum'|'kanban'), projectKeyOrId
 * Returns boards and (optionally) attaches config + active sprints.
 *
 * opts:
 *   includeConfig: boolean (default true) => /board/{id}/configuration
 *   includeActiveSprints: boolean (default true) => /board/{id}/sprint?state=active
 */
async function searchBoards({
  baseUrl,
  auth,
  name,
  type, // 'scrum' | 'kanban'
  projectKeyOrId, // e.g. 'PROJ' or '10010'
  maxResults = 50,
  includeConfig = true,
  includeActiveSprints = true,
}) {
  const headers = { Accept: "application/json", ...makeAuthHeader(auth) };
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/agile/1.0/board`;

  const params = {};
  if (name) params.name = name;
  if (type) params.type = type;
  if (projectKeyOrId) params.projectKeyOrId = projectKeyOrId;

  const boards = await pagedGet(url, {
    headers,
    params: { ...params, maxResults },
    collectPath: "values",
  });

  // Optionally enrich each board
  const results = [];
  for (const b of boards) {
    const baseBoard = {
      id: b.id,
      name: b.name,
      type: b.type, // scrum | kanban
      self: b.self,
      location: b.location
        ? {
            type: b.location.type,
            projectId: b.location.projectId ?? null,
            projectKey: b.location.projectKey ?? null,
            name: b.location.name ?? b.location.displayName ?? null,
          }
        : null,
    };

    // Attach configuration (filterId, estimation field, columns, ranking)
    let config = null;
    if (includeConfig) {
      try {
        const { data: cfg } = await axios.get(
          `${baseUrl.replace(/\/+$/, "")}/rest/agile/1.0/board/${b.id}/configuration`,
          { headers },
        );
        config = {
          filterId: cfg?.filter?.id ?? null,
          estimation: cfg?.estimation?.field
            ? {
                displayName: cfg.estimation.field.displayName,
                fieldId: cfg.estimation.field.fieldId,
              }
            : null,
          columns: Array.isArray(cfg?.columnConfig?.columns)
            ? cfg.columnConfig.columns.map((c) => ({
                name: c.name,
                statusIds: (c.statuses || []).map((s) => s.id),
              }))
            : [],
          rankingFieldId: cfg?.ranking?.rankCustomFieldId ?? null,
          location: cfg?.location
            ? {
                type: cfg.location.type,
                projectId: cfg.location.projectId ?? null,
                projectKey: cfg.location.key ?? cfg.location.projectKey ?? null,
                name: cfg.location.name ?? cfg.location.displayName ?? null,
              }
            : null,
        };
      } catch (e) {
        // Permissions or board type can block config; keep going.
        config = null;
      }
    }

    // Attach active sprints
    let activeSprints = [];
    if (includeActiveSprints) {
      try {
        const { data: spr } = await axios.get(
          `${baseUrl.replace(/\/+$/, "")}/rest/agile/1.0/board/${b.id}/sprint`,
          { headers, params: { state: "active", maxResults: 50 } },
        );
        activeSprints = Array.isArray(spr?.values)
          ? spr.values
              .filter((s) => s.state === "active")
              .map((s) => ({
                id: s.id,
                name: s.name,
                state: s.state,
                startDate: s.startDate ?? null,
                endDate: s.endDate ?? null,
                completeDate: s.completeDate ?? null,
                originBoardId: s.originBoardId ?? null,
                goal: s.goal ?? null,
              }))
          : [];
      } catch (e) {
        activeSprints = [];
      }
    }

    results.push({ ...baseBoard, config, activeSprints });
  }

  return results;
}

/** ---------- Convenience: find boards for each project ---------- */
async function searchProjectsWithBoards({
  baseUrl,
  auth,
  projectQuery,
  projectStatus,
  projectCategoryId,
  boardType,
  includeConfig = true,
  includeActiveSprints = true,
}) {
  const projects = await searchProjects({
    baseUrl,
    auth,
    query: projectQuery,
    status: projectStatus,
    categoryId: projectCategoryId,
  });

  const byProject = [];
  for (const p of projects) {
    const boards = await searchBoards({
      baseUrl,
      auth,
      projectKeyOrId: p.key,
      type: boardType,
      includeConfig,
      includeActiveSprints,
    });
    byProject.push({ project: p, boards });
  }
  return byProject;
}

module.exports = { searchProjects, searchBoards, searchProjectsWithBoards };
```

---

### How this lines up with the docs

- **Project search**: `/rest/api/3/project/search` returns paged results (`startAt`, `maxResults`, `total`, `isLast`) inside `values[]`, with fields like `id`, `key`, `name`, `projectCategory`, `style/simplified`. The helper maps that shape and accepts `query`, `status`, `categoryId`. ([Atlassian Developer Docs][1])
- **Board list**: `/rest/agile/1.0/board` supports filters such as `name`, `type` (`scrum|kanban`), and `projectKeyOrId`, and is paged with `values[]`. We normalize `id`, `name`, `type`, and `location`. ([Atlassian Developer Docs][2])
- **Board configuration**: `/rest/agile/1.0/board/{boardId}/configuration` returns `filter.id`, `estimation.field` (often Story Points custom field id), `columnConfig`, and `ranking`; we attach those if permitted. ([Atlassian Developer Docs][2])
- **Active sprints**: `/rest/agile/1.0/board/{boardId}/sprint?state=active` returns sprints; we filter/massage to `{id,name,state,dates,originBoardId,goal}`. ([Atlassian Developer Docs][2])

---

### MCP usage sketch

```js
// In your MCP server handlers
const {
  searchProjects,
  searchBoards,
  searchProjectsWithBoards,
} = require("./jiraProjectBoard");

// 1) Search projects only
async function handleSearchProjects({ query, status, categoryId }) {
  return await searchProjects({
    baseUrl: process.env.JIRA_BASE,
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN },
    query,
    status,
    categoryId,
  });
}

// 2) Search boards (optionally for a specific project)
async function handleSearchBoards({ name, type, projectKeyOrId }) {
  return await searchBoards({
    baseUrl: process.env.JIRA_BASE,
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN },
    name,
    type,
    projectKeyOrId,
    includeConfig: true,
    includeActiveSprints: true,
  });
}

// 3) Projects with boards (joined)
async function handleProjectsWithBoards({ projectQuery, boardType }) {
  return await searchProjectsWithBoards({
    baseUrl: process.env.JIRA_BASE,
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN },
    projectQuery,
    boardType,
    includeConfig: true,
    includeActiveSprints: true,
  });
}
```

---

If you want, I can extend the board result to also include **board projects** via `/board/{id}/project` or `/project/full` (useful when a board’s filter spans multiple projects). That’s a tiny add-on next to the config call. ([Atlassian Developer Docs][2])

[1]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/ "The Jira Cloud platform REST API"
[2]: https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/ "The Jira Software Cloud REST API"

Perfect 👍 — let’s extend the board search helper so it also brings back **projects linked to a board** in one pass. Jira Agile REST provides:

- **`GET /rest/agile/1.0/board/{boardId}/project`** → returns the projects visible to that board (because boards are filter-driven, they can span multiple projects).

---

### Updated helper with board → projects

```js
// jiraProjectBoard.js (extended)
const axios = require("axios");
const { makeAuthHeader, pagedGet } = require("./jiraCommonUtils"); // assume you extracted helpers

/** ... existing searchProjects() and searchBoards() ... */

/**
 * Search boards and also fetch their projects.
 *
 * Each board now includes: config, activeSprints, and projects.
 */
async function searchBoardsFull({
  baseUrl,
  auth,
  name,
  type,
  projectKeyOrId,
  maxResults = 50,
  includeConfig = true,
  includeActiveSprints = true,
  includeProjects = true,
}) {
  const headers = { Accept: "application/json", ...makeAuthHeader(auth) };
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/agile/1.0/board`;

  const params = {};
  if (name) params.name = name;
  if (type) params.type = type;
  if (projectKeyOrId) params.projectKeyOrId = projectKeyOrId;

  const boards = await pagedGet(url, {
    headers,
    params: { ...params, maxResults },
    collectPath: "values",
  });

  const results = [];
  for (const b of boards) {
    const baseBoard = {
      id: b.id,
      name: b.name,
      type: b.type,
      self: b.self,
      location: b.location
        ? {
            type: b.location.type,
            projectId: b.location.projectId ?? null,
            projectKey: b.location.projectKey ?? null,
            name: b.location.name ?? b.location.displayName ?? null,
          }
        : null,
    };

    // Config
    let config = null;
    if (includeConfig) {
      try {
        const { data: cfg } = await axios.get(
          `${baseUrl}/rest/agile/1.0/board/${b.id}/configuration`,
          { headers },
        );
        config = {
          filterId: cfg?.filter?.id ?? null,
          estimation: cfg?.estimation?.field
            ? {
                displayName: cfg.estimation.field.displayName,
                fieldId: cfg.estimation.field.fieldId,
              }
            : null,
          columns: (cfg?.columnConfig?.columns || []).map((c) => ({
            name: c.name,
            statusIds: (c.statuses || []).map((s) => s.id),
          })),
          rankingFieldId: cfg?.ranking?.rankCustomFieldId ?? null,
        };
      } catch (e) {
        config = null;
      }
    }

    // Active sprints
    let activeSprints = [];
    if (includeActiveSprints) {
      try {
        const { data: spr } = await axios.get(
          `${baseUrl}/rest/agile/1.0/board/${b.id}/sprint`,
          { headers, params: { state: "active", maxResults: 50 } },
        );
        activeSprints = (spr?.values || [])
          .filter((s) => s.state === "active")
          .map((s) => ({
            id: s.id,
            name: s.name,
            state: s.state,
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
            completeDate: s.completeDate ?? null,
            originBoardId: s.originBoardId ?? null,
            goal: s.goal ?? null,
          }));
      } catch (e) {
        activeSprints = [];
      }
    }

    // Projects attached to board
    let projects = [];
    if (includeProjects) {
      try {
        const projectsList = await pagedGet(
          `${baseUrl}/rest/agile/1.0/board/${b.id}/project`,
          { headers, collectPath: "values", params: { maxResults: 50 } },
        );
        projects = projectsList.map((p) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          projectTypeKey: p.projectTypeKey || null,
          simplified: p.simplified ?? null,
          style: p.style ?? null,
          avatarUrls: p.avatarUrls || {},
        }));
      } catch (e) {
        projects = [];
      }
    }

    results.push({ ...baseBoard, config, activeSprints, projects });
  }

  return results;
}

module.exports = { searchProjects, searchBoardsFull };
```

---

### Example MCP handler

```js
// Inside your MCP server
const { searchBoardsFull } = require("./jiraProjectBoard");

async function handleSearchBoards({ name, type, projectKeyOrId }) {
  return await searchBoardsFull({
    baseUrl: process.env.JIRA_BASE,
    auth: { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_TOKEN },
    name,
    type,
    projectKeyOrId,
    includeConfig: true,
    includeActiveSprints: true,
    includeProjects: true,
  });
}
```

---

### What this gives you (per board):

- **Board info**: `id`, `name`, `type`, `location`
- **Config**: filter id, estimation field, columns, ranking
- **Active sprints**: id, name, state, dates, goal
- **Projects**: list of project objects (`id`, `key`, `name`, `type`, `style`, `avatarUrls`)

---
