#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGmailMcpServer } from './gmailServer.js';

async function main() {
  const server = createGmailMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Gmail MCP Stdio Server] Running on stdio transport');
}

main().catch(err => {
  console.error('[Gmail MCP Server Error]', err);
  process.exit(1);
});
