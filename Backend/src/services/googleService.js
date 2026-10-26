import { google } from 'googleapis';
import { sandboxStore } from './sandboxStore.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_FILE = path.resolve(__dirname, '../../data/oauth_session.json');

class GoogleService {
  constructor() {
    this.mode = process.env.SERVICE_MODE || 'sandbox'; // 'sandbox' | 'live'
    this.authClient = null;
    this.storedProfile = null;
    this.initAuth();
  }

  initAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    // Load persisted token session if available
    if (!refreshToken && fs.existsSync(SESSION_FILE)) {
      try {
        const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        if (session.refreshToken) {
          refreshToken = session.refreshToken;
        }
        if (session.profile) {
          this.storedProfile = session.profile;
        }
      } catch (e) {
        console.warn('[GoogleService] Failed reading session file:', e.message);
      }
    }

    if (clientId && clientSecret && refreshToken) {
      try {
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        oauth2Client.on('tokens', (newTokens) => {
          if (newTokens.refresh_token) {
            try {
              let existing = {};
              if (fs.existsSync(SESSION_FILE)) {
                existing = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
              }
              existing.refreshToken = newTokens.refresh_token;
              existing.updatedAt = new Date().toISOString();
              fs.writeFileSync(SESSION_FILE, JSON.stringify(existing, null, 2));
            } catch (e) {}
          }
        });

        this.authClient = oauth2Client;
        this.gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
        this.docsClient = google.docs({ version: 'v1', auth: oauth2Client });
        this.calendarClient = google.calendar({ version: 'v3', auth: oauth2Client });
        this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        this.mode = 'live';
        console.log('[GoogleService] Successfully initialized live Google Workspace OAuth client (Gmail, Docs, Calendar, Drive)');
      } catch (err) {
        console.warn('[GoogleService] Failed to initialize live OAuth client, defaulting to Sandbox:', err.message);
        this.authClient = null;
      }
    } else {
      this.authClient = null;
    }
  }

  hasOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    return Boolean(clientId && clientSecret && clientId.trim().length > 10);
  }

  isLiveConfigured() {
    return Boolean(this.authClient);
  }

  getMode() {
    return this.mode === 'live' && this.isLiveConfigured() ? 'live' : 'sandbox';
  }

  setMode(mode) {
    if (mode === 'live' && !this.isLiveConfigured()) {
      return { success: false, mode: 'sandbox', error: 'Google OAuth credentials not configured in environment' };
    }
    this.mode = mode;
    return { success: true, mode: this.getMode() };
  }

  // --- Gmail Service Methods ---
  async listMessages(options = {}) {
    if (this.getMode() === 'live' && this.gmailClient) {
      try {
        const maxResults = options.maxResults || 5;
        const res = await this.gmailClient.users.messages.list({
          userId: 'me',
          maxResults,
          q: options.q || '',
          labelIds: options.labelIds
        });

        const messages = [];
        if (res.data.messages) {
          for (const m of res.data.messages) {
            const detail = await this.gmailClient.users.messages.get({
              userId: 'me',
              id: m.id,
              format: 'full'
            });
            const headers = detail.data.payload?.headers || [];
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            messages.push({
              id: detail.data.id,
              threadId: detail.data.threadId,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              snippet: detail.data.snippet,
              date: getHeader('Date') || new Date(Number(detail.data.internalDate)).toISOString(),
              labels: detail.data.labelIds || [],
              importance: (detail.data.labelIds || []).includes('IMPORTANT') ? 'High' : 'Normal',
              isRead: !(detail.data.labelIds || []).includes('UNREAD')
            });
          }
        }

        return {
          messages,
          resultSizeEstimate: res.data.resultSizeEstimate || messages.length,
          nextPageToken: res.data.nextPageToken || null
        };
      } catch (err) {
        console.error('[GoogleService] Live Gmail list error, falling back to sandbox:', err.message);
        return sandboxStore.listMessages(options);
      }
    }

    return sandboxStore.listMessages(options);
  }

  async getMessage(id) {
    if (this.getMode() === 'live' && this.gmailClient) {
      try {
        const res = await this.gmailClient.users.messages.get({
          userId: 'me',
          id,
          format: 'full'
        });
        const headers = res.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        // Extract body
        let body = res.data.snippet || '';
        const parts = res.data.payload?.parts || [];
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }

        return {
          id: res.data.id,
          threadId: res.data.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          snippet: res.data.snippet,
          body,
          date: getHeader('Date') || new Date(Number(res.data.internalDate)).toISOString(),
          labels: res.data.labelIds || []
        };
      } catch (err) {
        console.error('[GoogleService] Live Gmail get error, falling back to sandbox:', err.message);
        return sandboxStore.getMessage(id);
      }
    }

    return sandboxStore.getMessage(id);
  }

  async searchMessages(options = {}) {
    return this.listMessages({ q: options.query, maxResults: options.maxResults });
  }

  async createDraft(options) {
    if (this.getMode() === 'live' && this.gmailClient) {
      try {
        const emailLines = [
          `To: ${options.to}`,
          `Subject: ${options.subject}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          options.body
        ];
        const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url');

        const res = await this.gmailClient.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: { raw }
          }
        });

        return {
          id: res.data.id,
          status: 'DRAFT_CREATED',
          to: options.to,
          subject: options.subject,
          createdTime: new Date().toISOString()
        };
      } catch (err) {
        console.error('[GoogleService] Live createDraft error, falling back to sandbox:', err.message);
        return sandboxStore.createDraft(options);
      }
    }

    return sandboxStore.createDraft(options);
  }

  async sendMessage(options) {
    if (this.getMode() === 'live' && this.gmailClient) {
      try {
        const emailLines = [
          `To: ${options.to}`,
          `Subject: ${options.subject}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          options.body
        ];
        const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url');

        const res = await this.gmailClient.users.messages.send({
          userId: 'me',
          requestBody: { raw }
        });

        return {
          id: res.data.id,
          status: 'SENT',
          to: options.to,
          subject: options.subject,
          date: new Date().toISOString()
        };
      } catch (err) {
        console.error('[GoogleService] Live sendMessage error, falling back to sandbox:', err.message);
        return sandboxStore.sendMessage(options);
      }
    }

    return sandboxStore.sendMessage(options);
  }

  // --- Google Docs Service Methods ---
  async listDocuments(options = {}) {
    return sandboxStore.listDocuments(options);
  }

  async createDocument(options) {
    if (this.getMode() === 'live' && this.docsClient) {
      try {
        const res = await this.docsClient.documents.create({
          requestBody: {
            title: options.title || 'Untitled Document'
          }
        });
        const docId = res.data.documentId;

        if (options.content) {
          await this.docsClient.documents.batchUpdate({
            documentId: docId,
            requestBody: {
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: options.content
                  }
                }
              ]
            }
          });
        }

        return {
          documentId: docId,
          title: res.data.title,
          wordCount: (options.content || '').split(/\s+/).filter(Boolean).length,
          createdTime: new Date().toISOString(),
          url: `https://docs.google.com/document/d/${docId}/edit`,
          status: 'SUCCESS'
        };
      } catch (err) {
        console.error('[GoogleService] Live Docs createDocument error, falling back to sandbox:', err.message);
        return sandboxStore.createDocument(options);
      }
    }

    return sandboxStore.createDocument(options);
  }

  async getDocument(documentId) {
    if (this.getMode() === 'live' && this.docsClient) {
      try {
        const res = await this.docsClient.documents.get({ documentId });
        let fullText = '';
        const bodyContent = res.data.body?.content || [];
        for (const element of bodyContent) {
          if (element.paragraph?.elements) {
            for (const el of element.paragraph.elements) {
              if (el.textRun?.content) {
                fullText += el.textRun.content;
              }
            }
          }
        }

        return {
          documentId: res.data.documentId,
          title: res.data.title,
          content: fullText,
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          modifiedTime: new Date().toISOString()
        };
      } catch (err) {
        console.error('[GoogleService] Live Docs getDocument error, falling back to sandbox:', err.message);
        return sandboxStore.getDocument(documentId);
      }
    }

    return sandboxStore.getDocument(documentId);
  }

  async insertText(options) {
    if (this.getMode() === 'live' && this.docsClient) {
      try {
        const index = options.index !== undefined ? options.index : 1;
        await this.docsClient.documents.batchUpdate({
          documentId: options.documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index },
                  text: options.text + '\n'
                }
              }
            ]
          }
        });
        return {
          documentId: options.documentId,
          status: 'TEXT_INSERTED',
          charactersAdded: options.text.length,
          modifiedTime: new Date().toISOString()
        };
      } catch (err) {
        console.error('[GoogleService] Live Docs insertText error, falling back to sandbox:', err.message);
        return sandboxStore.insertText(options);
      }
    }

    return sandboxStore.insertText(options);
  }

  async updateDocument(options) {
    return sandboxStore.updateDocument(options);
  }

  async listDocuments(options) {
    return sandboxStore.listDocuments(options);
  }

  // --- Google Calendar Service Methods ---
  async listEvents(options = {}) {
    if (this.getMode() === 'live' && this.calendarClient) {
      try {
        const res = await this.calendarClient.events.list({
          calendarId: 'primary',
          maxResults: options.maxResults || 10,
          timeMin: options.timeMin || new Date().toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          q: options.query || ''
        });

        const events = (res.data.items || []).map(e => ({
          id: e.id,
          summary: e.summary || '(No Title)',
          description: e.description || '',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location || '',
          attendees: (e.attendees || []).map(a => a.email),
          status: e.status,
          htmlLink: e.htmlLink
        }));

        return {
          events,
          totalCount: events.length
        };
      } catch (err) {
        console.error('[GoogleService] Live Calendar listEvents error, falling back to sandbox:', err.message);
        return sandboxStore.listEvents(options);
      }
    }

    return sandboxStore.listEvents(options);
  }

  async createEvent(options) {
    if (this.getMode() === 'live' && this.calendarClient) {
      try {
        const attendeesList = Array.isArray(options.attendees)
          ? options.attendees.map(email => ({ email }))
          : options.attendees ? [{ email: options.attendees }] : [];

        const res = await this.calendarClient.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: options.summary,
            description: options.description || '',
            location: options.location || '',
            start: { dateTime: new Date(options.start).toISOString() },
            end: { dateTime: new Date(options.end).toISOString() },
            attendees: attendeesList
          }
        });

        return {
          id: res.data.id,
          status: 'EVENT_CREATED',
          summary: res.data.summary,
          start: res.data.start?.dateTime,
          end: res.data.end?.dateTime,
          location: res.data.location,
          attendees: (res.data.attendees || []).map(a => a.email),
          htmlLink: res.data.htmlLink
        };
      } catch (err) {
        console.error('[GoogleService] Live Calendar createEvent error, falling back to sandbox:', err.message);
        return sandboxStore.createEvent(options);
      }
    }

    return sandboxStore.createEvent(options);
  }

  async getEvent(eventId) {
    if (this.getMode() === 'live' && this.calendarClient) {
      try {
        const res = await this.calendarClient.events.get({
          calendarId: 'primary',
          eventId
        });
        return {
          id: res.data.id,
          summary: res.data.summary,
          description: res.data.description,
          start: res.data.start?.dateTime || res.data.start?.date,
          end: res.data.end?.dateTime || res.data.end?.date,
          location: res.data.location,
          attendees: (res.data.attendees || []).map(a => a.email),
          status: res.data.status,
          htmlLink: res.data.htmlLink
        };
      } catch (err) {
        console.error('[GoogleService] Live Calendar getEvent error, falling back to sandbox:', err.message);
        return sandboxStore.getEvent(eventId);
      }
    }

    return sandboxStore.getEvent(eventId);
  }

  // --- OAuth 2.0 Flow Methods (Phase 1) ---
  generateAuthUrl(clientId = null, clientSecret = null, redirectUri = null, scopeLevel = 'initial', state = null) {
    const cId = clientId || process.env.GOOGLE_CLIENT_ID;
    const cSec = clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

    if (!cId || !cSec) {
      throw new Error('Google Client ID and Client Secret are required to generate OAuth URL. Configure them in Backend/.env or paste in the UI modal.');
    }

    const oauth2Client = new google.auth.OAuth2(cId, cSec, rUri);
    
    const SIGNIN_SCOPES = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    // Phase 1 specification: Initially request scopes necessary to read Gmail and create documents
    const INITIAL_SCOPES = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/documents'
    ];

    // Broader scopes for later phases (Calendar, Drive, and Gmail sending)
    const BROAD_SCOPES = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive'
    ];

    let scopes = INITIAL_SCOPES;
    if (scopeLevel === 'signin' || scopeLevel === 'minimal') {
      scopes = SIGNIN_SCOPES;
    } else if (scopeLevel === 'broad') {
      scopes = BROAD_SCOPES;
    }

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      ...(state ? { state } : {})
    });
  }

  async handleOAuthCallback(code, clientId = null, clientSecret = null, redirectUri = null) {
    const cId = clientId || process.env.GOOGLE_CLIENT_ID;
    const cSec = clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

    const oauth2Client = new google.auth.OAuth2(cId, cSec, rUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    oauth2Client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        try {
          let existing = {};
          if (fs.existsSync(SESSION_FILE)) {
            existing = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
          }
          existing.refreshToken = newTokens.refresh_token;
          existing.updatedAt = new Date().toISOString();
          fs.writeFileSync(SESSION_FILE, JSON.stringify(existing, null, 2));
        } catch (e) {}
      }
    });

    this.authClient = oauth2Client;
    this.gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
    this.docsClient = google.docs({ version: 'v1', auth: oauth2Client });
    this.calendarClient = google.calendar({ version: 'v3', auth: oauth2Client });
    this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    this.mode = 'live';

    // Fetch user profile info
    let profile = {
      authorized: true,
      mode: 'live',
      email: 'authorized_user@google.com',
      name: 'Google Workspace User',
      picture: null,
      scopes: ['Gmail', 'Docs', 'Calendar', 'Drive']
    };

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userinfo = await oauth2.userinfo.get();
      profile = {
        authorized: true,
        mode: 'live',
        email: userinfo.data.email,
        name: userinfo.data.name || userinfo.data.given_name || userinfo.data.email?.split('@')[0],
        picture: userinfo.data.picture || null,
        scopes: ['Gmail', 'Docs', 'Calendar', 'Drive']
      };
    } catch (e) {
      console.warn('[GoogleService] Failed fetching userinfo:', e.message);
    }

    this.storedProfile = profile;

    // Persist session if refresh token available
    const activeRefreshToken = tokens.refresh_token || process.env.GOOGLE_REFRESH_TOKEN || null;
    try {
      const sessionData = {
        refreshToken: activeRefreshToken,
        profile,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    } catch (e) {
      console.warn('[GoogleService] Could not persist session:', e.message);
    }

    if (tokens.refresh_token) {
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
      try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf-8');
          const regex = new RegExp(`^GOOGLE_REFRESH_TOKEN=.*$`, 'm');
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
          }
          fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
        }
      } catch (e) {
        console.warn('[GoogleService] Failed saving refresh token to .env:', e.message);
      }
    }

    return {
      success: true,
      refreshToken: tokens.refresh_token,
      profile,
      mode: 'live'
    };
  }

  async signOut() {
    if (this.authClient) {
      try {
        await this.authClient.revokeCredentials();
      } catch (e) {}
    }
    this.authClient = null;
    this.gmailClient = null;
    this.docsClient = null;
    this.calendarClient = null;
    this.driveClient = null;
    this.storedProfile = null;
    this.mode = 'sandbox';

    if (fs.existsSync(SESSION_FILE)) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch (e) {}
    }

    process.env.GOOGLE_REFRESH_TOKEN = '';
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, 'GOOGLE_REFRESH_TOKEN=');
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      }
    } catch (e) {}

    return {
      success: true,
      mode: 'sandbox',
      message: 'Signed out successfully'
    };
  }

  setDemoLogin(options = {}) {
    this.storedProfile = {
      authorized: true,
      mode: 'sandbox_auth',
      email: options.email || 'afzal@workspace.ai',
      name: options.name || 'Afzal',
      picture: options.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      scopes: ['Gmail', 'Docs', 'Calendar', 'Drive', 'Tavily']
    };
    return {
      success: true,
      profile: this.storedProfile
    };
  }

  async getAccountProfile() {
    if (this.storedProfile && this.storedProfile.authorized) {
      return this.storedProfile;
    }

    if (this.getMode() === 'live' && this.authClient) {
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: this.authClient });
        const userinfo = await oauth2.userinfo.get();
        this.storedProfile = {
          authorized: true,
          mode: 'live',
          email: userinfo.data.email,
          name: userinfo.data.name || userinfo.data.given_name || userinfo.data.email?.split('@')[0],
          picture: userinfo.data.picture || null,
          scopes: ['Gmail', 'Docs', 'Calendar', 'Drive']
        };
        return this.storedProfile;
      } catch (e) {
        return {
          authorized: true,
          mode: 'live',
          email: 'connected@google.com',
          name: 'Google User',
          picture: null,
          scopes: ['Gmail', 'Docs', 'Calendar', 'Drive']
        };
      }
    }

    return {
      authorized: false,
      mode: 'sandbox',
      email: null,
      name: null,
      picture: null,
      scopes: ['Gmail', 'Docs', 'Calendar', 'Drive', 'Tavily']
    };
  }

  // --- Google Drive Service Methods (Phase 6) ---
  async listDriveFiles(options = {}) {
    if (this.getMode() === 'live' && this.driveClient) {
      try {
        const qParts = [];
        if (options.query) qParts.push(`name contains '${options.query}'`);
        if (options.mimeType) qParts.push(`mimeType = '${options.mimeType}'`);

        const res = await this.driveClient.files.list({
          pageSize: options.pageSize || 20,
          q: qParts.length ? qParts.join(' and ') : undefined,
          fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size, shared, owners)'
        });

        return (res.data.files || []).map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          webViewLink: f.webViewLink,
          modifiedTime: f.modifiedTime,
          size: f.size ? `${Math.round(f.size / 1024)} KB` : '-',
          shared: f.shared || false,
          sharedWith: (f.owners || []).map(o => o.emailAddress)
        }));
      } catch (err) {
        console.error('[GoogleService] Live Drive listFiles error, falling back to sandbox:', err.message);
        return sandboxStore.listDriveFiles(options);
      }
    }
    return sandboxStore.listDriveFiles(options);
  }

  async getDriveFile(fileId) {
    if (this.getMode() === 'live' && this.driveClient) {
      try {
        const res = await this.driveClient.files.get({
          fileId,
          fields: 'id, name, mimeType, webViewLink, modifiedTime, size, shared, owners, description'
        });
        return {
          id: res.data.id,
          name: res.data.name,
          mimeType: res.data.mimeType,
          webViewLink: res.data.webViewLink,
          modifiedTime: res.data.modifiedTime,
          size: res.data.size,
          shared: res.data.shared,
          description: res.data.description
        };
      } catch (err) {
        console.error('[GoogleService] Live Drive getFile error, falling back to sandbox:', err.message);
        return sandboxStore.getDriveFile(fileId);
      }
    }
    return sandboxStore.getDriveFile(fileId);
  }

  async createDriveFolder(name, parentFolderId = null) {
    if (this.getMode() === 'live' && this.driveClient) {
      try {
        const fileMetadata = {
          name: name || 'New Folder',
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentFolderId ? [parentFolderId] : undefined
        };
        const res = await this.driveClient.files.create({
          resource: fileMetadata,
          fields: 'id, name, webViewLink, mimeType, modifiedTime'
        });
        return {
          id: res.data.id,
          name: res.data.name,
          mimeType: res.data.mimeType,
          webViewLink: res.data.webViewLink,
          status: 'FOLDER_CREATED'
        };
      } catch (err) {
        console.error('[GoogleService] Live Drive createFolder error, falling back to sandbox:', err.message);
        return sandboxStore.createDriveFolder(name, parentFolderId);
      }
    }
    return sandboxStore.createDriveFolder(name, parentFolderId);
  }

  async shareDriveFile(fileId, email, role = 'reader') {
    if (this.getMode() === 'live' && this.driveClient) {
      try {
        const permission = {
          type: 'user',
          role: role || 'reader',
          emailAddress: email
        };
        await this.driveClient.permissions.create({
          fileId,
          resource: permission,
          fields: 'id'
        });
        const fileInfo = await this.getDriveFile(fileId);
        return {
          id: fileId,
          name: fileInfo.name,
          sharedWith: [email],
          role,
          status: 'FILE_SHARED',
          webViewLink: fileInfo.webViewLink
        };
      } catch (err) {
        console.error('[GoogleService] Live Drive shareFile error, falling back to sandbox:', err.message);
        return sandboxStore.shareDriveFile(fileId, email, role);
      }
    }
    return sandboxStore.shareDriveFile(fileId, email, role);
  }
}

export const googleService = new GoogleService();
