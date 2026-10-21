import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDriveMcpServer } from './driveServer.js';

async function main() {
  const server = createDriveMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Google Drive MCP Server] Running on stdio transport');
}

main().catch((err) => {
  console.error('[Google Drive MCP Server] Fatal error:', err);
  process.exit(1);
});
