import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGmailMcpServer } from './servers/gmailServer.js';
import { createDocsMcpServer } from './servers/docsServer.js';
import { createCalendarMcpServer } from './servers/calendarServer.js';
import { createDriveMcpServer } from './servers/driveServer.js';
import { createTavilyMcpServer } from './servers/tavilyServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class McpClientManager {
  constructor() {
    this.clients = new Map();
    this.servers = new Map();
    this.initialized = false;
    // Phase 2 Choice: 'optionB' (Custom built) vs 'optionA' (External / Stdio)
    this.gmailOption = process.env.GMAIL_MCP_OPTION || 'optionB';
  }

  async init() {
    if (this.initialized) return;

    // 1. Initialize Gmail MCP Server & Client (Supporting Option A & Option B)
    await this.initGmailClient();

    // 2. Initialize Google Docs MCP Server & Client
    const docsServer = createDocsMcpServer();
    const [docsClientTransport, docsServerTransport] = InMemoryTransport.createLinkedPair();
    await docsServer.connect(docsServerTransport);
    const docsClient = new Client({ name: 'workspace-docs-client', version: '1.0.0' }, { capabilities: {} });
    await docsClient.connect(docsClientTransport);
    this.clients.set('docs', docsClient);
    this.servers.set('docs', docsServer);

    // 3. Initialize Google Calendar MCP Server & Client
    const calendarServer = createCalendarMcpServer();
    const [calClientTransport, calServerTransport] = InMemoryTransport.createLinkedPair();
    await calendarServer.connect(calServerTransport);
    const calendarClient = new Client({ name: 'workspace-calendar-client', version: '1.0.0' }, { capabilities: {} });
    await calendarClient.connect(calClientTransport);
    this.clients.set('calendar', calendarClient);
    this.servers.set('calendar', calendarServer);

    // 4. Initialize Google Drive MCP Server & Client (Phase 6)
    const driveServer = createDriveMcpServer();
    const [driveClientTransport, driveServerTransport] = InMemoryTransport.createLinkedPair();
    await driveServer.connect(driveServerTransport);
    const driveClient = new Client({ name: 'workspace-drive-client', version: '1.0.0' }, { capabilities: {} });
    await driveClient.connect(driveClientTransport);
    this.clients.set('drive', driveClient);
    this.servers.set('drive', driveServer);

    // 5. Initialize Tavily Search MCP Server & Client
    const tavilyServer = createTavilyMcpServer();
    const [tavilyClientTransport, tavilyServerTransport] = InMemoryTransport.createLinkedPair();
    await tavilyServer.connect(tavilyServerTransport);
    const tavilyClient = new Client({ name: 'workspace-tavily-client', version: '1.0.0' }, { capabilities: {} });
    await tavilyClient.connect(tavilyClientTransport);
    this.clients.set('tavily', tavilyClient);
    this.servers.set('tavily', tavilyServer);

    this.initialized = true;
    console.log(`[MCP Multi-Client] Successfully connected to Gmail (${this.gmailOption}), Docs, Calendar, Drive, and Tavily MCP Servers`);
  }

  async initGmailClient() {
    if (this.gmailOption === 'optionA') {
      try {
        console.log('[MCP Multi-Client] Initializing Gmail MCP Server via Option A (StdioClientTransport)...');
        const runnerScript = path.resolve(__dirname, 'servers/runGmailServer.js');
        const transport = new StdioClientTransport({
          command: 'node',
          args: [runnerScript]
        });
        const gmailClient = new Client({ name: 'workspace-gmail-stdio-client', version: '1.0.0' }, { capabilities: {} });
        await gmailClient.connect(transport);
        this.clients.set('gmail', gmailClient);
        console.log('[MCP Multi-Client] Option A (External/Stdio Gmail MCP Server) active');
        return;
      } catch (err) {
        console.warn('[MCP Multi-Client] Option A connection failed, defaulting to Option B (Custom In-Memory):', err.message);
        this.gmailOption = 'optionB';
      }
    }

    // Option B: Build our own Gmail MCP Server (In-Memory Linked Pair with Official MCP SDK)
    const gmailServer = createGmailMcpServer();
    const [gmailClientTransport, gmailServerTransport] = InMemoryTransport.createLinkedPair();
    await gmailServer.connect(gmailServerTransport);
    const gmailClient = new Client({ name: 'workspace-gmail-client', version: '1.0.0' }, { capabilities: {} });
    await gmailClient.connect(gmailClientTransport);
    this.clients.set('gmail', gmailClient);
    this.servers.set('gmail', gmailServer);
    console.log('[MCP Multi-Client] Option B (Custom Built Gmail MCP Server via Official SDK) active');
  }

  getGmailOption() {
    return {
      active: this.gmailOption,
      label: this.gmailOption === 'optionA' 
        ? 'Option A: External/Maintained Gmail MCP Server (StdioClientTransport)' 
        : 'Option B: Custom Built Gmail MCP Server (Official MCP SDK & Gmail API)',
      choices: {
        optionA: 'Option A: Use an existing / maintained Gmail MCP server (StdioClientTransport)',
        optionB: 'Option B: Build our own Gmail MCP server (Official MCP SDK + Gmail API - Default & Recommended)'
      }
    };
  }

  async setGmailOption(option) {
    if (!['optionA', 'optionB'].includes(option)) {
      throw new Error("Invalid option. Must be 'optionA' or 'optionB'");
    }
    this.gmailOption = option;
    this.initialized = false;
    await this.init();
    return this.getGmailOption();
  }

  getClientForTool(toolName) {
    if (toolName.startsWith('gmail_')) return this.clients.get('gmail');
    if (toolName.startsWith('docs_')) return this.clients.get('docs');
    if (toolName.startsWith('calendar_')) return this.clients.get('calendar');
    if (toolName.startsWith('drive_')) return this.clients.get('drive');
    if (toolName.startsWith('tavily_')) return this.clients.get('tavily');
    // Default fallback to first client
    return this.clients.get('gmail');
  }

  async listTools() {
    await this.init();
    const allTools = [];

    for (const [serverKey, client] of this.clients.entries()) {
      try {
        const res = await client.listTools();
        const toolsWithServer = (res.tools || []).map(t => ({
          ...t,
          serverCategory: serverKey,
          serverName: `${serverKey}-mcp-server`
        }));
        allTools.push(...toolsWithServer);
      } catch (err) {
        console.warn(`[MCP Multi-Client] Error listing tools from ${serverKey}:`, err.message);
      }
    }

    return allTools;
  }

  async callTool(name, args = {}) {
    await this.init();
    const client = this.getClientForTool(name);
    if (!client) {
      throw new Error(`No MCP client configured to handle tool '${name}'`);
    }

    const res = await client.callTool({
      name,
      arguments: args
    });

    if (res.content && res.content.length > 0) {
      const first = res.content[0];
      if (first.type === 'text') {
        try {
          return JSON.parse(first.text);
        } catch {
          return first.text;
        }
      }
    }
    return res;
  }
}

export const mcpManager = new McpClientManager();

export async function initMcpClient() {
  await mcpManager.init();
  return mcpManager;
}

export async function listTools() {
  return await mcpManager.listTools();
}

export async function callTool(name, args = {}) {
  return await mcpManager.callTool(name, args);
}

/**
 * Converts MCP JSON Schema to Gemini FunctionDeclaration format
 */
export async function getGeminiFunctionDeclarations() {
  const tools = await listTools();

  function convertSchema(s) {
    if (!s) return { type: 'OBJECT', properties: {} };
    const clean = {
      type: (s.type || 'object').toUpperCase(),
      properties: {}
    };
    if (s.description) clean.description = s.description;
    if (s.required && Array.isArray(s.required)) clean.required = s.required;
    if (s.properties) {
      for (const [k, v] of Object.entries(s.properties)) {
        clean.properties[k] = {
          type: (v.type || 'string').toUpperCase(),
          description: v.description || ''
        };
        if (v.items && v.items.type) {
          clean.properties[k].items = { type: v.items.type.toUpperCase() };
        }
      }
    }
    return clean;
  }

  return tools.map(t => ({
    name: t.name,
    description: t.description || '',
    parameters: convertSchema(t.inputSchema)
  }));
}

export function getGmailOption() {
  return mcpManager.getGmailOption();
}

export async function setGmailOption(option) {
  return await mcpManager.setGmailOption(option);
}
