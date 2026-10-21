import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { googleService } from '../../services/googleService.js';
import { sandboxStore } from '../../services/sandboxStore.js';

export function createGmailMcpServer() {
  const server = new McpServer({
    name: 'gmail-mcp-server',
    version: '1.0.0'
  });

  // 1. gmail_search_messages
  server.tool(
    'gmail_search_messages',
    'Search emails in Gmail using a free-text or structured query (e.g. "workshop", "urgent", "from:elena").',
    {
      query: z.string().describe('Search terms or query string'),
      maxResults: z.number().optional().describe('Maximum results to return (default: 10)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.searchMessages(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'gmail-mcp-server',
          tool: 'gmail_search_messages',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error searching Gmail messages: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 2. gmail_read_message (as specifically designated in the architecture requirements)
  server.tool(
    'gmail_read_message',
    'Read full details, headers, and body content of a specific Gmail message by its ID.',
    {
      id: z.string().describe('The ID of the message to read')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.getMessage(args.id);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'gmail-mcp-server',
          tool: 'gmail_read_message',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error reading Gmail message: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 3. gmail_list_messages
  server.tool(
    'gmail_list_messages',
    'List messages from Gmail inbox with optional query filters, labels, and limit.',
    {
      maxResults: z.number().optional().describe('Maximum number of emails to retrieve (default: 5)'),
      q: z.string().optional().describe('Search query string (e.g. "from:alex", "is:unread")'),
      labelIds: z.array(z.string()).optional().describe('Filter by label IDs like ["INBOX", "IMPORTANT"]')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.listMessages(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'gmail-mcp-server',
          tool: 'gmail_list_messages',
          args,
          status: 'success',
          itemCount: result.messages?.length || 0,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error listing Gmail messages: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 4. gmail_get_message (alias)
  server.tool(
    'gmail_get_message',
    'Retrieve the full details and body content of a specific email by its message ID.',
    {
      id: z.string().describe('The ID of the message to retrieve')
    },
    async (args) => {
      return await googleService.getMessage(args.id).then(r => ({
        content: [{ type: 'text', text: JSON.stringify(r, null, 2) }]
      })).catch(err => ({
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true
      }));
    }
  );

  // 5. gmail_create_draft
  server.tool(
    'gmail_create_draft',
    'Prepare a draft email in Gmail without sending it immediately.',
    {
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Subject line of the email'),
      body: z.string().describe('Body content of the email')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.createDraft(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'gmail-mcp-server',
          tool: 'gmail_create_draft',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating draft: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 6. gmail_send_message
  server.tool(
    'gmail_send_message',
    'Send an email message via Gmail to a recipient.',
    {
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Subject line of the email'),
      body: z.string().describe('Body content of the email')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.sendMessage(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'gmail-mcp-server',
          tool: 'gmail_send_message',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error sending message: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}
