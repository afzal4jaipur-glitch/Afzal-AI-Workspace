#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCalendarMcpServer } from './calendarServer.js';

async function main() {
  const server = createCalendarMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Calendar MCP Stdio Server] Running on stdio transport');
}

main().catch(err => {
  console.error('[Calendar MCP Server Error]', err);
  process.exit(1);
});
