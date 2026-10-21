#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWorkspaceMcpServer } from './server.js';

async function main() {
  const server = createWorkspaceMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Stdio Server] Running on stdio transport');
}

main().catch(err => {
  console.error('[MCP Stdio Server] Fatal error:', err);
  process.exit(1);
});
