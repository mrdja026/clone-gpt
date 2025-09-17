import type { QueryTemplate } from "@/components/chat/types";

export const deterministicQueries: QueryTemplate[] = [
  // 🎯 Quick JIRA Actions - Most Common Use Cases
  {
    id: "ticket-details-scrum8",
    label: "🎫 Get ticket details - SCRUM-8",
    template: "SCRUM-8",
  },
  {
    id: "ticket-status-scrum42",
    label: "📊 Check ticket status - SCRUM-42",
    template: "SCRUM-42",
  },
  {
    id: "ticket-blockers-scrum8",
    label: "🔍 Find ticket blockers - SCRUM-8",
    template:
      "What are the current blockers for SCRUM-8 and action items to unblock?",
  },
  {
    id: "ticket-analysis-scrum15",
    label: "📋 Analyze ticket progress - SCRUM-15",
    template: "Analyze progress and remaining work for SCRUM-15",
  },

  // 🏗️ Project Management & Structure
  {
    id: "project-tree-web",
    label: "🌳 Project tree overview - WEB",
    template: "Show me the complete project tree for WEB with epics and issues",
  },
  {
    id: "project-hierarchy-scrum",
    label: "📈 Project hierarchy - SCRUM",
    template: "project SCRUM tree hierarchy breakdown",
  },
  {
    id: "epic-breakdown-web",
    label: "🎯 Epic breakdown with subtasks - WEB",
    template: "epic breakdown with children and subtasks for project WEB",
  },
  {
    id: "projects-live-all",
    label: "📊 All active projects - LIVE",
    template: "search all live projects",
  },

  // 🏃‍♂️ Agile & Sprint Management
  {
    id: "boards-scrum-active",
    label: "🏃‍♂️ Active scrum boards - SCRUM",
    template: "search scrum boards with active sprints",
  },
  {
    id: "projects-with-boards-all",
    label: "📋 Projects with boards - ALL",
    template: "search projects with boards",
  },
  {
    id: "sprint-plan-alpha-30pts",
    label: "⚡ Sprint planning insights - ALPHA-30pts",
    template:
      "Create a 2-week sprint plan for team ALPHA targeting 30 story points based on backlog",
  },
  {
    id: "release-notes-v123",
    label: "📝 Release notes generator - v1.2.3",
    template:
      "Generate concise release notes for version v1.2.3 from merged tickets",
  },

  // 🔍 Web Search & Research (Perplexity)
  {
    id: "search-react19-latest",
    label: "🔍 Latest tech news - React19",
    template: "search React 19 release notes latest",
  },
  {
    id: "search-typescript-generics",
    label: "📚 Best practices guide - TypeScript",
    template: "search TypeScript generics best practices",
  },
  {
    id: "search-nodejs-lts",
    label: "🆕 Node.js updates - LTS",
    template: "search Node.js LTS recent",
  },
  {
    id: "search-ai-trends-2024",
    label: "🧠 AI/ML research trends - 2024",
    template: "search artificial intelligence machine learning trends 2024",
  },
  {
    id: "search-devops-tools",
    label: "🔧 DevOps automation tools - Latest",
    template: "search DevOps automation tools comparison latest",
  },

  // 🎯 Perplexity Spaces & Users
  {
    id: "space-rag-explore",
    label: "📁 Explore Perplexity space - RAG",
    template: "space named RAG",
  },
  {
    id: "user-profile-handle",
    label: "👤 User profile insights - @handle",
    template: "perplexity user @your-handle",
  },

  // 🚀 Development Workflows
  {
    id: "bugs-high-priority-me",
    label: "🐛 Bug triage workflow - HIGH-ME",
    template:
      "List all high-priority bugs assigned to me with status and blockers",
  },
  {
    id: "search-code-review-2024",
    label: "🔄 Code review checklist - 2024",
    template: "search code review best practices checklist 2024",
  },
  {
    id: "search-architecture-microservices",
    label: "🏗️ Architecture decisions - Microservices",
    template:
      "search microservices vs monolith architecture decision framework",
  },
  {
    id: "velocity-analysis-scrum",
    label: "📊 Team velocity analysis - SCRUM",
    template:
      "Analyze team velocity and sprint completion rates for project SCRUM",
  },

  // 🎯 Quick Actions & Shortcuts
  {
    id: "priorities-today-me",
    label: "⚡ Today's priorities - ME",
    template:
      "Show me all tickets assigned to me with high priority due this week",
  },
  {
    id: "issues-critical-all",
    label: "🔥 Critical issues - ALL",
    template: "Find all critical and blocker issues across all projects",
  },
  {
    id: "standup-prep-weekly",
    label: "📅 Weekly standup prep - ME",
    template: "Summarize my completed work and current blockers for standup",
  },
  {
    id: "epic-progress-web",
    label: "🎯 Epic progress tracking - WEB",
    template: "Show progress and remaining work for all epics in project WEB",
  },

  // 🏗️ Advanced Project Management (from hello-world-mcp)
  {
    id: "project-tree-3levels-web",
    label: "🌲 3-level project tree - WEB",
    template:
      "Show me the complete 3-level project tree for WEB with epics, stories, and subtasks including story points and time tracking",
  },
  {
    id: "project-boards-search-scrum",
    label: "🏃‍♂️ Search project boards - SCRUM",
    template:
      "search scrum boards for project SCRUM with active sprints and configuration",
  },
  {
    id: "projects-with-boards-live",
    label: "📊 Live projects with boards - ALL",
    template:
      "search all live projects with their associated boards and sprint information",
  },
  {
    id: "board-config-analysis",
    label: "⚙️ Board configuration analysis - ID",
    template:
      "analyze board configuration including columns, estimation fields, and ranking for board ID",
  },
  {
    id: "sprint-velocity-tracking",
    label: "📈 Sprint velocity tracking - BOARD",
    template:
      "track sprint velocity and completion rates for all active sprints on board",
  },

  // 🔍 Enhanced Perplexity Search (from hello-world-mcp)
  {
    id: "search-github-recent",
    label: "🔍 GitHub recent updates - REPO",
    template: "search recent updates and releases for repository on github.com",
  },
  {
    id: "search-stackoverflow-solutions",
    label: "💡 StackOverflow solutions - TECH",
    template: "search stackoverflow.com for solutions and best practices",
  },
  {
    id: "search-docs-official",
    label: "📚 Official documentation - FRAMEWORK",
    template: "search official documentation site:docs.* for framework guides",
  },
  {
    id: "search-reddit-discussions",
    label: "💬 Reddit discussions - TOPIC",
    template: "search reddit.com for community discussions and insights",
  },
  {
    id: "search-medium-articles",
    label: "📝 Medium articles - SUBJECT",
    template: "search medium.com for in-depth articles and tutorials",
  },
  {
    id: "search-devto-tutorials",
    label: "🎓 Dev.to tutorials - TECHNOLOGY",
    template: "search dev.to for developer tutorials and guides",
  },
  {
    id: "search-weekly-tech",
    label: "📅 Weekly tech updates - DOMAIN",
    template: "search latest weekly technology updates and news",
  },
  {
    id: "search-monthly-trends",
    label: "📊 Monthly tech trends - FIELD",
    template: "search monthly technology trends and market analysis",
  },

  // 🎯 Advanced JIRA Workflows
  {
    id: "epic-children-breakdown",
    label: "🎯 Epic children breakdown - EPIC-KEY",
    template:
      "Show detailed breakdown of all children and subtasks for epic EPIC-KEY with story points and time estimates",
  },
  {
    id: "project-hierarchy-full",
    label: "🏗️ Full project hierarchy - PROJECT",
    template:
      "Display complete project hierarchy with epics, stories, subtasks, and their relationships for project PROJECT",
  },
  {
    id: "board-sprint-analysis",
    label: "🏃‍♂️ Board sprint analysis - BOARD-ID",
    template:
      "Analyze all sprints on board BOARD-ID including velocity, completion rates, and capacity planning",
  },
  {
    id: "time-tracking-analysis",
    label: "⏱️ Time tracking analysis - PROJECT",
    template:
      "Analyze time tracking data including original estimates, time spent, and remaining work for project PROJECT",
  },
  {
    id: "story-points-velocity",
    label: "📊 Story points velocity - TEAM",
    template:
      "Calculate story points velocity and sprint capacity for team TEAM based on historical data",
  },

  // 🚀 DevOps & Development
  {
    id: "search-ci-cd-best-practices",
    label: "🔄 CI/CD best practices - 2024",
    template: "search CI/CD pipeline best practices and automation tools 2024",
  },
  {
    id: "search-docker-optimization",
    label: "🐳 Docker optimization - PERFORMANCE",
    template:
      "search Docker container optimization and performance tuning techniques",
  },
  {
    id: "search-kubernetes-patterns",
    label: "☸️ Kubernetes patterns - DEPLOYMENT",
    template: "search Kubernetes deployment patterns and best practices",
  },
  {
    id: "search-monitoring-tools",
    label: "📊 Monitoring tools comparison - APM",
    template:
      "search application performance monitoring tools comparison and recommendations",
  },
  {
    id: "search-security-practices",
    label: "🔒 Security practices - DEVSECOPS",
    template:
      "search DevSecOps security practices and vulnerability management",
  },

  // 🧠 AI & Machine Learning
  {
    id: "search-llm-integration",
    label: "🤖 LLM integration patterns - API",
    template:
      "search large language model integration patterns and API best practices",
  },
  {
    id: "search-ai-code-review",
    label: "🔍 AI code review tools - AUTOMATION",
    template: "search AI-powered code review tools and automation workflows",
  },
  {
    id: "search-ml-ops-pipeline",
    label: "🔬 MLOps pipeline - DEPLOYMENT",
    template:
      "search machine learning operations pipeline and model deployment strategies",
  },
  {
    id: "search-ai-testing-strategies",
    label: "🧪 AI testing strategies - QA",
    template:
      "search AI and machine learning testing strategies and quality assurance",
  },

  // 📱 Frontend & Mobile
  {
    id: "search-react-performance",
    label: "⚡ React performance - OPTIMIZATION",
    template:
      "search React performance optimization techniques and best practices",
  },
  {
    id: "search-mobile-development",
    label: "📱 Mobile development - CROSS-PLATFORM",
    template: "search cross-platform mobile development frameworks comparison",
  },
  {
    id: "search-web-accessibility",
    label: "♿ Web accessibility - WCAG",
    template:
      "search web accessibility guidelines and implementation best practices",
  },
  {
    id: "search-pwa-implementation",
    label: "📲 PWA implementation - FEATURES",
    template:
      "search progressive web app implementation and feature development",
  },
];
