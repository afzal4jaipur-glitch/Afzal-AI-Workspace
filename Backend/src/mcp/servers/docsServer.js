import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { googleService } from '../../services/googleService.js';
import { sandboxStore } from '../../services/sandboxStore.js';

export function createDocsMcpServer() {
  const server = new McpServer({
    name: 'docs-mcp-server',
    version: '1.0.0'
  });

  // 1. docs_create_document
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
          server: 'docs-mcp-server',
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

  // 2. docs_insert_text
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
          server: 'docs-mcp-server',
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

  // 3. docs_get_document
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
          server: 'docs-mcp-server',
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

  // 4. docs_update_document
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
          server: 'docs-mcp-server',
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

  // 5. docs_list_documents
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
          server: 'docs-mcp-server',
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
