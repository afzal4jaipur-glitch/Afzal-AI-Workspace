import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'sandbox_data.json');

const INITIAL_EMAILS = [
  {
    id: "msg_101",
    threadId: "th_101",
    from: "Elena Rostova <elena.rostova@ai-summit.org>",
    to: "me@workspace.ai",
    subject: "Upcoming AI Workshop & Hands-on Agenda",
    date: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    snippet: "Hi! Following up on our workshop schedule for next week. Please prepare the initial workshop notes on Agentic AI and let me know if we need a sync tomorrow at 11 AM...",
    body: `Hi there,

Following up on our upcoming workshop on Agentic AI next week. We are expecting over 80 developers and product leads. 

Could you please prepare an initial document titled 'AI Workshop Notes' covering the core fundamentals of Agentic AI, autonomous tool execution, and MCP protocols? Also, let me know if we need a quick prep sync tomorrow at 11:00 AM.

Looking forward to your notes!

Best regards,
Elena Rostova
Head of Developer Relations, AI Summit`,
    labels: ["INBOX", "IMPORTANT"],
    importance: "High",
    isRead: false
  },
  {
    id: "msg_102",
    threadId: "th_102",
    from: "Alex Rivera <alex.rivera@techcorp.io>",
    to: "me@workspace.ai",
    subject: "URGENT: Production Deployment Checklist & Security Audit",
    date: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    snippet: "Team, we need all engineering leads to review the final checklist for the Q3 release before 4 PM today. Critical items: MCP server auth and API key rotation...",
    body: `Team,

We are gearing up for the v2.4 production deployment scheduled for this Thursday at 18:00 UTC. 

Please review the final security audit checklist before 4 PM today:
1. Verify MCP server token isolation and sandboxing
2. Rotate external API credentials (Gemini, Tavily)
3. Confirm database failover readiness

If any blockers arise, flag them in the #release channel immediately.

Thanks,
Alex Rivera
Principal Infrastructure Architect`,
    labels: ["INBOX", "IMPORTANT"],
    importance: "High",
    isRead: false
  },
  {
    id: "msg_103",
    threadId: "th_103",
    from: "Sarah Chen <sarah.chen@innovate.co>",
    to: "me@workspace.ai",
    subject: "Quarterly Budget Planning & Cloud Credits Allocation",
    date: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    snippet: "Here is the summary draft for the Q4 infrastructure budget. We received an extra $25k in cloud credits for the new agentic AI workloads...",
    body: `Hi,

Great news! The cloud provider approved our application for an additional $25,000 in credits dedicated to our agentic workflows and LLM fine-tuning pilots.

Attached in Drive is the breakdown. Please review the allocation across inference GPUs and vector databases before our financial sync on Wednesday.

Cheers,
Sarah Chen
VP of Product & Strategy`,
    labels: ["INBOX", "FINANCE"],
    importance: "High",
    isRead: true
  },
  {
    id: "msg_104",
    threadId: "th_104",
    from: "GitHub Notifications <notifications@github.com>",
    to: "me@workspace.ai",
    subject: "[modelcontextprotocol/sdk] New release v1.4.0 published",
    date: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
    snippet: "Release v1.4.0 includes enhanced schema validation, stdio streaming improvements, and native error boundaries for client tools...",
    body: `modelcontextprotocol / sdk v1.4.0 is now live.

Key highlights:
- Enhanced JSON Schema validation for tool parameter parsing
- Zero-copy stream decoding for faster tool execution
- Native support for dynamic tool registration during session handshake

View full release notes on GitHub.`,
    labels: ["INBOX", "UPDATES"],
    importance: "Normal",
    isRead: true
  },
  {
    id: "msg_105",
    threadId: "th_105",
    from: "Google Cloud Support <cloud-noreply@google.com>",
    to: "me@workspace.ai",
    subject: "Monthly Billing Statement & API Quotas Summary",
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // 30 hours ago
    snippet: "Your monthly invoice for Google Workspace and Cloud APIs is now available. Total usage remains well within the tier...",
    body: `Hello Workspace Admin,

Your Google Cloud & Workspace invoice for the previous billing cycle is ready.

Current Summary:
- Gmail API Requests: 4,820 / 1,000,000 quota
- Google Docs API Requests: 1,350 / 500,000 quota
- Total Charge: $0.00 (within free promotional credits)

Access your billing dashboard at console.cloud.google.com/billing.`,
    labels: ["INBOX", "BILLING"],
    importance: "Normal",
    isRead: true
  },
  {
    id: "msg_106",
    threadId: "th_106",
    from: "Marcus Brody <m.brody@ventures.com>",
    to: "me@workspace.ai",
    subject: "Coffee chat / Partnership discussion next week?",
    date: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    snippet: "Great meeting you at the meetup. Would love to grab 15 minutes next week to explore how we can collaborate...",
    body: `Hi,

It was really insightful hearing your perspective on agentic workflows and MCP servers at the developer meetup last week.

If you have 15-20 minutes sometime next Tuesday or Thursday, I'd love to buy you coffee and discuss how we might collaborate on upcoming AI initiatives.

Best,
Marcus`,
    labels: ["INBOX"],
    importance: "Low",
    isRead: true
  }
];

const INITIAL_DOCS = [
  {
    documentId: "doc_workspace_guidelines_001",
    title: "Personal AI Workspace Architecture Guide",
    createdTime: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    content: `# Personal AI Workspace Architecture Guide

## Overview
This document outlines the core architecture of the MCP-Powered Personal AI Workspace. The workspace bridges cutting-edge LLMs (Google Gemini) with enterprise productivity applications (Gmail, Google Docs, Drive, Calendar) using the open Model Context Protocol (MCP).

## Key Components
1. **Model Context Protocol (MCP) Server**: Exposes standardized tools for querying and mutating external applications.
2. **AI Agent Orchestrator**: Leverages Gemini's function calling to plan, invoke tools sequentially, and summarize outcomes.
3. **Multi-Application Workflows**: Seamlessly moves data across Gmail, Docs, Drive, and Calendar in a single prompt.

## Next Steps
- Implement Gmail and Google Docs automation
- Integrate Google Calendar and Drive
- Connect Tavily web search for real-time external intelligence`
  }
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrow10am = new Date(tomorrow);
tomorrow10am.setHours(10, 0, 0, 0);
const tomorrow1030am = new Date(tomorrow);
tomorrow1030am.setHours(10, 30, 0, 0);

const wednesday = new Date();
wednesday.setDate(wednesday.getDate() + ((3 - wednesday.getDay() + 7) % 7 || 7));
const wednesday2pm = new Date(wednesday);
wednesday2pm.setHours(14, 0, 0, 0);
const wednesday3pm = new Date(wednesday);
wednesday3pm.setHours(15, 0, 0, 0);

const INITIAL_EVENTS = [
  {
    id: "cal_evt_101",
    summary: "Weekly Engineering Architecture Standup",
    description: "Weekly engineering leads sync to review system architecture, security checklist, and releases.",
    start: tomorrow10am.toISOString(),
    end: tomorrow1030am.toISOString(),
    location: "Google Meet (meet.google.com/xyz-arch-leads)",
    attendees: ["alex.rivera@techcorp.io", "me@workspace.ai"],
    status: "confirmed"
  },
  {
    id: "cal_evt_102",
    summary: "Q4 Cloud Budget & Credits Review",
    description: "Financial review with Sarah on cloud credits allocation for agentic AI workloads.",
    start: wednesday2pm.toISOString(),
    end: wednesday3pm.toISOString(),
    location: "Conference Room B / Google Meet",
    attendees: ["sarah.chen@innovate.co", "me@workspace.ai"],
    status: "confirmed"
  }
];

const INITIAL_DRIVE_FILES = [
  {
    id: "folder_ai_summit",
    name: "AI Summit & Workshop Resources",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    size: "-",
    shared: true,
    sharedWith: ["elena.rostova@ai-summit.org"],
    webViewLink: "https://drive.google.com/drive/folders/folder_ai_summit"
  },
  {
    id: "folder_engineering",
    name: "Production Architecture & Specifications",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    size: "-",
    shared: true,
    sharedWith: ["alex.rivera@techcorp.io"],
    webViewLink: "https://drive.google.com/drive/folders/folder_engineering"
  },
  {
    id: "file_drive_101",
    name: "Agentic AI Workshop Syllabus.gslides",
    mimeType: "application/vnd.google-apps.presentation",
    parentFolderId: "folder_ai_summit",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    size: "2.4 MB",
    shared: true,
    sharedWith: ["elena.rostova@ai-summit.org"],
    webViewLink: "https://docs.google.com/presentation/d/file_drive_101/edit"
  },
  {
    id: "file_drive_102",
    name: "Q3 Release Security Audit.gdoc",
    mimeType: "application/vnd.google-apps.document",
    parentFolderId: "folder_engineering",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    size: "145 KB",
    shared: true,
    sharedWith: ["alex.rivera@techcorp.io"],
    webViewLink: "https://docs.google.com/document/d/file_drive_102/edit"
  },
  {
    id: "file_drive_103",
    name: "Q4 Infrastructure Budget.gsheet",
    mimeType: "application/vnd.google-apps.spreadsheet",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    size: "520 KB",
    shared: true,
    sharedWith: ["sarah.chen@innovate.co"],
    webViewLink: "https://docs.google.com/spreadsheets/d/file_drive_103/edit"
  }
];

class SandboxStore {
  constructor() {
    this.emails = [];
    this.docs = [];
    this.drafts = [];
    this.events = [];
    this.driveFiles = [];
    this.traceLogs = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.emails = data.emails || [...INITIAL_EMAILS];
        this.docs = data.docs || [...INITIAL_DOCS];
        this.drafts = data.drafts || [];
        this.events = data.events || [...INITIAL_EVENTS];
        this.driveFiles = data.driveFiles || [...INITIAL_DRIVE_FILES];
      } else {
        this.reset();
      }
    } catch (err) {
      console.warn('Failed to load sandbox data file, using defaults in-memory:', err.message);
      this.emails = [...INITIAL_EMAILS];
      this.docs = [...INITIAL_DOCS];
      this.drafts = [];
      this.events = [...INITIAL_EVENTS];
      this.driveFiles = [...INITIAL_DRIVE_FILES];
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify({
        emails: this.emails,
        docs: this.docs,
        drafts: this.drafts,
        events: this.events,
        driveFiles: this.driveFiles
      }, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save sandbox data:', err.message);
    }
  }

  reset() {
    this.emails = JSON.parse(JSON.stringify(INITIAL_EMAILS));
    this.docs = JSON.parse(JSON.stringify(INITIAL_DOCS));
    this.events = JSON.parse(JSON.stringify(INITIAL_EVENTS));
    this.driveFiles = JSON.parse(JSON.stringify(INITIAL_DRIVE_FILES));
    this.drafts = [];
    this.save();
    return { success: true, message: 'Sandbox data reset to factory initial state' };
  }

  // --- Gmail Tools Implementations ---
  listMessages({ maxResults = 5, q = '', labelIds = [] } = {}) {
    let results = [...this.emails];

    if (q) {
      const query = q.toLowerCase();
      results = results.filter(e =>
        e.subject.toLowerCase().includes(query) ||
        e.from.toLowerCase().includes(query) ||
        e.body.toLowerCase().includes(query) ||
        e.snippet.toLowerCase().includes(query)
      );
    }

    if (labelIds && labelIds.length > 0) {
      results = results.filter(e =>
        labelIds.some(label => e.labels.includes(label))
      );
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    const sliced = results.slice(0, Number(maxResults) || 5);

    return {
      messages: sliced.map(m => ({
        id: m.id,
        threadId: m.threadId,
        from: m.from,
        to: m.to,
        subject: m.subject,
        snippet: m.snippet,
        date: m.date,
        labels: m.labels,
        importance: m.importance,
        isRead: m.isRead
      })),
      resultSizeEstimate: results.length,
      nextPageToken: null
    };
  }

  getMessage(id) {
    const msg = this.emails.find(e => e.id === id);
    if (!msg) {
      throw new Error(`Email with ID '${id}' not found`);
    }
    msg.isRead = true;
    this.save();
    return msg;
  }

  searchMessages({ query = '', maxResults = 10 } = {}) {
    return this.listMessages({ q: query, maxResults });
  }

  createDraft({ to, subject, body }) {
    const draftId = `draft_${Date.now()}`;
    const newDraft = {
      id: draftId,
      message: {
        id: `msg_draft_${Date.now()}`,
        to: to || '',
        subject: subject || '(No Subject)',
        body: body || '',
        date: new Date().toISOString(),
        labels: ['DRAFT']
      }
    };
    this.drafts.unshift(newDraft);
    this.save();
    return {
      id: draftId,
      status: 'DRAFT_CREATED',
      to,
      subject,
      snippet: (body || '').slice(0, 100) + '...',
      createdTime: newDraft.message.date
    };
  }

  sendMessage({ to, subject, body }) {
    const msgId = `msg_sent_${Date.now()}`;
    const sentMsg = {
      id: msgId,
      threadId: `th_${Date.now()}`,
      from: "me@workspace.ai",
      to,
      subject,
      snippet: (body || '').slice(0, 100) + '...',
      body,
      date: new Date().toISOString(),
      labels: ['SENT'],
      importance: 'Normal',
      isRead: true
    };
    this.emails.unshift(sentMsg);
    this.save();
    return {
      id: msgId,
      status: 'SENT',
      to,
      subject,
      date: sentMsg.date
    };
  }

  // --- Google Docs Tools Implementations ---
  createDocument({ title, content = '' }) {
    const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDoc = {
      documentId: docId,
      title: title || 'Untitled Document',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      content: content || `# ${title}\n\n*Created via Google Docs MCP integration*\n`
    };
    this.docs.unshift(newDoc);
    this.save();
    return {
      documentId: docId,
      title: newDoc.title,
      wordCount: newDoc.content.split(/\s+/).filter(Boolean).length,
      createdTime: newDoc.createdTime,
      url: `https://docs.google.com/document/d/${docId}/edit`,
      status: 'SUCCESS'
    };
  }

  getDocument(documentId) {
    const doc = this.docs.find(d => d.documentId === documentId);
    if (!doc) {
      throw new Error(`Google Doc with ID '${documentId}' not found`);
    }
    return {
      documentId: doc.documentId,
      title: doc.title,
      content: doc.content,
      createdTime: doc.createdTime,
      modifiedTime: doc.modifiedTime,
      wordCount: doc.content.split(/\s+/).filter(Boolean).length
    };
  }

  insertText({ documentId, text, index }) {
    const doc = this.docs.find(d => d.documentId === documentId);
    if (!doc) {
      throw new Error(`Google Doc with ID '${documentId}' not found`);
    }
    if (index !== undefined && index >= 0 && index < doc.content.length) {
      doc.content = doc.content.slice(0, index) + '\n' + text + doc.content.slice(index);
    } else {
      doc.content = doc.content + '\n\n' + text;
    }
    doc.modifiedTime = new Date().toISOString();
    this.save();
    return {
      documentId: doc.documentId,
      title: doc.title,
      status: 'TEXT_INSERTED',
      charactersAdded: text.length,
      wordCount: doc.content.split(/\s+/).filter(Boolean).length,
      modifiedTime: doc.modifiedTime
    };
  }

  updateDocument({ documentId, title, content }) {
    const doc = this.docs.find(d => d.documentId === documentId);
    if (!doc) {
      throw new Error(`Google Doc with ID '${documentId}' not found`);
    }
    if (title) doc.title = title;
    if (content !== undefined) doc.content = content;
    doc.modifiedTime = new Date().toISOString();
    this.save();
    return {
      documentId: doc.documentId,
      title: doc.title,
      status: 'DOCUMENT_UPDATED',
      wordCount: doc.content.split(/\s+/).filter(Boolean).length,
      modifiedTime: doc.modifiedTime
    };
  }

  listDocuments({ pageSize = 20 } = {}) {
    const list = this.docs.slice(0, Number(pageSize) || 20).map(d => ({
      documentId: d.documentId,
      id: d.documentId,
      title: d.title,
      createdTime: d.createdTime,
      modifiedTime: d.modifiedTime,
      wordCount: (d.content || '').split(/\s+/).filter(Boolean).length,
      snippet: (d.content || '').slice(0, 140).replace(/[#*`]/g, '') + '...',
      content: d.content || '',
      body: d.content || ''
    }));
    return {
      documents: list,
      totalCount: this.docs.length
    };
  }

  // --- Google Calendar Tools Implementations ---
  listEvents({ maxResults = 10, timeMin, timeMax, query = '' } = {}) {
    let results = [...this.events];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(e =>
        (e.summary && e.summary.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      );
    }

    if (timeMin) {
      const minDate = new Date(timeMin);
      results = results.filter(e => new Date(e.start) >= minDate);
    }

    if (timeMax) {
      const maxDate = new Date(timeMax);
      results = results.filter(e => new Date(e.start) <= maxDate);
    }

    // Sort chronologically
    results.sort((a, b) => new Date(a.start) - new Date(b.start));
    const sliced = results.slice(0, Number(maxResults) || 10);

    return {
      events: sliced,
      totalCount: results.length
    };
  }

  createEvent({ summary, description = '', start, end, attendees = [], location = '' }) {
    const eventId = `cal_evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Auto default dates if missing or relative
    const startDate = start ? new Date(start) : new Date(Date.now() + 1000 * 60 * 60 * 24);
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 1000 * 60 * 60);

    const newEvent = {
      id: eventId,
      summary: summary || 'New Scheduled Meeting',
      description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: location || 'Google Meet',
      attendees: Array.isArray(attendees) ? attendees : [attendees].filter(Boolean),
      status: 'confirmed',
      createdTime: new Date().toISOString()
    };

    this.events.push(newEvent);
    this.save();

    return {
      id: eventId,
      status: 'EVENT_CREATED',
      summary: newEvent.summary,
      start: newEvent.start,
      end: newEvent.end,
      attendees: newEvent.attendees,
      location: newEvent.location,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`
    };
  }

  getEvent(eventId) {
    const evt = this.events.find(e => e.id === eventId);
    if (!evt) {
      throw new Error(`Calendar event with ID '${eventId}' not found`);
    }
    return evt;
  }

  // --- Google Drive Tools Implementations ---
  listDriveFiles({ query = '', pageSize = 20, mimeType = '' } = {}) {
    let files = [...this.driveFiles];
    if (query) {
      const q = query.toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q));
    }
    if (mimeType) {
      files = files.filter(f => f.mimeType === mimeType);
    }
    return files.slice(0, pageSize);
  }

  getDriveFile(fileId) {
    const file = this.driveFiles.find(f => f.id === fileId);
    if (!file) {
      throw new Error(`Drive file with ID '${fileId}' not found`);
    }
    return file;
  }

  createDriveFolder(name, parentFolderId = null) {
    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newFolder = {
      id: folderId,
      name: name || 'New Folder',
      mimeType: 'application/vnd.google-apps.folder',
      parentFolderId,
      modifiedTime: new Date().toISOString(),
      size: '-',
      shared: false,
      sharedWith: [],
      webViewLink: `https://drive.google.com/drive/folders/${folderId}`
    };
    this.driveFiles.unshift(newFolder);
    this.save();
    return newFolder;
  }

  shareDriveFile(fileId, email, role = 'reader') {
    const file = this.getDriveFile(fileId);
    if (!file.sharedWith) file.sharedWith = [];
    if (!file.sharedWith.includes(email)) {
      file.sharedWith.push(email);
    }
    file.shared = true;
    file.lastSharedRole = role;
    this.save();
    return {
      id: file.id,
      name: file.name,
      sharedWith: file.sharedWith,
      role,
      status: 'FILE_SHARED',
      webViewLink: file.webViewLink
    };
  }

  // --- Trace Logging ---
  addTraceLog(entry) {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.traceLogs.unshift(log);
    if (this.traceLogs.length > 100) this.traceLogs.pop();
    return log;
  }

  getTraceLogs(limit = 30) {
    return this.traceLogs.slice(0, limit);
  }

  clearTraceLogs() {
    this.traceLogs = [];
  }
}

export const sandboxStore = new SandboxStore();
