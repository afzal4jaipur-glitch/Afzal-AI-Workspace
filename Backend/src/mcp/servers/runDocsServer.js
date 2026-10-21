#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDocsMcpServer } from './docsServer.js';

async function main() {
  const server = createDocsMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Docs MCP Stdio Server] Running on stdio transport');
}

main().catch(err => {
  console.error('[Docs MCP Server Error]', err);
  process.exit(1);
});
