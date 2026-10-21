import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { googleService } from '../../services/googleService.js';
import { sandboxStore } from '../../services/sandboxStore.js';

export function createCalendarMcpServer() {
  const server = new McpServer({
    name: 'calendar-mcp-server',
    version: '1.0.0'
  });

  // 1. calendar_list_events
  server.tool(
    'calendar_list_events',
    'List upcoming events from Google Calendar to check availability, schedule, or find existing meetings.',
    {
      maxResults: z.number().optional().describe('Maximum number of events to retrieve (default: 10)'),
      timeMin: z.string().optional().describe('Lower bound (inclusive) for an event start time to filter by in ISO string format'),
      timeMax: z.string().optional().describe('Upper bound (exclusive) for an event end time to filter by in ISO string format'),
      query: z.string().optional().describe('Free text search terms to filter events by')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.listEvents(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'calendar-mcp-server',
          tool: 'calendar_list_events',
          args,
          status: 'success',
          itemCount: result.events?.length || 0,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error listing calendar events: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 2. calendar_create_event
  server.tool(
    'calendar_create_event',
    'Create a new meeting or event in Google Calendar with title, timing, description, and attendees.',
    {
      summary: z.string().describe('Title or summary of the meeting/event'),
      description: z.string().optional().describe('Detailed description or agenda for the event'),
      start: z.string().describe('Start time in ISO format or timestamp (e.g. 2026-10-15T11:00:00Z)'),
      end: z.string().optional().describe('End time in ISO format or timestamp (defaults to 1 hour after start)'),
      attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
      location: z.string().optional().describe('Location or video meeting link (e.g. Google Meet)')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.createEvent(args);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'calendar-mcp-server',
          tool: 'calendar_create_event',
          args: { summary: args.summary, start: args.start, attendees: args.attendees },
          status: 'success',
          eventId: result.id,
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating calendar event: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // 3. calendar_get_event
  server.tool(
    'calendar_get_event',
    'Retrieve details of a specific calendar event by its event ID.',
    {
      eventId: z.string().describe('The ID of the calendar event')
    },
    async (args) => {
      const startTime = Date.now();
      try {
        const result = await googleService.getEvent(args.eventId);
        sandboxStore.addTraceLog({
          type: 'mcp_tool_execution',
          server: 'calendar-mcp-server',
          tool: 'calendar_get_event',
          args,
          status: 'success',
          durationMs: Date.now() - startTime
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error getting calendar event: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}
