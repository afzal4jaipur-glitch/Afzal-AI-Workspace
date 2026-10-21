import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import fs from 'fs';

import { initMcpClient, listTools, callTool, getGmailOption, setGmailOption } from './mcp/client.js';
import { executeAgentWorkflow, setApiKey, setModel, getApiKey, getModel } from './agent/geminiAgent.js';
import { googleService } from './services/googleService.js';
import { sandboxStore } from './services/sandboxStore.js';
import { dbManager } from './db/mongoClient.js';
import { historyService } from './services/historyService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../../Frontend/dist');
const FRONTEND_DIR = fs.existsSync(DIST_DIR) ? DIST_DIR : path.resolve(__dirname, '../../Frontend');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve Frontend static assets
app.use(express.static(FRONTEND_DIR));

// --- API Endpoints ---

// 1. Status & Configuration
app.get('/api/status', async (req, res) => {
  try {
    const tools = await listTools();
    const apiKey = getApiKey();
    const hasKey = Boolean(apiKey && apiKey.trim().length > 10);
    const mode = googleService.getMode();
    const isLiveConfigured = googleService.isLiveConfigured();

    const gmailTools = tools.filter(t => t.name.startsWith('gmail_'));
    const docsTools = tools.filter(t => t.name.startsWith('docs_'));
    const calTools = tools.filter(t => t.name.startsWith('calendar_'));
    const driveTools = tools.filter(t => t.name.startsWith('drive_'));
    const tavilyTools = tools.filter(t => t.name.startsWith('tavily_'));
    const profile = await googleService.getAccountProfile();

    res.json({
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
        gmail: { name: 'gmail-mcp-server', tools: gmailTools.length, status: 'active' },
        docs: { name: 'docs-mcp-server', tools: docsTools.length, status: 'active' },
        calendar: { name: 'calendar-mcp-server', tools: calTools.length, status: 'active' },
        drive: { name: 'drive-mcp-server', tools: driveTools.length, status: 'active' },
        tavily: { name: 'tavily-mcp-server', tools: tavilyTools.length, status: 'active' },
        totalTools: tools.length
      },
      database: dbManager.getStatus(),
      approvals: historyService.getApprovalsConfig(),
      accountProfile: profile,
      gmailMcpOption: getGmailOption(),
      aiEngine: {
        model: getModel(),
        isLiveKeySet: hasKey,
        currentEngine: hasKey ? `Gemini Live (${getModel()})` : 'Workspace Smart Planner'
      },
      googleWorkspace: {
        mode,
        isLiveConfigured,
        supportedServices: ['Gmail', 'Google Docs', 'Google Calendar', 'Google Drive', 'Tavily Search']
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Discover MCP Tools
app.get('/api/tools', async (req, res) => {
  try {
    const tools = await listTools();
    res.json({ tools });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. AI Agent Chat & Multi-Step Execution
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, bypassApproval } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    const result = await executeAgentWorkflow(message, history || [], Boolean(bypassApproval));
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Gmail Explorer APIs
app.get('/api/gmail/messages', async (req, res) => {
  try {
    const { maxResults, q } = req.query;
    const result = await googleService.listMessages({
      maxResults: Number(maxResults) || 10,
      q: q || ''
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gmail/messages/:id', async (req, res) => {
  try {
    const msg = await googleService.getMessage(req.params.id);
    res.json(msg);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/gmail/draft', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const result = await callTool('gmail_create_draft', { to, subject, body });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Google Docs Explorer APIs
app.get(['/api/docs', '/api/docs/documents'], async (req, res) => {
  try {
    const result = await googleService.listDocuments({ pageSize: 20 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/docs/:id', async (req, res) => {
  try {
    const doc = await googleService.getDocument(req.params.id);
    res.json(doc);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/docs', async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await callTool('docs_create_document', { title, content });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Google Calendar Explorer APIs
app.get('/api/calendar/events', async (req, res) => {
  try {
    const { maxResults, timeMin, timeMax, query } = req.query;
    const result = await googleService.listEvents({
      maxResults: Number(maxResults) || 15,
      timeMin,
      timeMax,
      query
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  try {
    const result = await callTool('calendar_create_event', req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calendar/events/:id', async (req, res) => {
  try {
    const event = await googleService.getEvent(req.params.id);
    res.json(event);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 7. Trace Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs: sandboxStore.getTraceLogs(50) });
});

app.post('/api/logs/clear', (req, res) => {
  sandboxStore.clearTraceLogs();
  res.json({ success: true });
});

// 7. Settings Update
app.post('/api/settings', (req, res) => {
  const { geminiApiKey, model, mode } = req.body;
  if (geminiApiKey !== undefined) {
    setApiKey(geminiApiKey);
  }
  if (model) {
    setModel(model);
  }
  if (mode) {
    googleService.setMode(mode);
  }
  res.json({
    success: true,
    apiKeyConfigured: Boolean(getApiKey() && getApiKey().length > 10),
    model: getModel(),
    mode: googleService.getMode()
  });
});

// 8. Sandbox Reset
app.post('/api/reset-sandbox', (req, res) => {
  const result = sandboxStore.reset();
  res.json(result);
});

// --- Phase 1: Google OAuth 2.0 Endpoints ---
app.get('/api/auth/google/url', (req, res) => {
  try {
    const { clientId, clientSecret, scopeLevel, returnTo } = req.query;
    const origin = returnTo || req.headers.referer || 'http://localhost:3001';
    const state = Buffer.from(JSON.stringify({ returnTo: origin })).toString('base64');
    const url = googleService.generateAuthUrl(clientId, clientSecret, undefined, scopeLevel || 'initial', state);
    res.json({ url, scopeLevel: scopeLevel || 'initial' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Phase 2: Gmail MCP Server Choice (Option A vs Option B) ---
app.get('/api/mcp/gmail-option', (req, res) => {
  res.json(getGmailOption());
});

app.post('/api/mcp/gmail-option', async (req, res) => {
  try {
    const { option } = req.body;
    const result = await setGmailOption(option);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  let returnBase = '/';
  try {
    const { code, state } = req.query;
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        if (parsed.returnTo) {
          const u = new URL(parsed.returnTo);
          returnBase = `${u.origin}/`;
        }
      } catch (e) {}
    }

    if (!code) {
      return res.redirect(`${returnBase}?auth=error&message=No+code+provided`);
    }

    const authResult = await googleService.handleOAuthCallback(code);
    const email = authResult.profile?.email || '';
    const name = authResult.profile?.name || '';
    res.redirect(`${returnBase}?auth=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  } catch (err) {
    res.redirect(`${returnBase}?auth=error&message=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/auth/google/profile', async (req, res) => {
  try {
    const profile = await googleService.getAccountProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google/signout', async (req, res) => {
  try {
    const result = await googleService.signOut();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google/demo-login', (req, res) => {
  try {
    const result = googleService.setDemoLogin(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google/credentials', (req, res) => {
  try {
    const { clientId, clientSecret, refreshToken } = req.body;
    if (clientId) process.env.GOOGLE_CLIENT_ID = clientId;
    if (clientSecret) process.env.GOOGLE_CLIENT_SECRET = clientSecret;
    if (refreshToken) process.env.GOOGLE_REFRESH_TOKEN = refreshToken;

    // Safely persist to Backend/.env file
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        const updateVar = (key, val) => {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${val}`);
          } else {
            envContent += `\n${key}=${val}`;
          }
        };
        if (clientId) updateVar('GOOGLE_CLIENT_ID', clientId);
        if (clientSecret) updateVar('GOOGLE_CLIENT_SECRET', clientSecret);
        if (refreshToken) updateVar('GOOGLE_REFRESH_TOKEN', refreshToken);
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      }
    } catch (e) {
      console.warn('[Credentials] Failed saving to .env:', e.message);
    }

    googleService.initAuth();
    res.json({
      success: true,
      configured: googleService.isLiveConfigured(),
      mode: googleService.getMode()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Phase 6: Google Drive Endpoints ---
app.get('/api/drive/files', async (req, res) => {
  try {
    const { query, mimeType, pageSize } = req.query;
    const files = await googleService.listDriveFiles({
      query,
      mimeType,
      pageSize: Number(pageSize) || 20
    });
    res.json({ files, count: files.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/folder', async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;
    const folder = await callTool('drive_create_folder', { name, parentFolderId });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/share', async (req, res) => {
  try {
    const { fileId, email, role } = req.body;
    const result = await callTool('drive_share_file', { fileId, email, role: role || 'reader' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Phase 7: Execution History & Human Approvals Endpoints ---
app.get('/api/history', (req, res) => {
  try {
    const { limit, status } = req.query;
    const history = historyService.getHistory({
      limit: Number(limit) || 50,
      status: status || null
    });
    res.json({ history, total: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    const result = historyService.clearHistory();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approvals/pending', (req, res) => {
  try {
    const pending = historyService.getPendingApprovals();
    res.json({ pending, count: pending.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'approve' or 'reject'" });
    }

    const record = historyService.getPendingApproval(id);
    if (!record) {
      return res.status(404).json({ error: `Approval request '${id}' not found` });
    }

    if (decision === 'approve') {
      // Execute the approved tool call
      const startTime = Date.now();
      const toolResult = await callTool(record.toolName, record.args);
      const resolved = historyService.resolveApproval(id, 'approve');

      historyService.recordExecution({
        prompt: record.prompt || `Approved tool execution: ${record.toolName}`,
        toolsCalled: [record.toolName],
        steps: [
          { type: 'approval_decision', decision: 'APPROVED', id },
          { type: 'tool_call', tool: record.toolName, args: record.args },
          { type: 'tool_result', tool: record.toolName, result: toolResult, durationMs: Date.now() - startTime }
        ],
        resultSummary: `Approved and executed ${record.toolName}`,
        durationMs: Date.now() - startTime,
        status: 'COMPLETED'
      });

      return res.json({
        success: true,
        status: 'APPROVED',
        record: resolved,
        toolResult
      });
    } else {
      const resolved = historyService.resolveApproval(id, 'reject');
      return res.json({
        success: true,
        status: 'REJECTED',
        record: resolved,
        message: 'Action was safely rejected by user.'
      });
    }
  } catch (err) {
    console.error('Approval decision error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approvals/config', (req, res) => {
  res.json(historyService.getApprovalsConfig());
});

app.post('/api/approvals/config', (req, res) => {
  const { enabled } = req.body;
  const config = historyService.setApprovalsRequired(enabled);
  res.json(config);
});

// Fallback to index.html for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start Server & Initialize MCP Client
async function startServer() {
  try {
    console.log('[Startup] Initializing MCP Server & Client...');
    await initMcpClient();
    console.log('[Startup] MCP subsystem ready.');

    console.log('[Startup] Connecting Database layer (MongoDB)...');
    await dbManager.connect();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 MCP Personal AI Workspace running at:`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
