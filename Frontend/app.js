/**
 * MCP Personal AI Workspace - Frontend Controller
 * Connects React-grade UI to Multi-Server MCP Architecture and Gemini Agent
 */

// State
const state = {
  activeTab: 'gmailTab',
  selectedDocId: null,
  selectedEmailId: null,
  chatHistory: [],
  tools: [],
  emails: [],
  docs: [],
  events: [],
  systemStatus: null
};

// DOM Elements
const mcpStatusPill = document.getElementById('mcpStatusPill');
const geminiStatusPill = document.getElementById('geminiStatusPill');
const engineModelName = document.getElementById('engineModelName');
const workspaceModeLabel = document.getElementById('workspaceModeLabel');
const emailCountBadge = document.getElementById('emailCountBadge');
const docsCountBadge = document.getElementById('docsCountBadge');
const calendarCountBadge = document.getElementById('calendarCountBadge');
const toolsCountBadge = document.getElementById('toolsCountBadge');
const toolCountLabel = document.getElementById('toolCountLabel');

// Tab Panes & Buttons
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Explorer Containers
const emailListContainer = document.getElementById('emailListContainer');
const docsListContainer = document.getElementById('docsListContainer');
const docViewerPlaceholder = document.getElementById('docViewerPlaceholder');
const docPaper = document.getElementById('docPaper');
const docPaperTitle = document.getElementById('docPaperTitle');
const docPaperMeta = document.getElementById('docPaperMeta');
const docPaperContent = document.getElementById('docPaperContent');
const copyDocContentBtn = document.getElementById('copyDocContentBtn');
const calendarListContainer = document.getElementById('calendarListContainer');
const toolsGrid = document.getElementById('toolsGrid');
const terminalLogs = document.getElementById('terminalLogs');

// Chat Elements
const messagesContainer = document.getElementById('messagesContainer');
const chatForm = document.getElementById('chatForm');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const agentThinkingBar = document.getElementById('agentThinkingBar');
const thinkingText = document.getElementById('thinkingText');
const clearChatBtn = document.getElementById('clearChatBtn');

// Modals
const emailModal = document.getElementById('emailModal');
const closeEmailModal = document.getElementById('closeEmailModal');
const closeEmailModalBtn = document.getElementById('closeEmailModalBtn');
const modalEmailSubject = document.getElementById('modalEmailSubject');
const modalEmailFrom = document.getElementById('modalEmailFrom');
const modalEmailTo = document.getElementById('modalEmailTo');
const modalEmailDate = document.getElementById('modalEmailDate');
const modalEmailLabels = document.getElementById('modalEmailLabels');
const modalEmailBody = document.getElementById('modalEmailBody');
const modalReplyPromptBtn = document.getElementById('modalReplyPromptBtn');

const composeModal = document.getElementById('composeModal');
const closeComposeModal = document.getElementById('closeComposeModal');
const cancelComposeBtn = document.getElementById('cancelComposeBtn');
const composeForm = document.getElementById('composeForm');
const composeDraftBtn = document.getElementById('composeDraftBtn');

const eventModal = document.getElementById('eventModal');
const closeEventModal = document.getElementById('closeEventModal');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const eventForm = document.getElementById('eventForm');
const newEventBtn = document.getElementById('newEventBtn');

const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const modePill = document.getElementById('modePill');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const serviceModeSelect = document.getElementById('serviceModeSelect');
const oauthConfiguredBadge = document.getElementById('oauthConfiguredBadge');
const resetSandboxBtn = document.getElementById('resetSandboxBtn');

// Demo Action Buttons
const btnDemo1 = document.getElementById('btnDemo1');
const btnDemo2 = document.getElementById('btnDemo2');
const btnDemo3 = document.getElementById('btnDemo3');
const quickstartDemo1 = document.getElementById('quickstartDemo1');
const quickstartDemo2 = document.getElementById('quickstartDemo2');
const quickstartDemo3 = document.getElementById('quickstartDemo3');

// Refresh buttons
const refreshEmailsBtn = document.getElementById('refreshEmailsBtn');
const refreshDocsBtn = document.getElementById('refreshDocsBtn');
const refreshCalendarBtn = document.getElementById('refreshCalendarBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// Suggested Chips
const chipButtons = document.querySelectorAll('.chip-btn');

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchStatus();
  fetchTools();
  fetchEmails();
  fetchDocs();
  fetchCalendar();
  fetchLogs();

  // Periodic trace sync
  setInterval(fetchLogs, 5000);
});

function initEventListeners() {
  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Chat Submission
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleChatSubmit();
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  });

  clearChatBtn.addEventListener('click', () => {
    if (confirm('Clear the current conversation?')) {
      state.chatHistory = [];
      const welcome = messagesContainer.querySelector('.welcome-message');
      messagesContainer.innerHTML = '';
      if (welcome) messagesContainer.appendChild(welcome);
    }
  });

  // Quick Action Buttons
  btnDemo1.addEventListener('click', () => {
    runPrompt("Show me my latest five emails and summarize the important ones.");
  });

  btnDemo2.addEventListener('click', () => {
    runPrompt("Create a Google Doc titled 'AI Workshop Notes' and explain the fundamentals of Agentic AI.");
  });

  if (btnDemo3) {
    btnDemo3.addEventListener('click', () => {
      runPrompt("Find emails related to my upcoming workshop, prepare a summary in Google Docs, and create a calendar event for the workshop.");
    });
  }

  if (quickstartDemo1) {
    quickstartDemo1.addEventListener('click', () => {
      runPrompt("Show me my latest five emails and summarize the important ones.");
    });
  }

  if (quickstartDemo2) {
    quickstartDemo2.addEventListener('click', () => {
      runPrompt("Create a Google Doc titled 'AI Workshop Notes' and explain the fundamentals of Agentic AI.");
    });
  }

  if (quickstartDemo3) {
    quickstartDemo3.addEventListener('click', () => {
      runPrompt("Find emails related to my upcoming workshop, prepare a summary in Google Docs, and create a calendar event for the workshop.");
    });
  }

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      runPrompt(prompt);
    });
  });

  // Refresh & Utility Buttons
  refreshEmailsBtn.addEventListener('click', fetchEmails);
  refreshDocsBtn.addEventListener('click', fetchDocs);
  if (refreshCalendarBtn) refreshCalendarBtn.addEventListener('click', fetchCalendar);
  clearLogsBtn.addEventListener('click', async () => {
    await fetch('/api/logs/clear', { method: 'POST' });
    terminalLogs.innerHTML = '';
  });

  // Draft Compose Modal
  composeDraftBtn.addEventListener('click', () => {
    composeModal.style.display = 'flex';
  });
  closeComposeModal.addEventListener('click', () => composeModal.style.display = 'none');
  cancelComposeBtn.addEventListener('click', () => composeModal.style.display = 'none');

  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const to = document.getElementById('composeTo').value;
    const subject = document.getElementById('composeSubject').value;
    const body = document.getElementById('composeBody').value;

    try {
      const res = await fetch('/api/gmail/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body })
      });
      const data = await res.json();
      composeModal.style.display = 'none';
      composeForm.reset();
      fetchEmails();
      fetchLogs();
      alert(`Draft created successfully via Gmail MCP server (ID: ${data.id})`);
    } catch (err) {
      alert(`Error creating draft: ${err.message}`);
    }
  });

  // Calendar Event Modal
  if (newEventBtn) {
    newEventBtn.addEventListener('click', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      const isoStart = tomorrow.toISOString().slice(0, 16);
      tomorrow.setHours(12, 0, 0, 0);
      const isoEnd = tomorrow.toISOString().slice(0, 16);

      document.getElementById('eventStart').value = isoStart;
      document.getElementById('eventEnd').value = isoEnd;
      eventModal.style.display = 'flex';
    });
  }

  if (closeEventModal) closeEventModal.addEventListener('click', () => eventModal.style.display = 'none');
  if (cancelEventBtn) cancelEventBtn.addEventListener('click', () => eventModal.style.display = 'none');

  if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const summary = document.getElementById('eventSummary').value;
      const start = document.getElementById('eventStart').value;
      const end = document.getElementById('eventEnd').value;
      const attendees = document.getElementById('eventAttendees').value.split(',').map(s => s.trim()).filter(Boolean);
      const location = document.getElementById('eventLocation').value;
      const description = document.getElementById('eventDescription').value;

      try {
        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary, start, end, attendees, location, description })
        });
        const data = await res.json();
        eventModal.style.display = 'none';
        eventForm.reset();
        fetchCalendar();
        fetchLogs();
        alert(`Meeting scheduled via Google Calendar MCP Server: "${data.summary}"`);
      } catch (err) {
        alert(`Error scheduling meeting: ${err.message}`);
      }
    });
  }

  // Email detail modal
  closeEmailModal.addEventListener('click', () => emailModal.style.display = 'none');
  closeEmailModalBtn.addEventListener('click', () => emailModal.style.display = 'none');

  modalReplyPromptBtn.addEventListener('click', () => {
    emailModal.style.display = 'none';
    const sender = modalEmailFrom.textContent;
    const subject = modalEmailSubject.textContent;
    runPrompt(`Draft a polite reply to ${sender} regarding "${subject}".`);
  });

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  modePill.addEventListener('click', openSettings);
  closeSettingsModal.addEventListener('click', () => settingsModal.style.display = 'none');
  cancelSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
  saveSettingsBtn.addEventListener('click', saveSettings);

  resetSandboxBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all inbox emails, docs, and calendar events back to default state?')) {
      await fetch('/api/reset-sandbox', { method: 'POST' });
      fetchEmails();
      fetchDocs();
      fetchCalendar();
      fetchLogs();
      settingsModal.style.display = 'none';
      alert('Sandbox data successfully reset.');
    }
  });

  copyDocContentBtn.addEventListener('click', () => {
    const text = docPaperContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
      copyDocContentBtn.textContent = 'Copied!';
      setTimeout(() => copyDocContentBtn.textContent = 'Copy Text', 2000);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  tabButtons.forEach(b => {
    if (b.getAttribute('data-tab') === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

/* ==========================================================================
   Data Fetching & State Synchronization
   ========================================================================== */
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.systemStatus = data;

    if (data.mcpServers) {
      mcpStatusPill.classList.add('active');
    }
    if (data.aiEngine) {
      engineModelName.textContent = data.aiEngine.model || 'Gemini 2.0';
    }
    if (data.googleWorkspace) {
      workspaceModeLabel.textContent = data.googleWorkspace.mode === 'live' 
        ? 'Live Google Workspace (Gmail, Docs, Calendar)' 
        : 'Sandbox & Live Ready';
    }
  } catch (err) {
    console.error('Failed to fetch workspace status:', err);
  }
}

async function fetchTools() {
  try {
    const res = await fetch('/api/tools');
    const data = await res.json();
    state.tools = data.tools || [];
    toolsCountBadge.textContent = state.tools.length;
    toolCountLabel.textContent = `${state.tools.length} Tools across 3 MCP Servers`;
    renderToolsGrid();
  } catch (err) {
    console.error('Failed to fetch MCP tools:', err);
  }
}

async function fetchEmails() {
  try {
    const res = await fetch('/api/gmail/messages?maxResults=20');
    const data = await res.json();
    state.emails = data.messages || [];
    emailCountBadge.textContent = state.emails.length;
    renderEmailList();
  } catch (err) {
    console.error('Failed to fetch emails:', err);
    emailListContainer.innerHTML = `<div class="loading-state">Error loading emails: ${err.message}</div>`;
  }
}

async function fetchDocs() {
  try {
    const res = await fetch('/api/docs');
    const data = await res.json();
    state.docs = data.documents || [];
    docsCountBadge.textContent = state.docs.length;
    renderDocsList();

    // Auto-select first doc if none selected
    if (!state.selectedDocId && state.docs.length > 0) {
      selectDoc(state.docs[0].documentId);
    }
  } catch (err) {
    console.error('Failed to fetch docs:', err);
    docsListContainer.innerHTML = `<div class="loading-state">Error loading docs: ${err.message}</div>`;
  }
}

async function fetchCalendar() {
  try {
    const res = await fetch('/api/calendar/events?maxResults=20');
    const data = await res.json();
    state.events = data.events || [];
    if (calendarCountBadge) calendarCountBadge.textContent = state.events.length;
    renderCalendarList();
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    if (calendarListContainer) {
      calendarListContainer.innerHTML = `<div class="loading-state">Error loading calendar: ${err.message}</div>`;
    }
  }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    renderLogs(data.logs || []);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  }
}

/* ==========================================================================
   Renderers
   ========================================================================== */
function renderEmailList() {
  if (state.emails.length === 0) {
    emailListContainer.innerHTML = `<div class="loading-state">No emails found in inbox.</div>`;
    return;
  }

  emailListContainer.innerHTML = state.emails.map(email => {
    const isUnread = !email.isRead;
    const isImportant = email.importance === 'High' || (email.labels || []).includes('IMPORTANT');
    const senderName = email.from.replace(/<.*>/, '').trim() || email.from;
    const initial = senderName.charAt(0).toUpperCase() || 'M';
    const dateFormatted = formatRelativeDate(email.date);

    return `
      <div class="email-card ${isUnread ? 'unread' : ''}" onclick="viewEmail('${email.id}')">
        <div class="email-card-header">
          <div class="email-sender-info">
            <div class="sender-avatar">${initial}</div>
            <span class="sender-name">${escapeHtml(senderName)}</span>
          </div>
          <span class="email-date">${dateFormatted}</span>
        </div>
        <div class="email-subject">${escapeHtml(email.subject)}</div>
        <div class="email-snippet">${escapeHtml(email.snippet || '')}</div>
        <div class="email-tags">
          ${isImportant ? '<span class="tag-badge important">High Priority</span>' : ''}
          ${(email.labels || []).filter(l => l !== 'INBOX').map(l => `<span class="tag-badge">${escapeHtml(l)}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

window.viewEmail = async function(id) {
  try {
    const res = await fetch(`/api/gmail/messages/${id}`);
    const email = await res.json();
    
    modalEmailSubject.textContent = email.subject || '(No Subject)';
    modalEmailFrom.textContent = email.from || '';
    modalEmailTo.textContent = email.to || '';
    modalEmailDate.textContent = new Date(email.date).toLocaleString();
    modalEmailLabels.textContent = (email.labels || []).join(', ') || 'None';
    modalEmailBody.textContent = email.body || email.snippet || '(No content)';

    emailModal.style.display = 'flex';
    fetchEmails(); // update unread status
  } catch (err) {
    alert(`Failed to load email: ${err.message}`);
  }
};

function renderDocsList() {
  if (state.docs.length === 0) {
    docsListContainer.innerHTML = `<div class="loading-state">No documents found.</div>`;
    return;
  }

  docsListContainer.innerHTML = state.docs.map(doc => {
    const isSelected = state.selectedDocId === doc.documentId;
    return `
      <div class="doc-list-item ${isSelected ? 'active' : ''}" onclick="selectDoc('${doc.documentId}')">
        <div class="doc-item-title">${escapeHtml(doc.title)}</div>
        <div class="doc-item-meta">${doc.wordCount || 0} words • ${formatRelativeDate(doc.modifiedTime || doc.createdTime)}</div>
      </div>
    `;
  }).join('');
}

window.selectDoc = async function(docId) {
  state.selectedDocId = docId;
  renderDocsList();

  try {
    const res = await fetch(`/api/docs/${docId}`);
    const doc = await res.json();

    docViewerPlaceholder.style.display = 'none';
    docPaper.style.display = 'block';

    docPaperTitle.textContent = doc.title;
    docPaperMeta.textContent = `Document ID: ${doc.documentId} • ${doc.wordCount || 0} words • Updated ${new Date(doc.modifiedTime || doc.createdTime).toLocaleTimeString()}`;
    
    docPaperContent.innerHTML = formatMarkdown(doc.content || '');
  } catch (err) {
    console.error('Failed to view doc:', err);
  }
};

function renderCalendarList() {
  if (!calendarListContainer) return;
  if (state.events.length === 0) {
    calendarListContainer.innerHTML = `<div class="loading-state">No calendar events scheduled.</div>`;
    return;
  }

  calendarListContainer.innerHTML = state.events.map(event => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const day = startDate.getDate();
    const month = startDate.toLocaleString('default', { month: 'short' });
    const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return `
      <div class="calendar-card" onclick="alert('Meeting: ${escapeHtml(event.summary)}\\nTime: ${timeStr}\\nLocation: ${escapeHtml(event.location || 'Google Meet')}\\nAttendees: ${(event.attendees || []).join(', ')}')">
        <div class="event-date-box">
          <div class="event-date-day">${day}</div>
          <div class="event-date-month">${month}</div>
        </div>
        <div class="calendar-card-body">
          <div class="event-title">${escapeHtml(event.summary)}</div>
          <div class="event-time-row">
            <span>🕒 ${timeStr}</span>
            <span>•</span>
            <span class="event-location">📍 ${escapeHtml(event.location || 'Google Meet')}</span>
          </div>
          ${event.description ? `<div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 2px;">${escapeHtml(event.description.slice(0, 100))}...</div>` : ''}
          <div class="event-attendee-list">
            ${(event.attendees || []).map(a => `<span class="attendee-chip">👤 ${escapeHtml(a)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderToolsGrid() {
  if (state.tools.length === 0) {
    toolsGrid.innerHTML = `<div class="loading-state">No tools registered.</div>`;
    return;
  }

  toolsGrid.innerHTML = state.tools.map(tool => {
    let serverLabel = 'Gmail MCP Server';
    let badgeColor = '#38bdf8';

    if (tool.name.startsWith('docs_')) {
      serverLabel = 'Google Docs MCP Server';
      badgeColor = '#a855f7';
    } else if (tool.name.startsWith('calendar_')) {
      serverLabel = 'Google Calendar MCP Server';
      badgeColor = '#10b981';
    }

    const schema = tool.inputSchema || {};
    const props = schema.properties ? Object.keys(schema.properties) : [];

    return `
      <div class="tool-spec-card">
        <div class="tool-card-top">
          <span class="tool-name-badge" style="color: ${badgeColor}; border-color: ${badgeColor}40;">${escapeHtml(tool.name)}</span>
          <span class="tool-category">${serverLabel}</span>
        </div>
        <div class="tool-desc">${escapeHtml(tool.description || 'No description')}</div>
        <div class="tool-params-label">Parameters (${props.length}):</div>
        <div class="tool-param-tags">
          ${props.length > 0 ? props.map(p => `<span class="param-chip">${escapeHtml(p)}</span>`).join('') : '<span class="param-chip">none</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function renderLogs(logs) {
  if (!logs || logs.length === 0) return;

  terminalLogs.innerHTML = logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let text = '';
    let typeClass = 'system';

    if (log.type === 'mcp_tool_execution') {
      typeClass = log.status === 'success' ? 'tool_call' : 'error';
      const serverPrefix = log.server ? `[${log.server}] ` : '';
      text = `${serverPrefix}[Tool: ${log.tool}] ${log.status.toUpperCase()} (${log.durationMs}ms) - Args: ${JSON.stringify(log.args)}`;
    } else {
      text = log.message || JSON.stringify(log);
    }

    return `
      <div class="log-entry ${typeClass}">
        <span class="log-time">${time}</span>
        <span class="log-msg">${escapeHtml(text)}</span>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Chat & Agent Execution
   ========================================================================== */
function runPrompt(text) {
  promptInput.value = text;
  handleChatSubmit();
}

window.runPrompt = runPrompt;
window.switchTab = switchTab;

async function handleChatSubmit() {
  const text = promptInput.value.trim();
  if (!text) return;

  promptInput.value = '';
  promptInput.style.height = 'auto';

  // Add User Message
  appendUserMessage(text);

  // Show Thinking Bar
  agentThinkingBar.style.display = 'flex';
  thinkingText.textContent = `Interpreting instruction & planning tool calls across Gmail, Docs, and Calendar MCP servers...`;
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: state.chatHistory.slice(-6)
      })
    });

    const data = await res.json();
    agentThinkingBar.style.display = 'none';
    sendBtn.disabled = false;

    if (data.error) {
      appendAssistantMessage(`❌ **Error:** ${data.error}`, []);
      return;
    }

    // Add Assistant Message with tool steps
    appendAssistantMessage(data.reply, data.steps || [], data.engine, data.documentCreated, data.calendarCreated);

    // Save to history
    state.chatHistory.push({ role: 'user', content: text });
    state.chatHistory.push({ role: 'assistant', content: data.reply });

    // Refresh side panels to show side-effects
    fetchEmails();
    fetchDocs();
    fetchCalendar();
    fetchLogs();

    // Auto view created document if applicable
    if (data.documentCreated) {
      setTimeout(() => {
        selectDoc(data.documentCreated.documentId);
      }, 500);
    }

  } catch (err) {
    agentThinkingBar.style.display = 'none';
    sendBtn.disabled = false;
    appendAssistantMessage(`❌ **Network / Agent Error:** ${err.message}`, []);
  }
}

function appendUserMessage(text) {
  const msgEl = document.createElement('div');
  msgEl.className = 'message user-message';
  msgEl.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-bubble">
      ${escapeHtml(text).replace(/\n/g, '<br>')}
    </div>
  `;
  messagesContainer.appendChild(msgEl);
  scrollToBottom();
}

function appendAssistantMessage(reply, steps = [], engine = 'Gemini Orchestrator', docCreated = null, calCreated = null) {
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant-message';

  let toolStepsHtml = '';
  const toolCalls = steps.filter(s => s.type === 'tool_call');

  if (toolCalls.length > 0) {
    toolStepsHtml = `<div class="tool-step-container">`;
    toolCalls.forEach(call => {
      const resStep = steps.find(s => s.type === 'tool_result' && s.tool === call.tool);
      const duration = resStep ? `${resStep.durationMs || 15}ms` : 'executed';
      
      let serverTag = 'Gmail';
      if (call.tool.startsWith('docs_')) serverTag = 'Docs';
      if (call.tool.startsWith('calendar_')) serverTag = 'Calendar';

      toolStepsHtml += `
        <div class="tool-step-card">
          <div class="tool-step-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
            <div class="tool-step-title">
              <span>⚡</span>
              <span>[${serverTag} MCP] ${escapeHtml(call.tool)}</span>
            </div>
            <div class="tool-step-status">
              <span>✔</span>
              <span>${duration}</span>
            </div>
          </div>
          <div class="tool-step-body" style="display: none;">
<strong>Arguments:</strong>
${escapeHtml(JSON.stringify(call.args, null, 2))}
${resStep ? `\n\n<strong>Result Payload:</strong>\n${escapeHtml(JSON.stringify(resStep.result, null, 2))}` : ''}
          </div>
        </div>
      `;
    });
    toolStepsHtml += `</div>`;
  }

  let actionsHtml = '';
  if (docCreated || calCreated) {
    actionsHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">`;
    if (docCreated) {
      actionsHtml += `
        <button class="small-btn primary" onclick="switchTab('docsTab'); selectDoc('${docCreated.documentId}')">
          📄 View "${escapeHtml(docCreated.title)}" in Google Docs
        </button>
      `;
    }
    if (calCreated) {
      actionsHtml += `
        <button class="small-btn primary" style="background: #10b981; border-color: #10b981;" onclick="switchTab('calendarTab')">
          📅 View Scheduled Event in Google Calendar
        </button>
      `;
    }
    actionsHtml += `</div>`;
  }

  msgEl.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      ${toolStepsHtml}
      <div class="markdown-body">
        ${formatMarkdown(reply)}
      </div>
      ${actionsHtml}
      <div style="font-size: 0.68rem; color: var(--text-dim); margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
        Executed via <strong>${escapeHtml(engine)}</strong>
      </div>
    </div>
  `;

  messagesContainer.appendChild(msgEl);
  scrollToBottom();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* ==========================================================================
   Settings & Utilities
   ========================================================================== */
function openSettings() {
  if (state.systemStatus) {
    modelSelect.value = state.systemStatus.aiEngine?.model || 'gemini-2.0-flash';
    serviceModeSelect.value = state.systemStatus.googleWorkspace?.mode || 'sandbox';
    oauthConfiguredBadge.textContent = state.systemStatus.googleWorkspace?.isLiveConfigured
      ? 'Configured in .env (Active: Gmail, Docs, Calendar)'
      : 'Not configured in .env (Using Sandbox)';
  }
  settingsModal.style.display = 'flex';
}

async function saveSettings() {
  const geminiApiKey = geminiApiKeyInput.value.trim();
  const model = modelSelect.value;
  const mode = serviceModeSelect.value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geminiApiKey: geminiApiKey || undefined,
        model,
        mode
      })
    });
    const data = await res.json();
    settingsModal.style.display = 'none';
    fetchStatus();
    alert('Settings updated successfully!');
  } catch (err) {
    alert(`Failed to save settings: ${err.message}`);
  }
}

// Markdown Formatter (Headers, Lists, Bold, Inline code, Quotes)
function formatMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^#### (.*$)/gim, '<h4 style="color: #cbd5e1; margin: 12px 0 4px 0; font-size: 0.95rem;">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 1.05rem;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #ffffff; margin: 16px 0 8px 0; font-size: 1.15rem;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color: #ffffff; margin: 18px 0 10px 0; font-size: 1.3rem;">$1</h1>');

  // Blockquotes
  html = html.replace(/^\&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Inline Code
  html = html.replace(/\`([^`]+)\`/gim, '<code>$1</code>');

  // Bullet Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  // Line breaks for remaining text
  html = html.replace(/\n\n/g, '<p></p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRelativeDate(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
