# MCP JIRA Integration Bug Analysis

## What We Achieved

**Successfully Enhanced MCP Server Architecture:**

- Enhanced the barebone MCP server to fetch comprehensive JIRA ticket data in a single API call
- Maintained pure data-fetching approach with zero LLM processing, perfect for Third Lane architecture
- Fixed HTTP handler parameter passing issue between JSON-RPC and internal method calls
- Added comprehensive debug logging to understand API response structure
- Updated JIRA API endpoint from v3 to v2 for better compatibility
- Implemented proper expand parameters for getting additional metadata like renderedFields, names, schema, transitions, operations, editmeta, changelog, and versionedRepresentations

**MCP Tool Integration Working:**

- The MCP server correctly receives and processes tool calls for "fetch_ticket"
- HTTP JSON-RPC endpoint functioning properly on port 4000
- Tool parameter validation and parsing working correctly
- Error handling and McpError integration functioning as expected

## Current Problem

**JIRA API Response Structure Mismatch:**
The core issue is that the JIRA API is not returning the expected field structure. When the code tries to access `fields.status.name`, it fails because `fields.status` is undefined, indicating either:

- Authentication credentials may be incorrect or expired
- The JIRA instance URL configuration might be wrong
- The ticket key "SCRUM-8" might not exist in the target JIRA instance
- JIRA API permissions might be insufficient for the authenticated user
- The API response structure differs from what we're expecting

**Debug Evidence:**
The error consistently occurs at the same line when trying to access nested properties of undefined objects, specifically when parsing the status field. This suggests the JIRA API call itself might be failing or returning an error response instead of the expected ticket data.

**Next Steps Needed:**

- Examine the actual JIRA API response structure being returned
- Verify JIRA credentials and instance configuration
- Check if the target ticket exists and is accessible
- Implement more robust error handling for missing or undefined fields
- Add API response logging to understand what data is actually being received

The MCP infrastructure is solid and working correctly - the issue lies specifically in the JIRA API integration layer.

# Possible solution

// jiraClient.js
const axios = require('axios');

/\*\*

- Create headers for Basic (email:apiToken) or Bearer auth.
  \*/
  function makeAuthHeader({ email, apiToken, bearer }) {
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  if (email && apiToken) {
  const b64 = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return { Authorization: `Basic ${b64}` };
  }
  throw new Error("Provide either { bearer } or { email, apiToken }");
  }

/\*\*

- Very small ADF -> text extractor for common nodes (paragraph, text, hardBreak, bullet/ordered lists).
- ADF spec: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
  \*/
  function adfToText(adf) {
  if (!adf || typeof adf !== 'object') return '';
  const walk = node => {
  if (!node) return '';
  switch (node.type) {
  case 'text':
  return node.text || '';
  case 'hardBreak':
  return '\n';
  case 'paragraph':
  return (node.content || []).map(walk).join('') + '\n';
  case 'bulletList':
  case 'orderedList':
  case 'listItem':
  case 'heading':
  case 'blockquote':
  case 'panel':
  case 'table':
  return (node.content || []).map(walk).join('');
  default:
  return (node.content || []).map(walk).join('');
  }
  };
  return walk(adf).trim();
  }

/\*\*

- Resolve the site-specific custom field id for Story Points by scanning the `names` map
- returned when using `expand=names` on the Get Issue API.
- Works for "Story Points" and "Story point estimate" across project types.
  */
  function findStoryPointsFieldId(names = {}) {
  const entries = Object.entries(names); // [ [fieldId, displayName], ... ]
  const matcher = /story\s*points?/i;
  const altMatcher = /story\s*point\s*estimate/i;
  const hit =
  entries.find(([, name]) => matcher.test(name)) ||
  entries.find(([, name]) => altMatcher.test(name));
  return hit ? hit[0] : null; // fieldId like "customfield_10016"
  }

/\*\*

- Normalize issuelinks into a neat array:
- [{ linkId, typeName, direction: 'outward'|'inward', key, id }]
- Docs: request fields=issuelinks; outwardIssue/inwardIssue present per link.
  \*/
  function mapIssueLinks(links = []) {
  const result = [];
  for (const link of links) {
  const typeName = link?.type?.name || null;
  if (link.outwardIssue) {
  result.push({
  linkId: link.id || null,
  typeName,
  direction: 'outward',
  key: link.outwardIssue.key || null,
  id: link.outwardIssue.id || null,
  });
  }
  if (link.inwardIssue) {
  result.push({
  linkId: link.id || null,
  typeName,
  direction: 'inward',
  key: link.inwardIssue.key || null,
  id: link.inwardIssue.id || null,
  });
  }
  }
  return result;
  }

/\*\*

- Fetch a "full ticket" snapshot in one call.
- - Includes: summary, status, issueType, priority, storyPoints, description (ADF + plain text),
-             parent/subtasks, labels, components, fixVersions, assignee/reporter, links (related tickets).
-
- @param {Object} cfg
- @param {string} cfg.baseUrl e.g. "https://your-domain.atlassian.net"
- @param {string} cfg.issueKey e.g. "SCRUM-8"
- @param {Object} cfg.auth { bearer } or { email, apiToken }
  \*/
  async function fetchJiraTicketFull({ baseUrl, issueKey, auth }) {
  const headers = {
  Accept: 'application/json',
  ...makeAuthHeader(auth),
  };

// Ask only for the fields we need; add issuelinks explicitly and expand=names to resolve custom ids.
const fields = [
'summary',
'status',
'issuetype',
'priority',
'parent',
'subtasks',
'labels',
'components',
'fixVersions',
'assignee',
'reporter',
'description',
'issuelinks',
// Story Points will be added dynamically after we inspect `names` (if necessary).
];

const url = `${baseUrl.replace(/\/+$/, '')}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;

// First call, include expand=names so we can map custom field IDs <-> display names
const { data } = await axios.get(url, {
headers,
params: {
fields: fields.join(','),
expand: 'names', // lets us discover the Story Points field id reliably
},
});

const { fields: f = {}, names = {} } = data || {};

// Find Story Points custom field id dynamically (varies per site/project).
const storyPointsFieldId = findStoryPointsFieldId(names);
let storyPoints = null;

if (storyPointsFieldId && f.hasOwnProperty(storyPointsFieldId)) {
const raw = f[storyPointsFieldId];
// Could be number or null
storyPoints = (typeof raw === 'number') ? raw : (raw ? Number(raw) : null);
}

// Description is ADF on Cloud; provide both raw ADF and plain text for convenience.
const descriptionADF = f.description || null;
const descriptionText = descriptionADF ? adfToText(descriptionADF) : null;

// Normalize linked issues
const related = mapIssueLinks(f.issuelinks || []);

// Build the final normalized snapshot
return {
key: data.key,
id: data.id,
self: data.self,
summary: f.summary || null,
status: f.status?.name || null,
issueType: f.issuetype?.name || null,
priority: f.priority?.name || null,
parentKey: f.parent?.key || null,
subtasks: (f.subtasks || []).map(st => ({ key: st.key, id: st.id, issueType: st.fields?.issuetype?.name })),
labels: f.labels || [],
components: (f.components || []).map(c => c.name),
fixVersions: (f.fixVersions || []).map(v => v.name),
assignee: f.assignee?.displayName || null,
reporter: f.reporter?.displayName || null,
storyPointsFieldId, // e.g., "customfield_10016" (so you can cache it per project later)
storyPoints,
description: {
adf: descriptionADF,
text: descriptionText,
},
relatedIssues: related,
// You can tack on more here if you like (sprint, epic link, time tracking, etc.)
raw: data, // optional: keep raw if your MCP wants to expose a "verbose" mode
};
}

module.exports = { fetchJiraTicketFull };
