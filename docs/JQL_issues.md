## Jira JQL migration notes (why it broke, what we changed)

### What failed

- The classic search endpoints (`/rest/api/2|3/search`) began returning 410 Gone on our tenant. This caused `fetch_jira_project_tree` to fail consistently.
- Some requests also produced 400 Invalid payloads due to flags/expansions that are no longer accepted.

### Root cause

- Atlassian is moving searches to the enhanced JQL endpoint and deprecating the old paths. See the developer changelog for the relevant deprecations and guidance to migrate to the enhanced API.
  - Atlassian developer changelog: https://developer.atlassian.com/changelog/#CHANGE-2046
- We also previously relied on legacy fields (e.g., “Epic Link”) and extras (expand=names, wide field sets), which are not required for building a tree and increase failure risk.

### The fix (in @hello-world-mcp only)

We rewrote `src/utils/jira-project-tree.js` to use the enhanced search only and to build the tree client‑side with minimal assumptions.

1. Use enhanced search only
   - Endpoint: `POST /rest/api/3/search/jql`
   - Body: `{ jql, maxResults, fields, fieldsByKeys, nextPageToken? }`
   - Pagination: read `nextPageToken` and pass it on subsequent calls until exhausted.

2. Minimal fields and no expansions
   - We fetch only the fields we need to stitch the hierarchy: `key, summary, issuetype, status, assignee, reporter, priority, parent, subtasks`.
   - We removed `expand=names`, Story Points/Sprint custom field discovery, and time-tracking aggregates.

3. Parent‑based hierarchy (forward‑compatible)
   - Epics: `project = "<KEY>" AND issuetype = Epic`
   - Children: `project = "<KEY>" AND parent in (<EPIC_KEYS...>)` (chunked ≤ 50 per clause)
   - Subtasks: `parent in (<STORY_KEYS...>)` (chunked ≤ 50 per clause)
   - We no longer rely on “Epic Link/Parent Link”. The `parent` relationship is the forward path.

4. Deterministic client-side stitching
   - Normalize issues, group children by `parent.key`, attach subtasks by their `parent`. Return `{ project, stats, epics[] -> children[] -> subtasks[] }`.

5. Boards and sprints
   - For sprint/board context we keep using Jira Software Agile API (`/rest/agile/1.0/...`) and never guess Sprint custom fields.

### Why this works

- Aligns with Atlassian’s enhanced search (removes 410s) and keeps payloads small to avoid 400s.
- Uses the unified `parent` relationship instead of deprecated custom fields.

### Test prompts (UI)

- `project tree SCRUM`
- `project tree HWP`
- `list all issues for SCRUM`
- `list all issues for HWP`

### References

- Enhanced search migration (Atlassian developer changelog): https://developer.atlassian.com/changelog/#CHANGE-2046
- (Background) Custom JQL functions overview: https://developer.atlassian.com/cloud/jira/platform/jql-functions/#custom-jql-functions
