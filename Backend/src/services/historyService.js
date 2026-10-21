import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from '../db/mongoClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'execution_history.json');

class HistoryService {
  constructor() {
    this.history = [];
    this.pendingApprovals = new Map();
    this.approvalsRequired = true; // Phase 7: Approval gate active by default for sensitive actions
    this.sensitiveTools = new Set([
      'gmail_send_message',
      'calendar_create_event',
      'drive_share_file'
    ]);
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.history = Array.isArray(parsed) ? parsed : [];
      } else {
        this.history = this.getInitialSampleHistory();
        this.save();
      }
    } catch (err) {
      console.warn('[HistoryService] Failed to load history file, initializing fresh:', err.message);
      this.history = this.getInitialSampleHistory();
    }
  }

  getInitialSampleHistory() {
    return [
      {
        id: 'exec_sample_1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        type: 'agent_workflow',
        status: 'COMPLETED',
        prompt: 'Summarize 5 latest emails from my inbox',
        toolsCalled: ['gmail_list_messages', 'gmail_read_message'],
        durationMs: 420,
        resultSummary: 'Successfully summarized 5 emails from inbox.',
        requiresApproval: false
      },
      {
        id: 'exec_sample_2',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        type: 'agent_workflow',
        status: 'COMPLETED',
        prompt: 'Research and create Agentic AI Workshop curriculum document in Google Docs',
        toolsCalled: ['docs_create_document'],
        durationMs: 650,
        resultSummary: 'Created document "AI Workshop Notes & Hands-on Curriculum" in Google Docs.',
        requiresApproval: false
      }
    ];
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[HistoryService] Failed to persist history:', err.message);
    }
  }

  // --- Configuration ---
  isApprovalRequiredFor(toolName) {
    return this.approvalsRequired && this.sensitiveTools.has(toolName);
  }

  setApprovalsRequired(enabled) {
    this.approvalsRequired = Boolean(enabled);
    return { approvalsRequired: this.approvalsRequired };
  }

  getApprovalsConfig() {
    return {
      approvalsRequired: this.approvalsRequired,
      sensitiveTools: Array.from(this.sensitiveTools)
    };
  }

  // --- Pending Approvals Management ---
  createPendingApproval({ toolName, args, summary, impact, prompt }) {
    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const approvalRecord = {
      id: approvalId,
      timestamp: new Date().toISOString(),
      toolName,
      args,
      summary: summary || `Action requires user approval: ${toolName}`,
      impact: impact || 'Modifies external workspace state or contacts third parties',
      prompt: prompt || '',
      status: 'PENDING_APPROVAL'
    };

    this.pendingApprovals.set(approvalId, approvalRecord);

    // Also record in execution history
    const historyEntry = {
      id: approvalId,
      timestamp: approvalRecord.timestamp,
      type: 'approval_request',
      status: 'PENDING_APPROVAL',
      prompt: approvalRecord.prompt,
      toolsCalled: [toolName],
      args,
      durationMs: 0,
      resultSummary: `Pending human approval before executing ${toolName}.`,
      requiresApproval: true,
      approvalId
    };

    this.history.unshift(historyEntry);
    this.save();

    return approvalRecord;
  }

  getPendingApprovals() {
    return Array.from(this.pendingApprovals.values()).filter(a => a.status === 'PENDING_APPROVAL');
  }

  getPendingApproval(id) {
    return this.pendingApprovals.get(id);
  }

  resolveApproval(id, decision, user = 'workspace_user') {
    const record = this.pendingApprovals.get(id);
    if (!record) {
      throw new Error(`Pending approval with ID '${id}' not found`);
    }

    record.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    record.decidedAt = new Date().toISOString();
    record.decidedBy = user;

    // Update in history list
    const historyItem = this.history.find(h => h.id === id || h.approvalId === id);
    if (historyItem) {
      historyItem.status = record.status;
      historyItem.resultSummary = decision === 'approve' 
        ? `Approved by user at ${new Date().toLocaleTimeString()}; proceeding with execution.`
        : `Execution was rejected by user at ${new Date().toLocaleTimeString()}.`;
      this.save();
    }

    if (record.status === 'REJECTED') {
      this.pendingApprovals.delete(id);
    }

    return record;
  }

  // --- Record Executions ---
  recordExecution({ prompt, toolsCalled = [], steps = [], resultSummary, durationMs = 0, status = 'COMPLETED', error = null }) {
    const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const entry = {
      id: execId,
      timestamp: new Date().toISOString(),
      type: 'agent_workflow',
      status: error ? 'FAILED' : status,
      prompt: prompt || 'Direct MCP tool call',
      toolsCalled,
      stepsCount: steps.length,
      durationMs,
      resultSummary: error ? `Failed: ${error}` : (resultSummary || 'Execution completed successfully'),
      requiresApproval: false,
      error: error || null
    };

    this.history.unshift(entry);
    if (this.history.length > 200) {
      this.history.pop();
    }
    this.save();

    // Optionally save to MongoDB collection if online
    if (dbManager.isConnected && dbManager.db) {
      try {
        dbManager.db.collection('executions').insertOne(entry).catch(() => {});
      } catch (e) {}
    }

    return entry;
  }

  getHistory({ limit = 50, status = null } = {}) {
    let result = [...this.history];
    if (status && status !== 'ALL') {
      result = result.filter(h => h.status === status);
    }
    return result.slice(0, limit);
  }

  clearHistory() {
    this.history = [];
    this.save();
    return { success: true };
  }
}

export const historyService = new HistoryService();
