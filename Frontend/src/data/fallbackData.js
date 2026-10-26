export const FALLBACK_STATUS = {
  status: 'ok',
  techStack: {
    frontend: 'React + Vite',
    ui: 'Tailwind CSS + shadcn/ui',
    backend: 'Node.js + Express',
    aiModel: 'Gemini API',
    mcpClient: 'Official MCP SDK',
    mcpServers: 'Google Workspace-compatible MCP servers + Tavily',
    authentication: 'Google OAuth 2.0',
    database: 'MongoDB'
  },
  mcpServers: {
    gmail: { name: 'gmail-mcp-server', tools: 6, status: 'active' },
    docs: { name: 'docs-mcp-server', tools: 5, status: 'active' },
    calendar: { name: 'calendar-mcp-server', tools: 3, status: 'active' },
    drive: { name: 'drive-mcp-server', tools: 4, status: 'active' },
    tavily: { name: 'tavily-mcp-server', tools: 1, status: 'active' },
    totalTools: 19
  },
  database: {
    connected: false,
    uri: 'mongodb+srv://***:***@cluster0.mongodb.net/mcp_workspace',
    database: 'mcp_workspace',
    mode: 'Resilient Local Storage (Active)'
  },
  approvals: {
    approvalsRequired: true,
    sensitiveTools: ['gmail_send_message', 'calendar_create_event', 'drive_share_file']
  },
  accountProfile: {
    authorized: true,
    mode: 'sandbox',
    email: 'afzal@workspace.ai',
    name: 'Afzal',
    picture: null,
    scopes: ['Gmail', 'Docs', 'Calendar', 'Drive', 'Tavily']
  },
  gmailMcpOption: {
    active: 'optionB',
    label: 'Option B: Custom Built Gmail MCP Server (Official MCP SDK & Gmail API)',
    choices: {
      optionA: 'Option A: Use an existing / maintained Gmail MCP server (StdioClientTransport)',
      optionB: 'Option B: Build our own Gmail MCP server (Official MCP SDK + Gmail API - Default & Recommended)'
    }
  },
  aiEngine: {
    model: 'gemini-2.0-flash',
    isLiveKeySet: false,
    currentEngine: 'Workspace Smart Planner'
  },
  googleWorkspace: {
    mode: 'sandbox',
    isLiveConfigured: false,
    hasOAuthConfig: true,
    clientId: '774081751810-iqsmip3cr5s509csgb1mlu8vi4pacgg0.apps.googleusercontent.com',
    redirectUri: 'http://localhost:3001/api/auth/google/callback',
    supportedServices: ['Gmail', 'Google Docs', 'Google Calendar', 'Google Drive', 'Tavily Search']
  }
};

export const FALLBACK_TOOLS = [
  { name: 'gmail_list_messages', description: 'List and filter recent messages in Gmail inbox', serverCategory: 'gmail', serverName: 'gmail-mcp-server' },
  { name: 'gmail_get_message', description: 'Retrieve complete content and headers of an email by ID', serverCategory: 'gmail', serverName: 'gmail-mcp-server' },
  { name: 'gmail_create_draft', description: 'Create a draft email in Gmail', serverCategory: 'gmail', serverName: 'gmail-mcp-server' },
  { name: 'gmail_send_message', description: 'Send an email to a recipient', serverCategory: 'gmail', serverName: 'gmail-mcp-server' },
  { name: 'docs_create_document', description: 'Create a new Google Document with initial title and content', serverCategory: 'docs', serverName: 'docs-mcp-server' },
  { name: 'docs_get_document', description: 'Retrieve title and formatted text of a Google Doc', serverCategory: 'docs', serverName: 'docs-mcp-server' },
  { name: 'docs_insert_text', description: 'Append or insert content into an existing Google Doc', serverCategory: 'docs', serverName: 'docs-mcp-server' },
  { name: 'calendar_list_events', description: 'List upcoming events and meetings on Google Calendar', serverCategory: 'calendar', serverName: 'calendar-mcp-server' },
  { name: 'calendar_create_event', description: 'Schedule a new event on Google Calendar', serverCategory: 'calendar', serverName: 'calendar-mcp-server' },
  { name: 'drive_list_files', description: 'Search and list files/folders in Google Drive', serverCategory: 'drive', serverName: 'drive-mcp-server' },
  { name: 'drive_create_folder', description: 'Create a new directory in Google Drive', serverCategory: 'drive', serverName: 'drive-mcp-server' },
  { name: 'drive_share_file', description: 'Share a Google Drive file with collaborator email', serverCategory: 'drive', serverName: 'drive-mcp-server' },
  { name: 'tavily_search', description: 'Execute live web research query using Tavily API', serverCategory: 'tavily', serverName: 'tavily-mcp-server' }
];

export const FALLBACK_EMAILS = [
  {
    id: 'msg_101',
    threadId: 'th_101',
    from: 'Elena Rostova <elena.rostova@ai-summit.org>',
    to: 'afzal@workspace.ai',
    subject: 'Upcoming AI Workshop & Hands-on Agenda',
    date: '2026-10-24T14:21:16.025Z',
    snippet: 'Hi Afzal! Following up on our workshop schedule for next week. Please prepare the initial workshop notes on Agentic AI and let me know if we need a sync tomorrow at 11 AM...',
    body: "Hi Afzal,\n\nFollowing up on our upcoming workshop on Agentic AI next week. We are expecting over 80 developers and product leads.\n\nCould you please prepare an initial document titled 'AI Workshop Notes' covering the core fundamentals of Agentic AI, autonomous tool execution, and MCP protocols? Also, let me know if we need a quick prep sync tomorrow at 11:00 AM.\n\nLooking forward to your notes!\n\nBest regards,\nElena Rostova\nHead of Developer Relations, AI Summit",
    labels: ['INBOX', 'IMPORTANT'],
    importance: 'High',
    isRead: false
  },
  {
    id: 'msg_102',
    threadId: 'th_102',
    from: 'Alex Rivera <alex.rivera@techcorp.io>',
    to: 'afzal@workspace.ai',
    subject: 'URGENT: Production Deployment Checklist & Security Audit',
    date: '2026-10-24T13:06:16.026Z',
    snippet: 'Team, we need all engineering leads to review the final checklist for the Q3 release before 4 PM today. Critical items: MCP server auth and API key rotation...',
    body: "Team,\n\nWe are gearing up for the v2.4 production deployment scheduled for this Thursday at 18:00 UTC.\n\nPlease review the final security audit checklist before 4 PM today:\n1. Verify MCP server token isolation and sandboxing\n2. Rotate external API credentials (Gemini, Tavily)\n3. Confirm database failover readiness\n\nIf any blockers arise, flag them in the #release channel immediately.\n\nThanks,\nAlex Rivera\nPrincipal Infrastructure Architect",
    labels: ['INBOX', 'IMPORTANT'],
    importance: 'High',
    isRead: false
  },
  {
    id: 'msg_103',
    threadId: 'th_103',
    from: 'Sarah Chen <sarah.chen@innovate.co>',
    to: 'afzal@workspace.ai',
    subject: 'Quarterly Budget Planning & Cloud Credits Allocation',
    date: '2026-10-23T09:06:16.026Z',
    snippet: 'Here is the summary draft for the Q4 infrastructure budget. We received an extra $25k in cloud credits for the new agentic AI workloads...',
    body: "Hi Afzal,\n\nGreat news! The cloud provider approved our application for an additional $25,000 in credits dedicated to our agentic workflows and LLM fine-tuning pilots.\n\nAttached in Drive is the breakdown. Please review the allocation across inference GPUs and vector databases before our financial sync on Wednesday.\n\nCheers,\nSarah Chen\nVP of Product & Strategy",
    labels: ['INBOX', 'FINANCE'],
    importance: 'High',
    isRead: true
  }
];

export const FALLBACK_DOCS = [
  {
    id: 'doc_201',
    documentId: 'doc_201',
    title: 'AI Workshop Notes & Hands-on Curriculum',
    content: "# AI Workshop Notes & Hands-on Curriculum\n\n## Workshop Context & Objectives\n- **Target Audience:** 80+ AI Engineers, Product Leads, and Solutions Architects\n- **Organizer:** Elena Rostova (Head of DevRel, AI Summit)\n- **Key Deliverable:** Comprehensive curriculum covering Agentic AI fundamentals, multi-application tool execution, and Model Context Protocol (MCP).\n\n---\n\n## 1. Fundamentals of Agentic AI\n- **Autonomous Goal Decomposition**: Breaking high-level user instructions into sequential tool invocations.\n- **Model Context Protocol (MCP)**: Standardized JSON-RPC 2.0 communication decoupling LLM clients from application APIs.\n- **Dynamic Tool Discovery**: Automatic capability discovery through MCP tool schemas.\n\n---\n\n## 2. Multi-Application Hands-on Workflow\n1. **Gmail Integration**: Read and triage incoming workshop attendee queries.\n2. **Google Docs Integration**: Programmatically generate agendas and technical notes.\n3. **Google Calendar Integration**: Automatically schedule review syncs and confirm attendee presence.\n\n---\n\n## Action Items & Next Steps\n- [x] Initial email triage completed via Gmail MCP Server\n- [x] Curriculum outline created via Google Docs MCP Server\n- [x] Prep sync scheduled on Google Calendar for tomorrow at 11:00 AM\n\n*Document created via MCP Multi-Application Workflow*",
    body: "Comprehensive curriculum covering Agentic AI fundamentals, multi-application tool execution, and Model Context Protocol (MCP).",
    wordCount: 165,
    modifiedTime: new Date().toISOString()
  },
  {
    id: 'doc_202',
    documentId: 'doc_202',
    title: 'Personal AI Workspace Architecture Guide',
    content: "# Personal AI Workspace Architecture Guide\n\n## Overview\nThis document outlines the core architecture of the MCP-Powered Personal AI Workspace. The workspace bridges cutting-edge LLMs (Google Gemini) with enterprise productivity applications (Gmail, Google Docs, Drive, Calendar) using the open Model Context Protocol (MCP).\n\n## Key Components\n1. **Model Context Protocol (MCP) Server**: Exposes standardized tools for querying and mutating external applications.\n2. **AI Agent Orchestrator**: Leverages Gemini's function calling to plan, invoke tools sequentially, and summarize outcomes.\n3. **Multi-Application Workflows**: Seamlessly moves data across Gmail, Docs, Drive, and Calendar in a single prompt.",
    body: "Architecture blueprint of the MCP-Powered Personal AI Workspace integrating Gemini with external Google Workspace productivity tools.",
    wordCount: 120,
    modifiedTime: new Date(Date.now() - 86400000).toISOString()
  }
];

export const FALLBACK_EVENTS = [
  {
    id: 'event_301',
    summary: 'AI Workshop Prep Sync with Elena Rostova',
    description: "Review agenda, confirm Google Docs curriculum notes, and finalize attendance list.",
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 90000000).toISOString(),
    location: 'Google Meet (meet.google.com/xyz-workshop-prep)',
    attendees: ['elena.rostova@ai-summit.org', 'afzal@workspace.ai'],
    status: 'confirmed'
  },
  {
    id: 'event_302',
    summary: 'Architecture Review & MCP Tool Security Gate',
    description: "Review MCP server token isolation, human-in-the-loop approvals, and external API rate limits.",
    start: new Date(Date.now() + 172800000).toISOString(),
    end: new Date(Date.now() + 176400000).toISOString(),
    location: 'Conference Room 4B / Google Meet',
    attendees: ['alex.rivera@techcorp.io', 'afzal@workspace.ai'],
    status: 'confirmed'
  }
];

export const FALLBACK_DRIVE_FILES = [
  {
    id: 'file_401',
    name: 'AI Workshop Notes & Hands-on Curriculum',
    mimeType: 'application/vnd.google-apps.document',
    webViewLink: 'https://docs.google.com/document/d/doc_201/edit',
    modifiedTime: new Date().toISOString(),
    size: '14 KB',
    shared: true,
    sharedWith: ['elena.rostova@ai-summit.org']
  },
  {
    id: 'file_402',
    name: 'Personal AI Workspace Architecture Guide',
    mimeType: 'application/vnd.google-apps.document',
    webViewLink: 'https://docs.google.com/document/d/doc_202/edit',
    modifiedTime: new Date(Date.now() - 86400000).toISOString(),
    size: '22 KB',
    shared: false,
    sharedWith: []
  },
  {
    id: 'file_403',
    name: 'System Architecture Diagram (MCP Stack).png',
    mimeType: 'image/png',
    webViewLink: '#',
    modifiedTime: new Date(Date.now() - 172800000).toISOString(),
    size: '420 KB',
    shared: true,
    sharedWith: ['alex.rivera@techcorp.io']
  }
];
