#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTavilyMcpServer } from './tavilyServer.js';

async function main() {
  const server = createTavilyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Tavily MCP Stdio Server] Running on stdio transport');
}

main().catch(err => {
  console.error('[Tavily MCP Server Error]', err);
  process.exit(1);
});
