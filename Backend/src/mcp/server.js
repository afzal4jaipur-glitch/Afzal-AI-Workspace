import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { googleService } from '../services/googleService.js';
import { sandboxStore } from '../services/sandboxStore.js';

export function createWorkspaceMcpServer() {
  const server = new McpServer({
    name: 'workspace-mcp-server',
    version: '1.0.0'
  });

  // --- Gmail Tools ---

  // 1. gmail_list_messages
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
        const durationMs = Date.now() - startTime;
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'gmail_list_messages',
          args,
          status: 'success',
          itemCount: result.messages?.length || 0,
          durationMs
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'gmail_list_messages',
          args,
          status: 'error',
          error: err.message,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: `Error listing Gmail messages: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 2. gmail_get_message
  server.tool(
    'gmail_get_message',
    'Retrieve the full details and body content of a specific email by its message ID.',
    {
      id: z.string().describe('The ID of the message to retrieve')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.getMessage(args.id);
        const durationMs = Date.now() - startTime;
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'gmail_get_message',
          args,
          status: 'success',
          durationMs
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error getting message: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 3. gmail_search_messages
  server.tool(
    'gmail_search_messages',
    'Search emails in Gmail using a free-text or structured search query.',
    {
      query: z.string().describe('Search terms or query string (e.g. "workshop", "security", "from:sarah")'),
      maxResults: z.number().optional().describe('Maximum results to return (default: 10)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.searchMessages(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
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
          content: [{ type: 'text', text: `Error searching Gmail: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 4. gmail_create_draft
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

  // 5. gmail_send_message
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
          content: [{ type: 'text', text: `Error sending email: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // --- Google Docs Tools ---

  // 6. docs_create_document
  server.tool(
    'docs_create_document',
    'Create a new Google Document with a title and optional initial content/notes.',
    {
      title: z.string().describe('Title of the new document'),
      content: z.string().optional().describe('Initial content or markdown-formatted text to insert into the document')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.createDocument(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'docs_create_document',
          args: { title: args.title, contentLength: args.content?.length || 0 },
          status: 'success',
          docId: result.documentId,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating Google Doc: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 7. docs_get_document
  server.tool(
    'docs_get_document',
    'Retrieve the full content, title, and metadata of a Google Doc by its document ID.',
    {
      documentId: z.string().describe('The ID of the Google Document')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.getDocument(args.documentId);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'docs_get_document',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error retrieving Google Doc: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 8. docs_insert_text
  server.tool(
    'docs_insert_text',
    'Insert or append text into an existing Google Document.',
    {
      documentId: z.string().describe('The ID of the Google Document'),
      text: z.string().describe('The text to append or insert into the document'),
      index: z.number().optional().describe('Character index location to insert text (default: append at end)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.insertText(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'docs_insert_text',
          args: { documentId: args.documentId, textLength: args.text.length },
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error inserting text into Doc: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 9. docs_update_document
  server.tool(
    'docs_update_document',
    'Update the title or replace the body content of an existing Google Document.',
    {
      documentId: z.string().describe('The ID of the Google Document'),
      title: z.string().optional().describe('New title for the document'),
      content: z.string().optional().describe('Updated full content for the document')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.updateDocument(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'docs_update_document',
          args: { documentId: args.documentId, title: args.title },
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error updating Google Doc: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 10. docs_list_documents
  server.tool(
    'docs_list_documents',
    'List all Google Documents available in the user\'s workspace.',
    {
      pageSize: z.number().optional().describe('Number of documents to return (default: 10)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.listDocuments(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          tool: 'docs_list_documents',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error listing Google Docs: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}
