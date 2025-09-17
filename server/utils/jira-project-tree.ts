import axios from "axios";

/** ---------- Auth header (Bearer OR Basic) ---------- */
function makeAuthHeader({
  email,
  apiToken,
  bearer,
}: {
  email?: string;
  apiToken?: string;
  bearer?: string;
}) {
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  if (email && apiToken) {
    const b64 = Buffer.from(`${email}:${apiToken}`).toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  throw new Error("Provide either { bearer } or { email, apiToken }");
}

/** ---------- Field-name helpers ---------- */
function findFieldIdByDisplay(
  names: Record<string, string> = {},
  regexes: RegExp[] = [],
): string | null {
  for (const [fieldId, display] of Object.entries(names)) {
    if (regexes.some((re) => re.test(display))) return fieldId; // e.g. "customfield_10014"
  }
  return null;
}

const idNum = (customfield: string) =>
  (customfield || "").replace(/^customfield_/, "");

/** ---------- JQL search with pagination ---------- */
async function jqlSearchPaged({
  baseUrl,
  headers,
  jql,
  fields = [],
  expandNames = false,
  pageSize = 100,
}: {
  baseUrl: string;
  headers: Record<string, string>;
  jql: string;
  fields?: string[];
  expandNames?: boolean;
  pageSize?: number;
}) {
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/search`;
  const issues: any[] = [];
  let startAt = 0;
  let names: Record<string, string> | null = null;

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
function normIssue(
  issue: any,
  {
    storyPointsFieldId,
    sprintFieldId,
  }: { storyPointsFieldId?: string; sprintFieldId?: string } = {},
) {
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
export async function fetchProjectTree3Levels({
  baseUrl,
  auth, // { email, apiToken } or { bearer }
  projectKeyOrId, // e.g. "WEB" or 10010
  pageSize = 100,
}: {
  baseUrl: string;
  auth: { email?: string; apiToken?: string; bearer?: string };
  projectKeyOrId: string | number;
  pageSize?: number;
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
  const storyPointsFieldId = findFieldIdByDisplay(names || {}, [
    /story\s*points?/i,
    /story\s*point\s*estimate/i,
  ]);
  const sprintFieldId = findFieldIdByDisplay(names || {}, [/^sprint$/i]);

  // Normalize epics
  const epics = epicIssues.map((e) =>
    normIssue(e, { storyPointsFieldId, sprintFieldId }),
  );
  const epicKeys = epics.map((e) => e.key);
  const epicKeySet = new Set(epicKeys);

  // 2) Get all direct children of the epics (stories/tasks/bugs)
  // Preferred (new model): parent in (EPIC-1, EPIC-2, ...)
  // Fallback (old model):  cf[<EpicLinkId>] in (...)
  let childIssues: any[] = [];
  if (epicKeys.length) {
    const chunks = (arr: string[], n = 50) =>
      arr.reduce(
        (a: string[][], _, i) => (i % n ? a : [...a, arr.slice(i, i + n)]),
        [],
      );
    const epicKeyChunks = chunks(epicKeys, 50);

    // Try parent-in (requires rollout of Parent unification)
    const parentClauses = epicKeyChunks.map(
      (ks) => `parent in (${ks.map((k) => `"${k}"`).join(",")})`,
    );
    const childrenJql = `project = "${projectKeyOrId}" AND issuetype in (Story, Task, Bug, "Change Request", "Service Request", "Incident") AND (${parentClauses.join(" OR ")})`;
    let { issues: children } = await jqlSearchPaged({
      baseUrl,
      headers,
      jql: childrenJql,
      fields: baseFields.concat(
        storyPointsFieldId ? [storyPointsFieldId] : [],
        sprintFieldId ? [sprintFieldId] : [],
      ),
      pageSize,
    });

    // Fallback if nothing came back (older company-managed projects still using Epic Link)
    if (!children.length) {
      const epicLinkFieldId = findFieldIdByDisplay(names || {}, [
        /^epic\s*link$/i,
      ]);
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
            storyPointsFieldId ? [storyPointsFieldId] : [],
            sprintFieldId ? [sprintFieldId] : [],
          ),
          pageSize,
        });
        children = resp2.issues;
      }

      // if still empty, we leave children empty
    }

    childIssues = children.map((i) =>
      normIssue(i, { storyPointsFieldId, sprintFieldId }),
    );
  }

  const childrenByEpic = new Map(epicKeys.map((k) => [k, [] as any[]]));

  // We need parent mapping; re-run minimal search to bring back parent + epic link ids on the child set
  if (childIssues.length) {
    const childKeys = childIssues.map((i) => i.key);
    const chunks = (arr: string[], n = 50) =>
      arr.reduce(
        (a: string[][], _, ix) => (ix % n ? a : [...a, arr.slice(ix, ix + n)]),
        [],
      );
    const childKeyChunks = chunks(childKeys, 100);
    const childrenWithParents: any[] = [];
    for (const group of childKeyChunks) {
      const { issues } = await jqlSearchPaged({
        baseUrl,
        headers,
        jql: `key in (${group.map((k) => `"${k}"`).join(",")})`,
        fields: ["parent"].concat(
          findFieldIdByDisplay(names || {}, [/^epic\s*link$/i])
            ? [findFieldIdByDisplay(names || {}, [/^epic\s*link$/i])!]
            : [],
        ),
        pageSize,
      });
      childrenWithParents.push(...issues);
    }
    const epicLinkFieldId = findFieldIdByDisplay(names || {}, [
      /^epic\s*link$/i,
    ]);

    const epicOfChild = (iss: any) => {
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
        childrenByEpic.get(ek)!.push(node);
      }
    }
  }

  // 3) Fetch all subtasks for those children (level 3)
  let subtasksByParent = new Map<string, any[]>();
  if (childIssues.length) {
    const parentKeys = childIssues.map((i) => i.key);
    const chunks = (arr: string[], n = 50) =>
      arr.reduce(
        (a: string[][], _, ix) => (ix % n ? a : [...a, arr.slice(ix, ix + n)]),
        [],
      );
    const parentKeyChunks = chunks(parentKeys, 50);
    const allSubtasks: any[] = [];
    for (const group of parentKeyChunks) {
      const { issues } = await jqlSearchPaged({
        baseUrl,
        headers,
        jql: `parent in (${group.map((k) => `"${k}"`).join(",")})`,
        fields: baseFields.concat(
          storyPointsFieldId ? [storyPointsFieldId] : [],
          sprintFieldId ? [sprintFieldId] : [],
        ),
        pageSize,
      });
      allSubtasks.push(...issues);
    }
    const normalizedSubs = allSubtasks.map((s) =>
      normIssue(s, { storyPointsFieldId, sprintFieldId }),
    );
    subtasksByParent = new Map();

    // rehydrate parent mapping from the already fetched 'parent' field
    for (const raw of allSubtasks) {
      const parentKey = raw.fields?.parent?.key;
      if (!parentKey) continue;
      const norm = normalizedSubs.find((n) => n.key === raw.key);
      if (!subtasksByParent.has(parentKey)) subtasksByParent.set(parentKey, []);
      subtasksByParent.get(parentKey)!.push(norm);
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
