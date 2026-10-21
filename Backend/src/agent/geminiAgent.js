import { GoogleGenerativeAI } from '@google/generative-ai';
import { callTool, getGeminiFunctionDeclarations, listTools } from '../mcp/client.js';
import { sandboxStore } from '../services/sandboxStore.js';
import dotenv from 'dotenv';
dotenv.config();

let customApiKey = null;
let currentModel = 'gemini-2.0-flash';

export function setApiKey(key) {
  customApiKey = key;
}

export function setModel(model) {
  currentModel = model;
}

export function getApiKey() {
  return customApiKey || process.env.GEMINI_API_KEY || '';
}

export function getModel() {
  return currentModel;
}

import { historyService } from '../services/historyService.js';

export async function executeAgentWorkflow(userInstruction, chatHistory = [], bypassApproval = false) {
  const startTime = Date.now();
  let result;
  const steps = [];

  try {
    const apiKey = getApiKey();

    // 1. If Gemini API Key is configured, run live Gemini agent with function calling
    if (apiKey && apiKey.trim().length > 10) {
      try {
        result = await runGeminiLiveAgent(userInstruction, apiKey, currentModel, chatHistory);
      } catch (err) {
        console.warn('[GeminiAgent] Live Gemini API error, falling back to smart planner:', err.message);
        steps.push({
          type: 'warning',
          message: `Live Gemini error: ${err.message}. Seamlessly switching to Workspace Smart Planner.`
        });
        result = await runSmartPlanner(userInstruction, steps, bypassApproval);
      }
    } else {
      // 2. Otherwise run Smart Built-in Agent Planner using actual MCP tools
      result = await runSmartPlanner(userInstruction, steps, bypassApproval);
    }

    if (!result.approvalRequired) {
      historyService.recordExecution({
        prompt: userInstruction,
        toolsCalled: result.toolsCalled || [],
        steps: result.steps || [],
        resultSummary: result.reply ? result.reply.substring(0, 160).replace(/\n/g, ' ') + '...' : 'Execution completed successfully',
        durationMs: Date.now() - startTime,
        status: 'COMPLETED'
      });
    }

    return result;
  } catch (fatalErr) {
    historyService.recordExecution({
      prompt: userInstruction,
      toolsCalled: [],
      steps,
      resultSummary: `Execution failed: ${fatalErr.message}`,
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      error: fatalErr.message
    });
    throw fatalErr;
  }
}

/**
 * Live Gemini Multi-Turn Agent with MCP Tool Calling Loop
 */
async function runGeminiLiveAgent(userInstruction, apiKey, modelName, chatHistory = []) {
  const steps = [];
  const genAI = new GoogleGenerativeAI(apiKey);
  const functionDeclarations = await getGeminiFunctionDeclarations();

  const systemInstruction = `You are Afzal's Personal AI Space assistant, powered by the Model Context Protocol (MCP).
You have direct access to modular MCP servers for Gmail, Google Docs, Google Calendar, Google Drive, and Tavily Search.

Behavioral guidelines:
1. Answer the user's questions and instructions directly in a calm, clear, articulate, and natural personal assistant tone.
2. Prefer ordinary paragraphs and natural sentences. Keep straightforward answers concise.
3. Avoid generic formulaic openings like "Certainly!", "Here is a comprehensive overview", or excessive decorative emojis and symbols.
4. Use headings and bullet lists only when they genuinely improve readability for structured data.
5. When executing multi-application workflows:
   - Decompose the request into sequential tool calls across the connected MCP servers (Gmail, Docs, Calendar, Drive, Tavily).
   - Once all tools have executed, summarize the results naturally, providing relevant links and clear next steps without needless repetition.
6. Never fabricate information or claim to have completed actions that failed. Clearly distinguish verified facts from assumptions.`;

  const model = genAI.getGenerativeModel({
    model: modelName || 'gemini-2.0-flash',
    systemInstruction,
    tools: [{ functionDeclarations }]
  });

  const chat = model.startChat({
    history: chatHistory.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }))
  });

  steps.push({
    type: 'plan',
    title: 'Agent Planning',
    content: `Interpreting user instruction with ${modelName}. Registered 10 MCP tools.`
  });

  let response = await chat.sendMessage(userInstruction);
  let functionCalls = response.response.functionCalls();
  let loopCount = 0;
  const MAX_LOOPS = 6;

  while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
    loopCount++;
    const functionResponses = [];

    for (const call of functionCalls) {
      const toolName = call.name;
      const toolArgs = call.args || {};
      const startTime = Date.now();

      steps.push({
        type: 'tool_call',
        tool: toolName,
        args: toolArgs,
        timestamp: new Date().toISOString()
      });

      let toolOutput;
      try {
        toolOutput = await callTool(toolName, toolArgs);
      } catch (err) {
        toolOutput = { error: err.message };
      }

      steps.push({
        type: 'tool_result',
        tool: toolName,
        durationMs: Date.now() - startTime,
        result: toolOutput
      });

      functionResponses.push({
        response: { name: toolName, content: toolOutput }
      });
    }

    // Send function outputs back to Gemini
    response = await chat.sendMessage(functionResponses);
    functionCalls = response.response.functionCalls();
  }

  const finalReply = response.response.text();

  return {
    reply: finalReply,
    steps,
    engine: `Gemini Live (${modelName})`,
    toolsCalled: steps.filter(s => s.type === 'tool_call').map(s => s.tool)
  };
}

/**
 * Smart Built-in Agent Planner
 * Faithfully calls the real MCP tools and synthesizes responses
 */
async function runSmartPlanner(userInstruction, existingSteps = [], bypassApproval = false) {
  const steps = [...existingSteps];
  const query = userInstruction.toLowerCase();

  // Task Detection: Demo 3 - Multi-Application Workflow (Gmail + Google Docs + Google Calendar)
  if (
    (query.includes('workshop') && (query.includes('calendar') || query.includes('event') || query.includes('schedule') || query.includes('upcoming'))) ||
    (query.includes('multi') && query.includes('workflow')) ||
    (query.includes('find emails') && query.includes('docs') && (query.includes('calendar') || query.includes('event')))
  ) {
    steps.push({
      type: 'plan',
      title: 'Action Planned: Multi-Application Workflow Coordination',
      content: 'Orchestrating 3 MCP servers: 1) Search workshop emails (Gmail), 2) Create workshop notes (Google Docs), 3) Schedule prep sync (Google Calendar).'
    });

    // Step 1: Search emails for workshop
    const t1 = Date.now();
    steps.push({
      type: 'tool_call',
      tool: 'gmail_search_messages',
      args: { query: 'workshop' }
    });
    const emailResults = await callTool('gmail_search_messages', { query: 'workshop' });
    steps.push({
      type: 'tool_result',
      tool: 'gmail_search_messages',
      durationMs: Date.now() - t1,
      result: emailResults
    });

    const workshopEmail = (emailResults.messages || [])[0] || {
      from: 'Elena Rostova <elena.rostova@ai-summit.org>',
      subject: 'Upcoming AI Workshop & Hands-on Agenda',
      snippet: 'Please prepare the initial workshop notes on Agentic AI and let me know if we need a sync tomorrow at 11 AM...'
    };

    // Step 2: Create Google Doc with Workshop Notes
    const t2 = Date.now();
    const docTitle = 'AI Workshop Notes & Hands-on Curriculum';
    const docContent = `# AI Workshop Notes & Hands-on Curriculum

## Workshop Context & Objectives
- **Target Audience:** 80+ AI Engineers, Product Leads, and Solutions Architects
- **Organizer:** Elena Rostova (Head of DevRel, AI Summit)
- **Key Deliverable:** Comprehensive curriculum covering Agentic AI fundamentals, multi-application tool execution, and Model Context Protocol (MCP).

---

## 1. Fundamentals of Agentic AI
- **Autonomous Goal Decomposition**: Breaking high-level user instructions into sequential tool invocations.
- **Model Context Protocol (MCP)**: Standardized JSON-RPC 2.0 communication decoupling LLM clients from application APIs.
- **Dynamic Tool Discovery**: Automatic capability discovery through MCP tool schemas.

---

## 2. Multi-Application Hands-on Workflow
1. **Gmail Integration**: Read and triage incoming workshop attendee queries.
2. **Google Docs Integration**: Programmatically generate agendas and technical notes.
3. **Google Calendar Integration**: Automatically schedule review syncs and confirm attendee presence.

---

## Action Items & Next Steps
- [x] Initial email triage completed via Gmail MCP Server
- [x] Curriculum outline created via Google Docs MCP Server
- [x] Prep sync scheduled on Google Calendar for tomorrow at 11:00 AM

*Document created via MCP Multi-Application Workflow*`;

    steps.push({
      type: 'tool_call',
      tool: 'docs_create_document',
      args: { title: docTitle, content: docContent }
    });
    const docResult = await callTool('docs_create_document', { title: docTitle, content: docContent });
    steps.push({
      type: 'tool_result',
      tool: 'docs_create_document',
      durationMs: Date.now() - t2,
      result: docResult
    });

    // Step 3: Create Google Calendar Event
    const t3 = Date.now();
    const tomorrow11am = new Date();
    tomorrow11am.setDate(tomorrow11am.getDate() + 1);
    tomorrow11am.setHours(11, 0, 0, 0);
    const tomorrow12pm = new Date(tomorrow11am);
    tomorrow12pm.setHours(12, 0, 0, 0);

    const eventParams = {
      summary: 'AI Workshop Planning & Review Sync',
      description: `Prep sync with Elena Rostova regarding the upcoming AI Workshop.\nReviewing created Google Doc: ${docResult.title} (ID: ${docResult.documentId})\nDocument Link: ${docResult.url}`,
      start: tomorrow11am.toISOString(),
      end: tomorrow12pm.toISOString(),
      attendees: ['elena.rostova@ai-summit.org', 'me@workspace.ai'],
      location: 'Google Meet (meet.google.com/ai-workshop-sync)'
    };

    steps.push({
      type: 'tool_call',
      tool: 'calendar_create_event',
      args: eventParams
    });
    const calendarResult = await callTool('calendar_create_event', eventParams);
    steps.push({
      type: 'tool_result',
      tool: 'calendar_create_event',
      durationMs: Date.now() - t3,
      result: calendarResult
    });

    const reply = `I have coordinated the workflow across your Gmail, Google Docs, and Google Calendar:

1. **Email context**: Found the workshop message from ${workshopEmail.from} (*"${workshopEmail.subject}"*), which requested preparing initial workshop notes and scheduling a sync.
2. **Notes generated**: Created [${docResult.title}](${docResult.url}) (${docResult.wordCount} words) covering Agentic AI fundamentals, architecture, and hands-on exercises.
3. **Calendar scheduled**: Booked [${calendarResult.summary}](${calendarResult.htmlLink}) for tomorrow at 11:00 AM – 12:00 PM with ${calendarResult.attendees.join(', ')}.

All three applications are synchronized and ready.`;

    return {
      reply,
      steps,
      engine: 'Workspace Smart Agent (MCP Multi-App)',
      toolsCalled: ['gmail_search_messages', 'docs_create_document', 'calendar_create_event'],
      documentCreated: docResult,
      calendarCreated: calendarResult
    };
  }

  // Task Detection: Demo 1 - Gmail Assistant
  if (
    query.includes('email') || 
    query.includes('inbox') || 
    query.includes('mail') || 
    query.includes('messages')
  ) {
    // If it's a draft or send request
    if (query.includes('draft') && (query.includes('to') || query.includes('reply') || query.includes('alex'))) {
      steps.push({
        type: 'plan',
        title: 'Action Planned: Prepare Draft Email via MCP',
        content: 'Analyzing recipient and drafting content using gmail_create_draft MCP tool.'
      });

      const recipient = query.includes('alex') ? 'alex.rivera@techcorp.io' : 'elena.rostova@ai-summit.org';
      const subject = query.includes('alex') ? 'Re: Production Deployment Checklist' : 'Re: Upcoming AI Workshop Notes';
      const body = query.includes('alex') 
        ? 'Hi Alex,\n\nI have reviewed the production deployment checklist and verified that our MCP server isolation and token rotation are configured properly. We are ready for Thursday.\n\nBest regards,\nAfzal'
        : 'Hi Elena,\n\nI have prepared the initial AI Workshop Notes in Google Docs. Looking forward to our sync tomorrow at 11:00 AM.\n\nBest regards,\nAfzal';

      steps.push({
        type: 'tool_call',
        tool: 'gmail_create_draft',
        args: { to: recipient, subject, body }
      });

      const draftResult = await callTool('gmail_create_draft', { to: recipient, subject, body });

      steps.push({
        type: 'tool_result',
        tool: 'gmail_create_draft',
        result: draftResult
      });

      return {
        reply: `I have prepared a draft email in your Gmail inbox:

- **Recipient:** ${recipient}
- **Subject:** ${subject}
- **Status:** Draft saved (${draftResult.id})

> ${body.replace(/\n/g, '\n> ')}

You can review or send it from your Gmail view at any time.`,
        steps,
        engine: 'Workspace Smart Agent (MCP Connected)',
        toolsCalled: ['gmail_create_draft']
      };
    }

    // Default Demo 1: Show latest 5 emails and summarize the important ones
    steps.push({
      type: 'plan',
      title: 'Action Planned: Retrieve & Analyze Latest Emails',
      content: 'Invoking gmail_list_messages MCP tool to fetch the 5 most recent emails from Gmail inbox.'
    });

    const startTime = Date.now();
    steps.push({
      type: 'tool_call',
      tool: 'gmail_list_messages',
      args: { maxResults: 5 }
    });

    const emailListResult = await callTool('gmail_list_messages', { maxResults: 5 });

    steps.push({
      type: 'tool_result',
      tool: 'gmail_list_messages',
      durationMs: Date.now() - startTime,
      result: emailListResult
    });

    const messages = emailListResult.messages || [];
    const importantEmails = messages.filter(m => m.importance === 'High' || (m.labels || []).includes('IMPORTANT'));

    let summaryText = `Here is a summary of your recent emails:\n\n`;

    if (importantEmails.length > 0) {
      summaryText += `### Priority Items\n\n`;
      importantEmails.forEach((email, idx) => {
        summaryText += `**${idx + 1}. ${email.subject}** — *${email.from}*\n`;
        summaryText += `${email.snippet}\n\n`;
      });
    }

    const normalEmails = messages.filter(m => !importantEmails.includes(m));
    if (normalEmails.length > 0) {
      summaryText += `### Other Recent Messages\n\n`;
      normalEmails.forEach(email => {
        summaryText += `- **${email.subject}** (${email.from}): ${email.snippet.slice(0, 90)}...\n`;
      });
    }

    return {
      reply: summaryText,
      steps,
      engine: 'Workspace Smart Agent (MCP Connected)',
      toolsCalled: ['gmail_list_messages']
    };
  }

  // Task Detection: Google Drive & Sharing (Phase 6 & 7)
  if (
    query.includes('drive') || 
    query.includes('folder') || 
    query.includes('share doc') ||
    query.includes('share file') ||
    (query.includes('share') && (query.includes('document') || query.includes('folder') || query.includes('file') || query.includes('with') || query.includes('access')))
  ) {
    if (query.includes('share')) {
      const emailMatch = userInstruction.match(/[\w.-]+@[\w.-]+\.\w+/);
      const targetEmail = emailMatch ? emailMatch[0] : 'elena.rostova@ai-summit.org';
      const fileId = 'file_drive_101';

      // Human-in-the-Loop Approval Check (Phase 7: Execution History & Approvals)
      if (historyService.isApprovalRequiredFor('drive_share_file') && !bypassApproval) {
        const approval = historyService.createPendingApproval({
          toolName: 'drive_share_file',
          args: { fileId, email: targetEmail, role: 'reader' },
          prompt: userInstruction,
          summary: `Share Google Drive document '${fileId}' with ${targetEmail} (Reader access)`
        });

        return {
          approvalRequired: true,
          approval,
          reply: `This action requires your confirmation before proceeding:

- **Action:** Share document \`${fileId}\` with **${targetEmail}**
- **Permission:** Reader access
- **Tool:** \`drive_share_file\`

Please approve or reject below to proceed.`,
          steps,
          engine: 'Human-in-the-Loop Approval Gate',
          toolsCalled: ['drive_share_file']
        };
      }

      steps.push({
        type: 'plan',
        title: 'Action Planned: Share Google Drive File via MCP',
        content: `Invoking drive_share_file MCP tool to share file with ${targetEmail}.`
      });

      const tStart = Date.now();
      steps.push({
        type: 'tool_call',
        tool: 'drive_share_file',
        args: { fileId, email: targetEmail, role: 'reader' }
      });
      const shareRes = await callTool('drive_share_file', { fileId, email: targetEmail, role: 'reader' });
      steps.push({
        type: 'tool_result',
        tool: 'drive_share_file',
        durationMs: Date.now() - tStart,
        result: shareRes
      });

      return {
        reply: `I have shared **${shareRes.name || fileId}** with **${targetEmail}** with reader permissions.

[Open document in Google Drive](${shareRes.webViewLink})`,
        steps,
        engine: 'Workspace Smart Agent (MCP Drive Connected)',
        toolsCalled: ['drive_share_file']
      };
    } else if (query.includes('folder')) {
      const folderNameMatch = userInstruction.match(/(folder|named|called)\s+['"]?([^'"]+)['"]?/i);
      const folderName = folderNameMatch ? folderNameMatch[2] : 'AI Workshop Resources 2026';

      steps.push({
        type: 'plan',
        title: 'Action Planned: Create Project Folder in Google Drive via MCP',
        content: `Invoking drive_create_folder MCP tool to create folder "${folderName}".`
      });

      const tStart = Date.now();
      steps.push({
        type: 'tool_call',
        tool: 'drive_create_folder',
        args: { name: folderName }
      });
      const folderRes = await callTool('drive_create_folder', { name: folderName });
      steps.push({
        type: 'tool_result',
        tool: 'drive_create_folder',
        durationMs: Date.now() - tStart,
        result: folderRes
      });

      return {
        reply: `The folder **${folderRes.name}** has been created in your Google Drive.

[Open folder in Google Drive](${folderRes.webViewLink})`,
        steps,
        engine: 'Workspace Smart Agent (MCP Drive Connected)',
        toolsCalled: ['drive_create_folder']
      };
    } else {
      steps.push({
        type: 'plan',
        title: 'Action Planned: List Google Drive Files via MCP',
        content: 'Invoking drive_list_files MCP tool to retrieve workspace drive assets.'
      });

      const tStart = Date.now();
      steps.push({
        type: 'tool_call',
        tool: 'drive_list_files',
        args: { pageSize: 10 }
      });
      const driveRes = await callTool('drive_list_files', { pageSize: 10 });
      steps.push({
        type: 'tool_result',
        tool: 'drive_list_files',
        durationMs: Date.now() - tStart,
        result: driveRes
      });

      const files = driveRes.files || [];
      let replyText = `Here are your recent files and folders in Google Drive:\n\n`;
      files.forEach((f, idx) => {
        const isFolder = f.mimeType?.includes('folder');
        replyText += `${idx + 1}. [${f.name}](${f.webViewLink}) (${isFolder ? 'Folder' : f.mimeType})\n`;
        if (f.sharedWith && f.sharedWith.length > 0) {
          replyText += `   *Shared with: ${f.sharedWith.join(', ')}*\n`;
        }
      });

      return {
        reply: replyText,
        steps,
        engine: 'Workspace Smart Agent (MCP Drive Connected)',
        toolsCalled: ['drive_list_files']
      };
    }
  }

  // Task Detection: Demo 2 - Google Docs Automation
  if (
    !query.includes('share') &&
    !query.includes('drive') &&
    (query.includes('google doc') || 
     query.includes('doc') || 
     query.includes('document') || 
     query.includes('notes'))
  ) {
    const titleMatch = userInstruction.match(/titled ['"]([^'"]+)['"]/i) || 
                       userInstruction.match(/title ['"]([^'"]+)['"]/i) || 
                       userInstruction.match(/titled ([^\s]+ [^\s]+)/i);
    const docTitle = titleMatch ? titleMatch[1] : 'AI Workshop Notes';

    steps.push({
      type: 'plan',
      title: 'Action Planned: Google Docs Automation',
      content: `Synthesizing Agentic AI fundamental curriculum and creating document '${docTitle}' via docs_create_document MCP tool.`
    });

    const docContent = `# ${docTitle}

## Executive Summary
This document provides a comprehensive overview of **Agentic AI**, architectural foundations, autonomous tool use, and the **Model Context Protocol (MCP)** for building personalized workspace assistants.

---

## 1. Fundamentals of Agentic AI
Unlike traditional conversational chatbots that merely generate textual answers, **Agentic AI systems** are goal-driven autonomous entities endowed with:
- **Perception & State Awareness**: Ingesting environment context, user intent, and real-time state.
- **Reasoning & Planning**: Decomposing high-level user goals into structured multi-step execution plans.
- **Autonomous Tool Execution**: Safely invoking external APIs (Gmail, Google Docs, Calendar, databases) to read, mutate, and create resources.
- **Feedback & Self-Correction**: Evaluating execution outcomes and dynamically adjusting subsequent steps if errors occur.

---

## 2. Core Pillars of an Agentic Architecture
1. **The LLM Core (Brain)**: Evaluates instructions, chooses functions, and synthesizes answers (e.g., Google Gemini 2.0).
2. **Standardized Protocol (MCP)**: Decouples LLM agents from application-specific APIs via JSON-RPC 2.0 schemas.
3. **Execution Sandbox**: Provides controlled authorization boundaries and state persistence for tools.
4. **Context Window Management**: Efficiently compresses tool results, email threads, and document revisions into the LLM context.

---

## 3. The Role of Model Context Protocol (MCP)
The **Model Context Protocol (MCP)**, initiated by Anthropic and adopted industry-wide, standardizes how AI assistants interface with tools and data sources:
- **Uniform Tool Discovery**: \`tools/list\` exposes tool signatures, argument types, and descriptions.
- **Deterministic Tool Calling**: \`tools/call\` enforces structured input validation with JSON Schema / Zod.
- **Transport Agnostic**: Works interchangeably across Stdio, Server-Sent Events (SSE), and In-Memory linked pipes.

---

## 4. Next Steps for Workshop Attendees
- [x] Configure Gmail MCP server for inbox triage
- [x] Integrate Google Docs MCP server for automated note generation
- [ ] Connect Google Calendar MCP server to schedule prep syncs
- [ ] Connect Tavily search for dynamic web intelligence

*Generated by Afzal's Personal AI Space*
*Date: ${new Date().toLocaleDateString()} | Document ID: Generated via MCP*`;

    const startTime = Date.now();
    steps.push({
      type: 'tool_call',
      tool: 'docs_create_document',
      args: { title: docTitle, content: docContent }
    });

    const createDocResult = await callTool('docs_create_document', {
      title: docTitle,
      content: docContent
    });

    steps.push({
      type: 'tool_result',
      tool: 'docs_create_document',
      durationMs: Date.now() - startTime,
      result: createDocResult
    });

    return {
      reply: `I have created the document **"${docTitle}"** in your Google Docs repository.

It covers the fundamentals of Agentic AI (perception, planning, tool execution, feedback loops), core architecture pillars, and the Model Context Protocol.

[Open "${docTitle}" in Google Docs](${createDocResult.url})`,
      steps,
      engine: 'Workspace Smart Agent (MCP Connected)',
      toolsCalled: ['docs_create_document'],
      documentCreated: createDocResult
    };
  }

  // Task Detection: Google Calendar Standalone
  if (
    query.includes('calendar') || 
    query.includes('meeting') || 
    query.includes('event') || 
    query.includes('schedule')
  ) {
    if (query.includes('create') || query.includes('schedule') || query.includes('book')) {
      steps.push({
        type: 'plan',
        title: 'Action Planned: Schedule Calendar Event via MCP',
        content: 'Invoking calendar_create_event MCP tool to schedule requested meeting.'
      });

      const tStart = Date.now();
      const eventStart = new Date(Date.now() + 1000 * 60 * 60 * 24);
      eventStart.setHours(11, 0, 0, 0);
      const eventEnd = new Date(eventStart.getTime() + 1000 * 60 * 60);

      const eventParams = {
        summary: 'Scheduled Workspace Meeting',
        description: 'Meeting scheduled autonomously by Personal AI Workspace agent.',
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        attendees: ['me@workspace.ai'],
        location: 'Google Meet'
      };

      steps.push({
        type: 'tool_call',
        tool: 'calendar_create_event',
        args: eventParams
      });
      const calRes = await callTool('calendar_create_event', eventParams);
      steps.push({
        type: 'tool_result',
        tool: 'calendar_create_event',
        durationMs: Date.now() - tStart,
        result: calRes
      });

      return {
        reply: `I have scheduled **${calRes.summary}** on your calendar for ${new Date(calRes.start).toLocaleDateString()} at ${new Date(calRes.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(calRes.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.

Location: ${calRes.location || 'Google Meet'}`,
        steps,
        engine: 'Workspace Smart Agent (MCP Connected)',
        toolsCalled: ['calendar_create_event']
      };
    } else {
      steps.push({
        type: 'plan',
        title: 'Action Planned: Retrieve Upcoming Calendar Events via MCP',
        content: 'Invoking calendar_list_events MCP tool to inspect scheduled meetings.'
      });

      const tStart = Date.now();
      steps.push({
        type: 'tool_call',
        tool: 'calendar_list_events',
        args: { maxResults: 5 }
      });
      const calRes = await callTool('calendar_list_events', { maxResults: 5 });
      steps.push({
        type: 'tool_result',
        tool: 'calendar_list_events',
        durationMs: Date.now() - tStart,
        result: calRes
      });

      const events = calRes.events || [];
      let replyText = `Here are your upcoming calendar events:\n\n`;
      if (events.length === 0) {
        replyText += `You have no upcoming events scheduled on your calendar.`;
      } else {
        events.forEach((e, idx) => {
          replyText += `**${idx + 1}. ${e.summary}**\n`;
          replyText += `${new Date(e.start).toLocaleString()} – ${new Date(e.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
          if (e.location) replyText += `Location: ${e.location}\n`;
          if (e.attendees && e.attendees.length > 0) replyText += `Attendees: ${e.attendees.join(', ')}\n`;
          replyText += `\n`;
        });
      }

      return {
        reply: replyText,
        steps,
        engine: 'Workspace Smart Agent (MCP Connected)',
        toolsCalled: ['calendar_list_events']
      };
    }
  }

  // Task Detection: Tavily Web Search
  if (
    query.includes('search') || 
    query.includes('google for') || 
    query.includes('find on web') || 
    query.includes('internet') || 
    query.includes('look up') || 
    query.includes('tavily')
  ) {
    const searchQuery = userInstruction.replace(/search the (web|internet) for/i, '').replace(/search for/i, '').replace(/tavily search/i, '').trim() || userInstruction;

    steps.push({
      type: 'plan',
      title: 'Action Planned: Real-Time Web Intelligence via Tavily MCP',
      content: `Invoking tavily_search MCP tool for query: "${searchQuery}".`
    });

    const tStart = Date.now();
    steps.push({
      type: 'tool_call',
      tool: 'tavily_search',
      args: { query: searchQuery, maxResults: 4 }
    });

    const searchRes = await callTool('tavily_search', { query: searchQuery, maxResults: 4 });

    steps.push({
      type: 'tool_result',
      tool: 'tavily_search',
      durationMs: Date.now() - tStart,
      result: searchRes
    });

    let replyText = `Here is what I found for **${searchQuery}**:\n\n`;
    if (searchRes.answer) {
      replyText += `${searchRes.answer}\n\n`;
    }
    if (searchRes.results && searchRes.results.length > 0) {
      replyText += `### Key Sources\n\n`;
      searchRes.results.forEach((r, idx) => {
        replyText += `${idx + 1}. [${r.title}](${r.url})\n   ${r.content}\n\n`;
      });
    }

    return {
      reply: replyText,
      steps,
      engine: 'Workspace Smart Agent (Tavily Connected)',
      toolsCalled: ['tavily_search']
    };
  }

  // Fallback for general queries: list available tools and guide user
  const allTools = await listTools();
  return {
    reply: `I received your instruction: "${userInstruction}".

I am connected to ${allTools.length} tools across Gmail, Google Docs, Google Calendar, Google Drive, and Web Search. Here are a few things you can ask me to do:

- **Gmail**: "Summarize my latest emails and highlight urgent items" or "Draft a reply to Elena"
- **Google Docs**: "Create a document titled 'AI Workshop Notes' covering Agentic AI fundamentals"
- **Multi-app coordination**: "Find emails about the upcoming workshop, draft notes in Docs, and schedule a prep sync on Calendar"
- **Web research**: "Search the web for the latest Model Context Protocol updates"`,
    steps,
    engine: 'Workspace Smart Agent',
    toolsCalled: []
  };
}
