# JIRA Project Tree Implementation

This document describes the implementation of the JIRA project tree functionality based on the `FINAL_BOSS.MD` specification.

## Overview

The JIRA project tree implementation provides a complete 3-level hierarchical view of JIRA projects:

**Project → Epics → Issues (Story/Task/Bug) → Subtasks**

This implementation handles both modern (Parent unification) and legacy (Epic Link) JIRA configurations with automatic fallback mechanisms.

## Architecture

### Core Components

1. **Utility Module**: [`server/utils/jira-project-tree.ts`](../server/utils/jira-project-tree.ts)
   - Contains the main `fetchProjectTree3Levels` function
   - Handles authentication (Basic Auth and Bearer tokens)
   - Implements pagination for large datasets
   - Provides field discovery via `expand=names`

2. **Service Layer**: [`server/services/jira-project-tree.service.ts`](../server/services/jira-project-tree.service.ts)
   - NestJS service wrapper around the utility
   - Handles configuration management
   - Provides error handling and validation

3. **API Endpoints**: [`server/controllers/jira.controller.ts`](../server/controllers/jira.controller.ts)
   - `GET /api/jira/project-tree/:projectKeyOrId` - Direct endpoint
   - `POST /api/jira/project-tree` - POST endpoint with request body

4. **MCP Integration**: [`server/mcp/tools/jira-project-tree.ts`](../server/mcp/tools/jira-project-tree.ts)
   - MCP tool definition for external integrations
   - `POST /api/mcp/jira-project-tree` - MCP endpoint

5. **Type Definitions**: [`shared/api.ts`](../shared/api.ts)
   - Shared TypeScript interfaces
   - Type safety across client and server

## Features

### Smart Field Discovery

- Automatically discovers custom fields using `expand=names`
- Finds Story Points field by pattern matching
- Locates Sprint field dynamically
- Handles site-specific field configurations

### Dual Epic Linking Support

- **Modern approach**: Uses `parent in (EPIC-1, EPIC-2, ...)` for new JIRA instances
- **Legacy fallback**: Uses `cf[10014] in (...)` for older configurations
- Automatic detection and fallback between approaches

### Comprehensive Data Structure

Each issue includes:

- Basic info (key, summary, status, type, priority)
- People (assignee, reporter)
- Story points and sprint information
- Time tracking (original estimate, remaining, spent)
- Hierarchical relationships (parent/child/subtasks)

### Pagination Support

- Configurable page size (default: 100)
- Handles large projects efficiently
- Chunked processing for API limits

## API Reference

### GET /api/jira/project-tree/:projectKeyOrId

Fetch project tree for a specific project.

**Parameters:**

- `projectKeyOrId` (path): Project key (e.g., "WEB") or ID (e.g., "10010")
- `pageSize` (query, optional): Items per page (default: 100)

**Example:**

```bash
curl "http://localhost:3001/api/jira/project-tree/WEB?pageSize=50"
```

### POST /api/jira/project-tree

Fetch project tree with request body.

**Request Body:**

```json
{
  "projectKeyOrId": "WEB",
  "pageSize": 100
}
```

### POST /api/mcp/jira-project-tree

MCP tool endpoint for external integrations.

**Request Body:**

```json
{
  "projectKeyOrId": "WEB",
  "pageSize": 50
}
```

## Response Format

```json
{
  "project": "WEB",
  "levels": 3,
  "stats": {
    "epics": 5,
    "children": 23,
    "subtasks": 12
  },
  "epics": [
    {
      "id": "10001",
      "key": "WEB-1",
      "summary": "User Authentication Epic",
      "status": "In Progress",
      "issuetype": "Epic",
      "priority": "High",
      "assignee": "John Doe",
      "reporter": "Jane Smith",
      "storyPoints": null,
      "sprint": null,
      "timeTracking": {
        "originalEstimate": "2w",
        "remainingEstimate": "1w",
        "timeSpent": "1w",
        "originalEstimateSeconds": 1209600,
        "remainingEstimateSeconds": 604800,
        "timeSpentSeconds": 604800,
        "aggregate": {
          "originalEstimateSeconds": 2419200,
          "remainingEstimateSeconds": 1209600,
          "timeSpentSeconds": 1209600
        }
      },
      "children": [
        {
          "id": "10002",
          "key": "WEB-2",
          "summary": "Login Form Implementation",
          "status": "Done",
          "issuetype": "Story",
          "priority": "High",
          "assignee": "John Doe",
          "reporter": "Jane Smith",
          "storyPoints": 5,
          "sprint": {...},
          "timeTracking": {...},
          "subtasks": [
            {
              "id": "10003",
              "key": "WEB-3",
              "summary": "Create login UI components",
              "status": "Done",
              "issuetype": "Sub-task",
              "priority": "Medium",
              "assignee": "Alice Johnson",
              "reporter": "John Doe",
              "storyPoints": null,
              "sprint": null,
              "timeTracking": {...}
            }
          ]
        }
      ]
    }
  ]
}
```

## Configuration

Set the following environment variables:

```bash
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
```

## Testing

Use the provided test script to verify the implementation:

```bash
node scripts/test-jira-project-tree.js
```

The test script will:

1. Check server health
2. Discover available projects
3. Test all three endpoints
4. Display comprehensive results

## Error Handling

The implementation includes robust error handling:

- **Configuration errors**: Missing JIRA credentials
- **Network errors**: Connection timeouts, unreachable servers
- **API errors**: Invalid project keys, permission issues
- **Data errors**: Malformed responses, missing fields

## Performance Considerations

- **Pagination**: Large projects are processed in chunks
- **Field selection**: Only necessary fields are fetched
- **Caching**: Consider implementing caching for frequently accessed projects
- **Rate limiting**: Respects JIRA API rate limits

## Integration Examples

### Direct API Call

```javascript
const response = await fetch("/api/jira/project-tree/WEB");
const projectTree = await response.json();
```

### MCP Tool Call

```javascript
const mcpResponse = await fetch("/api/mcp/jira-project-tree", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ projectKeyOrId: "WEB" }),
});
```

### TypeScript Usage

```typescript
import type { JiraProjectTreeResponse } from "@shared/api";

const projectTree: JiraProjectTreeResponse = await fetchProjectTree("WEB");
```

## Troubleshooting

### Common Issues

1. **"Missing Jira configuration"**
   - Ensure all environment variables are set
   - Check `.env` file exists and is loaded

2. **"Failed to fetch project tree"**
   - Verify JIRA credentials are valid
   - Check project key exists and is accessible
   - Ensure JIRA instance is reachable

3. **Empty results**
   - Project may have no epics
   - Check user permissions for the project
   - Verify project type supports epics

### Debug Mode

Enable detailed logging by setting:

```bash
DEBUG=jira:*
```

## Future Enhancements

- [ ] Caching layer for improved performance
- [ ] Webhook support for real-time updates
- [ ] Bulk project tree fetching
- [ ] Custom field mapping configuration
- [ ] Export functionality (JSON, CSV, Excel)
- [ ] GraphQL endpoint for flexible queries

## Related Documentation

- [FINAL_BOSS.MD](./FINAL_BOSS.MD) - Original specification
- [Atlassian REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [MCP Integration Guide](./How_MCP_works_here.md)
