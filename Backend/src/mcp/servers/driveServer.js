import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { googleService } from '../../services/googleService.js';
import { sandboxStore } from '../../services/sandboxStore.js';

export function createDriveMcpServer() {
  const server = new McpServer({
    name: 'drive-mcp-server',
    version: '1.0.0'
  });

  // 1. drive_list_files
  server.tool(
    'drive_list_files',
    'List or search files and folders in Google Drive by name, query, or mimeType.',
    {
      query: z.string().optional().describe('Search keyword to filter file/folder names'),
      mimeType: z.string().optional().describe('Filter by mimeType (e.g. application/vnd.google-apps.folder, application/vnd.google-apps.document)'),
      pageSize: z.number().optional().describe('Maximum number of items to return (default: 20)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const files = await googleService.listDriveFiles(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'drive-mcp-server',
          tool: 'drive_list_files',
          args,
          status: 'success',
          itemCount: files.length,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ files, total: files.length }, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error listing Drive files: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 2. drive_get_file_metadata
  server.tool(
    'drive_get_file_metadata',
    'Retrieve metadata, webViewLink, permissions, and details for a specific Google Drive file or folder.',
    {
      fileId: z.string().describe('The ID of the file or folder in Google Drive')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const file = await googleService.getDriveFile(args.fileId);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'drive-mcp-server',
          tool: 'drive_get_file_metadata',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(file, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error getting Drive file: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 3. drive_create_folder
  server.tool(
    'drive_create_folder',
    'Create a new project folder in Google Drive for organizing documents, notes, and assets.',
    {
      name: z.string().describe('The name of the new folder (e.g. "AI Summit 2026 Resources")'),
      parentFolderId: z.string().optional().describe('Optional parent folder ID to nest inside')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const folder = await googleService.createDriveFolder(args.name, args.parentFolderId);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'drive-mcp-server',
          tool: 'drive_create_folder',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating Drive folder: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 4. drive_share_file
  server.tool(
    'drive_share_file',
    'Share a Google Drive file, document, or folder with a team member or client email with specified permissions.',
    {
      fileId: z.string().describe('The ID of the file or document to share'),
      email: z.string().describe('Email address to grant access to'),
      role: z.enum(['reader', 'commenter', 'writer']).optional().describe('Access level: reader, commenter, or writer (default: reader)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.shareDriveFile(args.fileId, args.email, args.role || 'reader');
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'drive-mcp-server',
          tool: 'drive_share_file',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error sharing Drive file: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}
