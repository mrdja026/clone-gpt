# Query Matcher Integration Test Guide

## Manual Testing Scenarios

Test these queries in your MCP client to verify the new integration works:

### 🏗️ Board Search Patterns

| Query                        | Expected Tool                 | Expected Args             |
| ---------------------------- | ----------------------------- | ------------------------- |
| `"show me all boards"`       | `search_jira_boards`          | `{}`                      |
| `"find scrum boards"`        | `search_jira_boards`          | `{type: "scrum"}`         |
| `"list kanban boards"`       | `search_jira_boards`          | `{type: "kanban"}`        |
| `"boards for project SCRUM"` | `search_projects_with_boards` | `{projectQuery: "SCRUM"}` |
| `"find board MyBoard"`       | `search_jira_boards`          | `{name: "MyBoard"}`       |

### 📂 Enhanced Project Patterns

| Query                  | Expected Tool          | Expected Args      |
| ---------------------- | ---------------------- | ------------------ |
| `"search projects"`    | `search_jira_projects` | `{status: "live"}` |
| `"list all projects"`  | `search_jira_projects` | `{status: "live"}` |
| `"find project SCRUM"` | `search_jira_projects` | `{query: "SCRUM"}` |

### 🔗 Combined Search Patterns

| Query                             | Expected Tool                 | Expected Args                               |
| --------------------------------- | ----------------------------- | ------------------------------------------- |
| `"show projects with boards"`     | `search_projects_with_boards` | `{projectStatus: "live"}`                   |
| `"find project HWP scrum boards"` | `search_projects_with_boards` | `{projectQuery: "HWP", boardType: "scrum"}` |

### ✅ Backward Compatibility

These should still work as before:

| Query                     | Expected Tool/Resource | Notes                   |
| ------------------------- | ---------------------- | ----------------------- |
| `"SCRUM-8"`               | `fetch_ticket`         | Lane B pattern          |
| `"ticket SCRUM-42"`       | `fetch_ticket`         | Lane B enhanced         |
| `"project SCRUM details"` | Resource URI           | Legacy specific lookup  |
| `"current sprint"`        | Resource URI           | Existing sprint pattern |

## Verification Steps

1. **Pattern Detection**: Verify queries match expected tools
2. **Arguments**: Check tool arguments are correctly extracted
3. **Confidence**: Ensure confidence scores are reasonable (>0.8)
4. **Response Formatting**: Verify responses are well-formatted
5. **Fallbacks**: Test that unmatched queries don't break

## Expected Benefits

✅ **Board Discovery**: Users can now find boards by type, name, or project
✅ **Enhanced Project Search**: Better project discovery with search intent
✅ **Combined Queries**: Single query for projects + their boards
✅ **Rich Responses**: Formatted responses with board configs, sprints, etc.
✅ **Backward Compatible**: All existing patterns still work

## Integration Architecture

```
User Query → Query Matcher → MCP Tool → Hello-World-MCP Server → JIRA API
     ↓              ↓              ↓                    ↓
"find scrum    Detects board   search_jira_    Calls JIRA Agile
 boards"       pattern +       boards tool     v1.0 API with
               extracts type                   type=scrum filter
```

## Production Readiness

- ✅ **Error Handling**: All new patterns include error cases
- ✅ **LLM Safety**: Strict prompts prevent hallucination
- ✅ **Confidence Scoring**: Reliable confidence levels for routing
- ✅ **Response Formatting**: Consistent, readable output format
- ✅ **Backward Compatibility**: No breaking changes to existing patterns
