# Apply OAuth Scope Fix - Step by Step

## ✅ What's Been Done

1. **Created OAuth setup documentation** (`OAUTH_SETUP_GUIDE.md`)
2. **Created .env template** with required OAuth variables
3. **Updated README.md** with OAuth scope fix information
4. **Created OAuth test script** (`test-oauth.js`) to verify configuration

## 🔧 What You Need to Do

### 1. Configure OAuth App in Atlassian Developer Console

**Go to:** https://developer.atlassian.com/console/myapps

**Add these exact scopes to your OAuth app:**

```
read:issue-details:jira          # For fetching issue details
read:project:jira               # For listing projects
read:board-scope:jira-software  # For accessing agile boards
read:sprint:jira-software       # For accessing sprint information
read:jira-work                  # General Jira work access (baseline)
```

### 2. Update Environment Variables

Edit the `.env` file and add your OAuth credentials:

```bash
# Replace with your actual OAuth credentials:
JIRA_OAUTH_CLIENT_ID=your_client_id_from_atlassian_console
JIRA_OAUTH_CLIENT_SECRET=your_client_secret_from_atlassian_console
```

### 3. Test the Configuration

Run the OAuth test script:

```bash
cd hello_world_mcp
npm run test:oauth
```

This will test all the API endpoints and verify the OAuth scopes are working.

### 4. Start the MCP Server

```bash
npm start
```

## 🚨 Important Notes

- **All scopes are required** - Missing even one scope will cause 403 errors
- **Client Credentials flow** - No user interaction needed
- **Auto-discovery** - Cloud ID will be automatically discovered
- **Scope precedence** - OAuth scopes override API token authentication

## 🔍 Troubleshooting Commands

**View server logs:**

```bash
tail -f logs/mcp_server.log
```

**Test OAuth configuration:**

```bash
npm run test:oauth
```

**Check environment variables:**

```bash
node -e "require('dotenv').config(); console.log({
  hasClientId: !!process.env.JIRA_OAUTH_CLIENT_ID,
  hasClientSecret: !!process.env.JIRA_OAUTH_CLIENT_SECRET,
  audience: process.env.JIRA_OAUTH_AUDIENCE
})"
```

## 📊 Expected Results

After applying the fix:

- ✅ No more 403 errors
- ✅ OAuth token acquisition successful
- ✅ Cloud ID auto-discovery working
- ✅ All API endpoints accessible
- ✅ MCP tools and resources working properly

## 🎯 Next Steps After Fix

1. The OAuth configuration should resolve the 403 errors
2. Test all MCP tools (fetch_jira_ticket, projects list, sprint summary)
3. Verify the MCP server works with your application
4. Remove any hardcoded API tokens if using OAuth exclusively
