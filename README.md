# 🚀 MCP-Powered Personal AI Workspace

A unified Personal AI Workspace connecting **Google Gemini** with external applications (**Gmail**, **Google Docs**, **Google Calendar**, **Google Drive**, and **Tavily Web Search**) using the open standard **Model Context Protocol (MCP)**.

---

## 🗺️ Implementation Roadmap: 7-Phase Execution

| Phase | Implementation | Outcome | Status | Details |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Google Cloud project + OAuth** | Authorized Google account access | ✅ Complete | Browser OAuth 2.0 consent flow (`/api/auth/google/*`) with full workspace scopes + instant resilient sandbox fallback |
| **2** | **Connect a Gmail MCP server** | Read and search real emails | ✅ Complete | Modular Gmail server (`gmail_search_messages`, `gmail_read_message`, `gmail_create_draft`, `gmail_send_message`) |
| **3** | **Connect a Google Docs MCP server** | Create real Google Docs | ✅ Complete | Modular Docs server (`docs_create_document`, `docs_insert_text`, `docs_get_document`, `docs_update_document`) |
| **4** | **Connect Gemini to MCP tools** | Natural-language tool selection | ✅ Complete | Gemini 2.0 function declarations + autonomous multi-turn tool calling loop |
| **5** | **Build React interface** | Interactive AI workspace | ✅ Complete | React + Vite + Tailwind CSS + shadcn/ui dark-mode interface with live explorer tabs and real-time execution trace |
| **6** | **Add Calendar and Drive** | Multi-application workflows | ✅ Complete | Calendar (`calendar_create_event`) and Drive (`drive_create_folder`, `drive_share_file`, `drive_list_files`) servers for cross-app orchestration |
| **7** | **Add execution history and approvals** | Reliable, demonstrable automation | ✅ Complete | Permanent audit trail in MongoDB/local store + Human-in-the-Loop interactive approval gates for sensitive operations |

---

## 🏛️ System Architecture

```
                   REACT + VITE FRONTEND (:3001)
                     (Tailwind CSS + shadcn/ui)
                                │
                         User Instruction
                                │
                                ▼
                       EXPRESS BACKEND (:3001)
                                │
                                ▼
                GEMINI LLM (Planning + Reasoning)
                                │
                                ▼
                  HUMAN-IN-THE-LOOP APPROVAL GATE
                    (Phase 7: Sensitive Actions)
                                │
                                ▼
                       OFFICIAL MCP CLIENT
                                │
    ┌───────────┬───────────────┼───────────────┬───────────┐
    ▼           ▼               ▼               ▼           ▼
Gmail MCP   Docs MCP      Calendar MCP     Drive MCP   Tavily MCP
 Server      Server          Server          Server      Server
    │           │               │               │           │
    ▼           ▼               ▼               ▼           ▼
Gmail API   Docs API      Calendar API     Drive API   Tavily API
(OAuth 2.0) (OAuth 2.0)   (OAuth 2.0)     (OAuth 2.0)  (Web Intel)
    │           │               │               │
    └───────────┴───────────────┴───────────────┘
                                │
                                ▼
                     MONGODB DATABASE & AUDIT
```

---

## 🛠️ 19 Registered MCP Tools

1. **Gmail MCP Server (`gmail-mcp-server`)**
   - `gmail_search_messages`: Search messages matching query terms.
   - `gmail_read_message`: Read full email body, sender, and headers.
   - `gmail_list_messages`: Retrieve recent inbox messages.
   - `gmail_get_message`: Retrieve email metadata.
   - `gmail_create_draft`: Compose email drafts.
   - `gmail_send_message`: Send emails directly.

2. **Google Docs MCP Server (`docs-mcp-server`)**
   - `docs_create_document`: Create structured documents with markdown.
   - `docs_insert_text`: Append or insert text at indices.
   - `docs_get_document`: Retrieve document body and structure.
   - `docs_update_document`: Edit document body or title.
   - `docs_list_documents`: List recent documents in workspace.

3. **Google Calendar MCP Server (`calendar-mcp-server`)**
   - `calendar_list_events`: List upcoming events and check availability.
   - `calendar_create_event`: Schedule meetings with attendees and Meet links.
   - `calendar_get_event`: Fetch details of specific calendar events.

4. **Google Drive MCP Server (`drive-mcp-server`)**
   - `drive_list_files`: Search and list files/folders in Google Drive.
   - `drive_get_file_metadata`: Fetch file details, permissions, and links.
   - `drive_create_folder`: Create organized project folders.
   - `drive_share_file`: Share documents or folders with collaborator emails.

5. **Tavily Search MCP Server (`tavily-mcp-server`)**
   - `tavily_search`: Real-time web intelligence and documentation search.

---

## 🎯 Demonstrations & Automation Workflows

- **DEMO 1 (Gmail Assistant)**: Retrieve and summarize 5 latest emails.
- **DEMO 2 (Google Docs)**: Generate Agentic AI notes and save to Google Docs.
- **DEMO 3 (Multi-App Workflow)**: Find workshop email ➔ create Google Docs curriculum ➔ schedule Google Calendar sync.
- **DEMO 4 (Drive + Approval)**: Share Google Drive files with collaborators with interactive Human-in-the-Loop confirmation card.
- **Web Intelligence**: Search web via Tavily MCP server.

---

## 🚀 Running the Project

```bash
# 1. Start Backend (Runs on http://localhost:3001)
cd Backend
npm install
npm start

# 2. Start Frontend (Optional: Vite Dev Server on http://localhost:5173)
cd ../Frontend
npm install
npm run dev
```
Open **`http://localhost:3001`** in your browser.
