import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, MessageSquare, Mail, FileText, Calendar, HardDrive, Globe, 
  History, ShieldCheck, Settings, Plus, Send, Copy, Check, ChevronLeft, 
  ChevronRight, ExternalLink, Menu, X, Sun, Moon, Laptop, RotateCw, 
  Search, ShieldAlert, Key, CheckCircle2, AlertCircle, Bot, User, ArrowUpRight, LogOut
} from 'lucide-react';
import MarkdownRenderer from './components/MarkdownRenderer';

export default function App() {
  // Navigation & Layout
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'gmail' | 'docs' | 'calendar' | 'drive' | 'search' | 'history' | 'approvals'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('afzal_theme') || 'system';
  });

  // System State & Data
  const [status, setStatus] = useState(null);
  const [tools, setTools] = useState([]);
  const [emails, setEmails] = useState([]);
  const [docs, setDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Selected items for modal/drawer details
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Chat Conversation State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to **Afzal’s Personal AI Space**.\n\nI am connected to your **Gmail**, **Google Docs**, **Google Calendar**, **Google Drive**, and **Tavily Web Search** through the Model Context Protocol (MCP).\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Modals & Forms
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Form State
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.0-flash');
  const [scopeLevel, setScopeLevel] = useState('initial');
  const [gmailOption, setGmailOption] = useState('optionB');
  const [draftData, setDraftData] = useState({ to: '', subject: '', body: '' });
  const [eventData, setEventData] = useState({ summary: '', start: '', end: '', attendees: '', location: 'Google Meet', description: '' });
  const [folderData, setFolderData] = useState({ name: '' });
  const [shareData, setShareData] = useState({ fileId: '', email: '', role: 'reader' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [oauthCreds, setOauthCreds] = useState({ clientId: '', clientSecret: '', refreshToken: '' });
  const [approvalsEnabled, setApprovalsEnabled] = useState(true);
  const [accountProfile, setAccountProfile] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (targetTheme) => {
    const isDark = targetTheme === 'dark' || (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('afzal_theme', targetTheme);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Listen for system color scheme changes when in 'system' mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Initial Data Fetch & OAuth Callback Handling
  useEffect(() => {
    fetchAllData();

    // Check for Google OAuth redirect callback params
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === 'success') {
        const email = params.get('email');
        const name = params.get('name');
        showToast(`Signed in successfully as ${name || email || 'Google Account'}!`, 'success');
        fetchStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('auth') === 'error') {
        const msg = params.get('message') || 'Authentication failed';
        showToast(`Sign-in error: ${msg}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}

    const interval = setInterval(() => {
      fetchApprovals();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTab]);

  // Dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  const fetchAllData = () => {
    fetchStatus();
    fetchTools();
    fetchEmails();
    fetchDocs();
    fetchCalendar();
    fetchDriveFiles();
    fetchHistory();
    fetchApprovals();
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      if (data.accountProfile) setAccountProfile(data.accountProfile);
      if (data.approvals) setApprovalsEnabled(data.approvals.approvalsRequired);
      if (data.gmailMcpOption?.active) setGmailOption(data.gmailMcpOption.active);
      if (data.aiEngine?.model) setGeminiModelInput(data.aiEngine.model);
    } catch (e) {
      console.error('Error fetching status:', e);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      setTools(data.tools || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/gmail/messages?maxResults=20');
      const data = await res.json();
      setEmails(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/docs?pageSize=20');
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar/events?maxResults=20');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDriveFiles = async () => {
    try {
      const res = await fetch('/api/drive/files');
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistoryList(data.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals/pending');
      const data = await res.json();
      setPendingApprovals(data.pending || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Chat Actions
  const handleSendMessage = async (textToSend = null, bypassApproval = false) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isThinking) return;

    if (!textToSend) {
      setInputPrompt('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }

    const newTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: prompt, timestamp: newTimestamp }]);
    setIsThinking(true);
    setThinkingStatus('Processing instruction...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: messages, bypassApproval })
      });
      const data = await res.json();

      if (data.approvalRequired) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          approvalRequired: true,
          approval: data.approval,
          steps: data.steps,
          engine: data.engine,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        fetchApprovals();
        fetchHistory();
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply || 'Execution completed.',
          steps: data.steps,
          engine: data.engine,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        fetchAllData();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an issue processing that request: ${err.message}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsThinking(false);
      setThinkingStatus('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `New conversation started. How can I assist you in your workspace?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setActiveTab('chat');
    showToast('New conversation started', 'info');
  };

  const copyResponse = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    showToast('Response copied to clipboard', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Approvals
  const handleApprovalDecision = async (approvalId, decision) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const result = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: decision === 'approve'
          ? `Action approved and executed. The operation has been completed and recorded in history.`
          : `Action rejected. The proposed operation was cancelled.`,
        steps: [
          { type: 'approval_decision', decision: decision.toUpperCase(), id: approvalId },
          ...(result.toolResult ? [{ type: 'tool_result', tool: result.record?.toolName, result: result.toolResult }] : [])
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      showToast(decision === 'approve' ? 'Action approved and executed' : 'Action cancelled', decision === 'approve' ? 'success' : 'info');
      fetchAllData();
    } catch (err) {
      showToast('Failed to process approval: ' + err.message, 'error');
    }
  };

  // Integrations: Gmail Compose
  const handleSendDraft = async (e) => {
    e.preventDefault();
    if (!draftData.to || !draftData.subject) return;
    try {
      const res = await fetch('/api/gmail/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Draft email saved to Gmail', 'success');
        setShowCompose(false);
        setDraftData({ to: '', subject: '', body: '' });
        fetchEmails();
      } else {
        showToast('Failed to save draft', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Integrations: Calendar Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventData.summary || !eventData.start) return;
    try {
      const res = await fetch('/api/calendar/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventData,
          attendees: eventData.attendees.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Calendar event scheduled', 'success');
        setShowNewEvent(false);
        setEventData({ summary: '', start: '', end: '', attendees: '', location: 'Google Meet', description: '' });
        fetchCalendar();
      } else {
        showToast('Failed to create event', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Integrations: Drive Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderData.name) return;
    try {
      await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderData.name })
      });
      showToast(`Folder "${folderData.name}" created`, 'success');
      setShowNewFolder(false);
      setFolderData({ name: '' });
      fetchDriveFiles();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Integrations: Drive Share
  const handleShareFile = async (e) => {
    e.preventDefault();
    if (!shareData.fileId || !shareData.email) return;
    try {
      await fetch('/api/drive/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      });
      showToast(`Shared file with ${shareData.email}`, 'success');
      setShowShareModal(false);
      setShareData({ fileId: '', email: '', role: 'reader' });
      fetchDriveFiles();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Web Research (Tavily)
  const handleTavilySearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      showToast('Search failed: ' + e.message, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Google Authentication Handlers
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const returnTo = window.location.origin;
      const res = await fetch(`/api/auth/google/url?scopeLevel=${scopeLevel}&returnTo=${encodeURIComponent(returnTo)}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setShowAuthModal(true);
        showToast('Google OAuth credentials required. Follow the steps in the setup guide.', 'info');
      }
    } catch (err) {
      setShowAuthModal(true);
      showToast('Google OAuth setup required: ' + err.message, 'info');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/google/signout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAccountProfile({ authorized: false, mode: 'sandbox' });
        showToast('Successfully signed out of Google account', 'info');
        fetchStatus();
      }
    } catch (err) {
      showToast('Failed to sign out: ' + err.message, 'error');
    }
  };

  const handleDemoSignIn = async (name = 'Afzal', email = 'afzal@workspace.ai') => {
    try {
      const res = await fetch('/api/auth/google/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAccountProfile(data.profile);
        setShowAuthModal(false);
        showToast(`Signed in as ${data.profile.name} (Verified Demo Mode)`, 'success');
        fetchStatus();
      }
    } catch (err) {
      showToast('Demo sign-in failed: ' + err.message, 'error');
    }
  };

  // Settings: Google OAuth URL (opens directly or in popup)
  const handleStartOAuth = async () => {
    handleGoogleSignIn();
  };

  // Settings: Save OAuth Credentials
  const handleSaveOAuthCreds = async () => {
    try {
      const res = await fetch('/api/auth/google/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthCreds)
      });
      const data = await res.json();
      if (data.success) {
        showToast('OAuth credentials saved', 'success');
        setShowAuthModal(false);
        fetchStatus();
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  // Settings: Switch Gmail MCP Option
  const handleSwitchGmailOption = async (option) => {
    try {
      const res = await fetch('/api/mcp/gmail-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option })
      });
      const data = await res.json();
      if (data.success) {
        setGmailOption(data.active);
        showToast(`Switched Gmail mode to ${option === 'optionB' ? 'Custom HTTP' : 'Official Stdio'}`, 'success');
        fetchStatus();
        fetchTools();
      }
    } catch (e) {
      showToast('Failed to switch option: ' + e.message, 'error');
    }
  };

  // Settings: Toggle Approvals Gate
  const handleToggleApprovals = async (checked) => {
    try {
      setApprovalsEnabled(checked);
      await fetch('/api/approvals/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked })
      });
      showToast(checked ? 'Human-in-the-loop approvals active' : 'Auto-execution enabled', 'info');
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  // Settings: Save Gemini Configuration
  const handleSaveGeminiSettings = async () => {
    try {
      const res = await fetch('/api/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKeyInput, model: geminiModelInput })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Gemini model settings updated', 'success');
        fetchStatus();
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Filtered History
  const filteredHistory = historyFilter === 'ALL'
    ? historyList
    : historyList.filter(h => h.status === historyFilter);

  // Suggestions for empty state
  const suggestions = [
    {
      title: 'Summarize latest emails',
      description: 'Review recent Gmail messages and highlight items requiring action',
      prompt: 'Show me my latest five emails and summarize the important ones.'
    },
    {
      title: 'Create AI Workshop notes',
      description: 'Generate an Agentic AI fundamentals document in Google Docs',
      prompt: "Create a Google Doc titled 'AI Workshop Notes' and explain the fundamentals of Agentic AI."
    },
    {
      title: 'Coordinate multi-app workflow',
      description: 'Search emails, create notes in Docs, and schedule a prep meeting',
      prompt: 'Find emails related to my upcoming workshop, prepare a summary in Google Docs, and create a calendar event for the workshop.'
    },
    {
      title: 'Search web intelligence',
      description: 'Query Tavily for the latest Model Context Protocol updates',
      prompt: 'Search the internet for the latest Model Context Protocol updates.'
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden transition-colors duration-150">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Navigation Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 dark:border-slate-800/80
        bg-white dark:bg-[#0f1523] transition-all duration-200 ease-in-out shrink-0
        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 block">
                  Afzal’s Space
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  Personal AI Workspace
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (mobileMenuOpen) setMobileMenuOpen(false);
              else setSidebarCollapsed(!sidebarCollapsed);
            }}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className={`
              w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs
              bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition
              ${sidebarCollapsed ? 'px-0' : ''}
            `}
            title="New Chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <button
            onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'chat'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Conversation"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Conversation</span>}
          </button>

          <div className="pt-2 pb-1">
            {!sidebarCollapsed && (
              <span className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Integrations
              </span>
            )}
          </div>

          <button
            onClick={() => { setActiveTab('gmail'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'gmail'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Gmail"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Gmail</span>}
            </div>
            {!sidebarCollapsed && emails.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                {emails.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('docs'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'docs'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Google Docs"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Google Docs</span>}
            </div>
            {!sidebarCollapsed && docs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                {docs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'calendar'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Google Calendar"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Calendar</span>}
            </div>
            {!sidebarCollapsed && events.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                {events.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('drive'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'drive'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Google Drive"
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Google Drive</span>}
            </div>
            {!sidebarCollapsed && driveFiles.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                {driveFiles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('search'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'search'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Web Research"
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Web Research</span>}
          </button>

          <div className="pt-2 pb-1">
            {!sidebarCollapsed && (
              <span className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Governance
              </span>
            )}
          </div>

          <button
            onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'history'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Activity & History"
          >
            <History className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Activity History</span>}
          </button>

          <button
            onClick={() => { setActiveTab('approvals'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'approvals'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Approvals"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Approvals</span>}
            </div>
            {pendingApprovals.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        </div>

        {/* Bottom Status & Settings */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          {/* User Profile Card (when signed in) */}
          {accountProfile?.authorized && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                {accountProfile.picture ? (
                  <img
                    src={accountProfile.picture}
                    alt={accountProfile.name || 'User'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-500/30 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-[11px] font-semibold shrink-0 shadow-sm ${accountProfile.picture ? 'hidden' : 'flex'}`}
                >
                  {(accountProfile.name || accountProfile.email || 'A').charAt(0).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="truncate min-w-0">
                    <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block truncate">
                      {accountProfile.name || 'Afzal'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {accountProfile.email || 'Google Account'}
                    </span>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={handleSignOut}
                  title="Sign out of Google"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition"
            title="Settings & System Status"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Settings & Status</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 tracking-tight">
                {activeTab === 'chat' && 'Conversation'}
                {activeTab === 'gmail' && 'Gmail Inbox'}
                {activeTab === 'docs' && 'Google Docs'}
                {activeTab === 'calendar' && 'Google Calendar'}
                {activeTab === 'drive' && 'Google Drive'}
                {activeTab === 'search' && 'Web Research'}
                {activeTab === 'history' && 'Activity History'}
                {activeTab === 'approvals' && 'Pending Approvals'}
              </h1>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2.5">
            
            {/* Google Authentication: Sign in with Google OR User Profile + Sign Out */}
            {accountProfile?.authorized ? (
              <div className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/70 shadow-sm transition">
                {accountProfile.picture ? (
                  <img
                    src={accountProfile.picture}
                    alt={accountProfile.name || 'User'}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-500/40 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-[10px] font-semibold shrink-0 shadow-sm ${accountProfile.picture ? 'hidden' : 'flex'}`}
                >
                  {(accountProfile.name || accountProfile.email || 'A').charAt(0).toUpperCase()}
                </div>

                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[130px] truncate hidden sm:inline-block">
                  {accountProfile.name || accountProfile.email?.split('@')[0] || 'Afzal'}
                </span>

                <button
                  onClick={handleSignOut}
                  title="Sign out of Google"
                  className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-600"
                title="Sign in with your Google account"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign in</span>
              </button>
            )}

            {/* Discreet Connection Badge */}
            <div 
              onClick={() => setShowSettings(true)}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs transition hover:border-slate-300 dark:hover:border-slate-600"
              title="Click to view MCP tools and system diagnostic status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Connected
              </span>
            </div>

            {/* Theme Toggle (Quick) */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/70 p-0.5 border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="System default"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Tab 1: Chat Conversation View */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#090d16]">
            
            {/* Conversation Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* If conversation only has welcome message or is clean, show suggestions */}
                {messages.length <= 1 && (
                  <div className="my-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                        Welcome, Afzal
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                        I can help orchestrate your Gmail, Google Docs, Calendar, Drive, and web research using Model Context Protocol.
                      </p>
                    </div>

                    {/* Curated Suggestion Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
                      {suggestions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3.5 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm hover:shadow transition group text-left"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {item.title}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                            {item.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render Messages */}
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-indigo-600 dark:text-indigo-400">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble Content */}
                    <div className={`max-w-[85%] md:max-w-[78%] space-y-2`}>
                      <div className={`
                        rounded-2xl px-4 py-3.5 text-xs leading-relaxed shadow-sm transition
                        ${msg.role === 'user'
                          ? 'bg-indigo-600 text-white font-normal'
                          : 'bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
                        }
                      `}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}

                        {/* Expandable Tool Execution Trace (discreet) */}
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <details className="text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer group">
                              <summary className="font-medium hover:text-slate-700 dark:hover:text-slate-300 select-none flex items-center gap-1.5">
                                <span>Tool Execution ({msg.steps.length} steps)</span>
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-2 border-l border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                                {msg.steps.map((st, i) => (
                                  <div key={i} className="py-0.5">
                                    {st.type === 'tool_call' && (
                                      <div className="text-indigo-600 dark:text-indigo-400">
                                        ⚡ Invocated {st.tool}()
                                      </div>
                                    )}
                                    {st.type === 'tool_result' && (
                                      <div className="text-emerald-600 dark:text-emerald-400">
                                        ✓ Completed ({st.durationMs || 15}ms)
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Interactive Approval Card */}
                        {msg.approvalRequired && msg.approval && (
                          <div className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-2">
                            <div className="flex items-center gap-2 font-medium text-xs">
                              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Human Authorization Required</span>
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                              {msg.approval.summary}
                            </p>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => handleApprovalDecision(msg.approval.id, 'reject')}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprovalDecision(msg.approval.id, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition"
                              >
                                Approve & Execute
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer: Timestamp & Copy */}
                      <div className={`flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 px-1 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{msg.timestamp}</span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => copyResponse(msg.content, index)}
                            className="hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Thinking Indicator */}
                {isThinking && (
                  <div className="flex gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0 text-indigo-500 shadow-sm">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      <span>{thinkingStatus || 'Reasoning with MCP servers...'}</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Persistent Composer */}
            <div className="p-4 md:p-5 border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0f1523]/90 backdrop-blur-md">
              <div className="max-w-3xl mx-auto">
                <div className="relative rounded-2xl bg-slate-100 dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/90 focus-within:border-indigo-500 dark:focus-within:border-indigo-500/80 shadow-sm transition">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything across Gmail, Docs, Calendar, Drive, or Web Research..."
                    className="w-full bg-transparent px-4 py-3.5 pr-14 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputPrompt.trim() || isThinking}
                    className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white transition shadow-sm"
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>Enter to send • Shift + Enter for new line</span>
                  <span className="font-mono text-[10px]">{status?.aiEngine?.model || 'gemini-2.0-flash'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Gmail View */}
        {activeTab === 'gmail' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Gmail Inbox</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Connected via Gmail MCP Server ({gmailOption === 'optionA' ? 'Stdio' : 'Custom HTTP'})</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchEmails} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition" title="Refresh">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowCompose(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition shadow-sm">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Compose Draft</span>
                  </button>
                </div>
              </div>

              {emails.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No emails found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {emails.map(email => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">{email.from}</span>
                        <span>{new Date(email.date).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">{email.subject}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{email.snippet}</p>
                      {email.importance === 'High' && (
                        <div className="mt-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-medium">
                            Priority
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Google Docs View */}
        {activeTab === 'docs' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Google Docs Repository</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Managed via Docs MCP Server</p>
                </div>
                <button onClick={fetchDocs} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition" title="Refresh">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {docs.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No documents found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">{doc.title}</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {doc.body || doc.content || 'No text preview available.'}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Modified {new Date(doc.modifiedTime).toLocaleDateString()}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">View Document →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Google Calendar View */}
        {activeTab === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Calendar Schedule</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Managed via Calendar MCP Server</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchCalendar} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition" title="Refresh">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowNewEvent(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition shadow-sm">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Event</span>
                  </button>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No upcoming calendar events.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 shadow-sm transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{event.summary}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(event.start).toLocaleDateString()} at {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        {event.location && <p>📍 Location: {event.location}</p>}
                        {event.attendees && event.attendees.length > 0 && (
                          <p>👥 Attendees: {event.attendees.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Google Drive View */}
        {activeTab === 'drive' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Google Drive Files</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Connected via Drive MCP Server</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchDriveFiles} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition" title="Refresh">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium transition shadow-sm hover:border-slate-300">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Folder</span>
                  </button>
                  <button onClick={() => setShowShareModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition shadow-sm">
                    <span>Share Document</span>
                  </button>
                </div>
              </div>

              {driveFiles.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No files found.
                </div>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map(file => {
                    const isFolder = file.mimeType?.includes('folder');
                    return (
                      <div
                        key={file.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {isFolder ? (
                            <HardDrive className="w-4 h-4 text-amber-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-500" />
                          )}
                          <div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{file.mimeType}</span>
                          </div>
                        </div>

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Web Research View */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Web Research</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time external documentation & information via Tavily Search</p>
              </div>

              <form onSubmit={handleTavilySearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter a topic or query (e.g. 'Model Context Protocol 2026 updates')..."
                  className="flex-1 bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              </form>

              {searchResults && (
                <div className="space-y-3 pt-2">
                  {searchResults.answer && (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed shadow-sm">
                      <span className="font-semibold block mb-1">Synthesized Summary:</span>
                      {searchResults.answer}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {(searchResults.results || []).map((res, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-1">
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {res.title} <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{res.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Activity History View */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Activity History</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Complete execution record across all MCP servers</p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700/60 text-xs">
                  {['ALL', 'COMPLETED', 'PENDING_APPROVAL', 'FAILED'].map(f => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                        historyFilter === f
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f === 'COMPLETED' ? 'Completed' : f === 'PENDING_APPROVAL' ? 'Approvals' : 'Failed'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No activity found for selected filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : item.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.prompt}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.resultSummary}</p>
                      
                      {item.toolsCalled && item.toolsCalled.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.toolsCalled.map(t => (
                            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.status === 'PENDING_APPROVAL' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                          <button
                            onClick={() => handleApprovalDecision(item.approvalId || item.id, 'reject')}
                            className="px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 text-xs font-medium"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(item.approvalId || item.id, 'approve')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 8: Approvals View */}
        {activeTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090d16]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Human-in-the-Loop Approvals</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Actions requiring user authorization before executing external mutations</p>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131a29] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No actions currently awaiting approval.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map(approval => (
                    <div
                      key={approval.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#131a29] border border-amber-200 dark:border-amber-800/40 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <span>Action Request: {approval.toolName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(approval.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200">{approval.summary}</p>
                      
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {JSON.stringify(approval.args, null, 2)}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleApprovalDecision(approval.id, 'reject')}
                          className="px-4 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovalDecision(approval.id, 'approve')}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition shadow-sm"
                        >
                          Approve & Execute
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- MODALS & DIALOGS --- */}

      {/* Settings & System Status Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Settings & System Status</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              
              {/* Appearance / Theme */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-800 dark:text-slate-200 block">Appearance</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Laptop }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleThemeChange(item.id)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                        theme === item.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gemini Model & API Key */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-medium text-slate-800 dark:text-slate-200 block">Gemini AI Configuration</label>
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Model Selection:</span>
                  <select
                    value={geminiModelInput}
                    onChange={(e) => setGeminiModelInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Gemini API Key:</span>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="Enter GEMINI_API_KEY to override env..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveGeminiSettings}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition"
                >
                  Save Model Settings
                </button>
              </div>

              {/* Google OAuth & Scopes */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-800 dark:text-slate-200">Google Workspace Auth</label>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    accountProfile?.authorized ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600'
                  }`}>
                    {accountProfile?.authorized ? (accountProfile.mode === 'live' ? 'Google Live' : 'Demo Mode') : 'Not Connected'}
                  </span>
                </div>
                {accountProfile?.authorized ? (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      {accountProfile.picture ? (
                        <img src={accountProfile.picture} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-indigo-500/30 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                          {(accountProfile.name || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-100 block truncate">{accountProfile.name || 'Afzal'}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{accountProfile.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium transition text-xs flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out of Google</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowSettings(false); handleGoogleSignIn(); }}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium transition text-xs"
                      title="Configure OAuth Client ID & Secret"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Human-in-the-Loop Approvals */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-slate-800 dark:text-slate-200 block">Approval Gate</label>
                    <span className="text-[11px] text-slate-500">Require approval before external operations (e.g. sharing documents)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={approvalsEnabled}
                    onChange={(e) => handleToggleApprovals(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>
              </div>

              {/* Registered Tools Diagnostics */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-800 dark:text-slate-200">Active MCP Tools</label>
                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{tools.length} Tools</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                  {tools.map(t => (
                    <div key={t.name} className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{t.name}</span>
                      <span className="opacity-60">{t.serverName}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Google Cloud OAuth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Google Sign-In & OAuth Setup</h3>
                  <p className="text-[11px] text-slate-500">Connect your Google Workspace or Test Sign-In</p>
                </div>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              
              {/* Quick Setup Instructions */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 text-slate-800 dark:text-slate-200 space-y-2">
                <span className="font-semibold text-indigo-950 dark:text-indigo-300 block">4 Quick Steps to Configure Google Cloud:</span>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <li>
                    Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Google Cloud Console</a> and create or select a project.
                  </li>
                  <li>Enable <strong>Gmail API</strong>, <strong>Google Docs API</strong>, and <strong>Google Drive API</strong>.</li>
                  <li>In <strong>OAuth Consent Screen</strong>: set User Type to <em>External</em> and add your email to <strong>Test Users</strong>.</li>
                  <li>In <strong>Credentials</strong>: create <em>OAuth Client ID</em> (Web Application) with the Redirect URI below.</li>
                </ol>
              </div>

              {/* Redirect URI with copy button */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">Authorized Redirect URI:</label>
                <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="flex-1 truncate">http://localhost:3001/api/auth/google/callback</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:3001/api/auth/google/callback');
                      showToast('Redirect URI copied to clipboard', 'success');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0"
                    title="Copy redirect URI"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scope Level Choice */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">Requested Permissions (Scopes)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScopeLevel('signin')}
                    className={`p-2 rounded-xl border text-left transition ${
                      scopeLevel === 'signin'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 font-semibold text-indigo-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Sign-In Only</div>
                    <div className="text-[9px] text-slate-400">email, profile</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeLevel('initial')}
                    className={`p-2 rounded-xl border text-left transition ${
                      scopeLevel === 'initial'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 font-semibold text-indigo-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Gmail + Docs</div>
                    <div className="text-[9px] text-slate-400">read email & docs</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeLevel('broad')}
                    className={`p-2 rounded-xl border text-left transition ${
                      scopeLevel === 'broad'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 font-semibold text-indigo-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Full Workspace</div>
                    <div className="text-[9px] text-slate-400">calendar & drive</div>
                  </button>
                </div>
              </div>

              {/* Client ID & Secret Inputs */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">OAuth 2.0 Credentials</label>
                <input
                  type="text"
                  placeholder="Google Client ID (e.g. xxxxx.apps.googleusercontent.com)"
                  value={oauthCreds.clientId}
                  onChange={(e) => setOauthCreds({ ...oauthCreds, clientId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="password"
                  placeholder="Google Client Secret"
                  value={oauthCreds.clientSecret}
                  onChange={(e) => setOauthCreds({ ...oauthCreds, clientSecret: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveOAuthCreds();
                      if (oauthCreds.clientId && oauthCreds.clientSecret) {
                        handleGoogleSignIn();
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Save & Sign in with Google</span>
                  </button>
                </div>
              </div>

              {/* Instant Test / Sandbox Sign-In */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-center">
                <span className="text-[11px] text-slate-500 block">Want to test the logged-in UI immediately without credentials?</span>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('Afzal', 'afzal@workspace.ai')}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Instant Test Sign-In as Afzal (Demo Profile)</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Compose Draft Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Draft Email</h3>
              <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSendDraft} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">To:</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={draftData.to}
                  onChange={(e) => setDraftData({ ...draftData, to: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Subject:</label>
                <input
                  type="text"
                  required
                  placeholder="Subject line"
                  value={draftData.subject}
                  onChange={(e) => setDraftData({ ...draftData, subject: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Message Body:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write draft content..."
                  value={draftData.body}
                  onChange={(e) => setDraftData({ ...draftData, body: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Schedule Calendar Event</h3>
              <button onClick={() => setShowNewEvent(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Title:</label>
                <input
                  type="text"
                  required
                  placeholder="Meeting title"
                  value={eventData.summary}
                  onChange={(e) => setEventData({ ...eventData, summary: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 block mb-1">Start Time:</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventData.start}
                    onChange={(e) => setEventData({ ...eventData, start: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">End Time:</label>
                  <input
                    type="datetime-local"
                    value={eventData.end}
                    onChange={(e) => setEventData({ ...eventData, end: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Attendees (comma separated):</label>
                <input
                  type="text"
                  placeholder="alex@example.com, elena@example.com"
                  value={eventData.attendees}
                  onChange={(e) => setEventData({ ...eventData, attendees: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEvent(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Create Folder in Drive</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Folder name"
                value={folderData.name}
                onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Document Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Share Drive Document</h3>
            <form onSubmit={handleShareFile} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">File ID:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. file_drive_101"
                  value={shareData.fileId}
                  onChange={(e) => setShareData({ ...shareData, fileId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Recipient Email:</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={shareData.email}
                  onChange={(e) => setShareData({ ...shareData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium"
                >
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Reader Drawer */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedEmail.subject}</h3>
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p><strong>From:</strong> {selectedEmail.from}</p>
              <p><strong>Date:</strong> {new Date(selectedEmail.date).toLocaleString()}</p>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131a29] border border-slate-200 dark:border-slate-800/80 leading-relaxed whitespace-pre-wrap mt-3">
                {selectedEmail.snippet}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedEmail(null);
                  handleSendMessage(`Draft a reply to ${selectedEmail.from} about "${selectedEmail.subject}"`);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700 transition"
              >
                Draft Reply via AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Reader Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedDoc.title}</h3>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131a29] border border-slate-200 dark:border-slate-800 text-xs leading-relaxed max-h-96 overflow-y-auto">
              <MarkdownRenderer content={selectedDoc.body || selectedDoc.content} />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">ID: {selectedDoc.id || selectedDoc.documentId}</span>
              {selectedDoc.url && (
                <a
                  href={selectedDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700 transition inline-flex items-center gap-1.5"
                >
                  <span>Open in Workspace Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
