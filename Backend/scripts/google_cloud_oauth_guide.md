# 📘 Google Cloud Project & OAuth 2.0 Setup Guide

This guide walks you through setting up your Google Cloud project and connecting real Gmail and Google Docs to your **Personal AI Workspace** as specified in Phase 1 & 2.

---

## 🔑 Phase 1: Google Cloud Project + OAuth Consent

### Step 1: Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Name your project: `Personal AI Workspace` and click **Create**.

### Step 2: Enable Required Google Workspace APIs
In the Google Cloud Console, navigate to **APIs & Services > Library**, search for and enable:
1. **Gmail API**
2. **Google Docs API**
3. *(Optional for later phases)*: **Google Calendar API** & **Google Drive API**

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** (for personal testing), then click **Create**.
3. Fill in:
   - **App name**: `MCP Personal AI Workspace`
   - **User support email**: your personal Google email
   - **Developer contact email**: your personal Google email
4. Click **Save and Continue** past the Scopes step (our app requests scopes dynamically).
5. **Add Test User (Critical for Local Demo)**:
   - Under the **Test users** section, click **+ Add Users**.
   - Enter your personal Google email address (the account you will sign in with).
   - Click **Save and Continue**.

### Step 4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials > OAuth client ID**.
3. Select Application type: **Web application**.
4. Set Name: `Workspace Local Client`.
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

### Step 5: Connect in the Workspace
You can either:
- **Option 1 (One-click in UI)**: Click the **`Auth: Sandbox Mode`** pill in the top header of the workspace, paste your Client ID & Secret, and click **Connect Google Account via OAuth 2.0**.
- **Option 2 (Direct in `.env`)**: Paste them into `Backend/.env`:
  ```env
  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=your-client-secret
  ```

---

## 📬 Phase 2: Gmail MCP Server Choices

Your workspace supports both options described in the course specifications:

### Option A: Use an Existing / Maintained Gmail MCP Server
- Uses `@modelcontextprotocol/sdk/client/stdio.js` (`StdioClientTransport`) to connect your Node.js MCP client to an external or maintained stdio process.
- Demonstrates standard MCP interoperability across external binaries and ecosystem servers.

### Option B: Build Our Own Gmail MCP Server (Default & Recommended)
- Implemented in `Backend/src/mcp/servers/gmailServer.js` using the Google Gmail API and the official `@modelcontextprotocol/sdk`.
- Provides maximum control over authentication, structured tool schemas (`gmail_search_messages`, `gmail_read_message`, etc.), error isolation, and sandbox resilience.

You can switch between Option A and Option B anytime in **Workspace Settings** (gear icon in the top right corner).
