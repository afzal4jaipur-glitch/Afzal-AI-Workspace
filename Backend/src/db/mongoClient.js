import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Backend/.env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_ATLAS_URI = 'mongodb://localhost:27017/mcp_workspace';

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;
    this.dbName = 'mcp_workspace';
    this.lastError = null;
  }

  async connect() {
    if (this.isConnected && this.db) return this.db;

    this.uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;

    try {
      this.client = new MongoClient(this.uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      this.lastError = null;
      console.log(`[MongoDB] Connected successfully to Atlas cluster database: ${this.db.databaseName}`);

      return this.db;
    } catch (err) {
      this.lastError = err.message;
      const isIpAccessIssue = err.message?.includes('SSL alert number 80') || err.message?.includes('tlsv1 alert internal error');
      if (isIpAccessIssue) {
        console.log(`[MongoDB] Notice: MongoDB Atlas rejected TLS handshake (IP not whitelisted in Atlas Network Access). Add 0.0.0.0/0 in Atlas -> Network Access to enable live cloud sync. Running in resilient Local/Sandbox storage mode.`);
      } else {
        console.log(`[MongoDB] Notice: Active MongoDB server not reachable (${err.message}). Running in resilient Local/Sandbox storage mode.`);
      }
      this.isConnected = false;
      return null;
    }
  }

  async syncAndSeed({ sandboxStore, historyService }) {
    if (!this.isConnected || !this.db) return;

    try {
      // 1. Emails collection
      const emailCol = this.db.collection('emails');
      const emailCount = await emailCol.countDocuments();
      if (emailCount === 0 && sandboxStore?.emails?.length > 0) {
        await emailCol.insertMany(sandboxStore.emails.map(e => ({ ...e })));
        console.log(`[MongoDB] Seeded ${sandboxStore.emails.length} initial emails`);
      } else if (emailCount > 0 && sandboxStore) {
        const storedEmails = await emailCol.find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
        if (storedEmails.length > 0) {
          sandboxStore.emails = storedEmails;
        }
      }

      // 2. Documents collection
      const docCol = this.db.collection('documents');
      const docCount = await docCol.countDocuments();
      if (docCount === 0 && sandboxStore?.docs?.length > 0) {
        await docCol.insertMany(sandboxStore.docs.map(d => ({ ...d })));
        console.log(`[MongoDB] Seeded ${sandboxStore.docs.length} initial documents`);
      } else if (docCount > 0 && sandboxStore) {
        const storedDocs = await docCol.find({}, { projection: { _id: 0 } }).sort({ modifiedTime: -1 }).toArray();
        if (storedDocs.length > 0) {
          sandboxStore.docs = storedDocs;
        }
      }

      // 3. Calendar Events collection
      const eventCol = this.db.collection('events');
      const eventCount = await eventCol.countDocuments();
      if (eventCount === 0 && sandboxStore?.events?.length > 0) {
        await eventCol.insertMany(sandboxStore.events.map(ev => ({ ...ev })));
        console.log(`[MongoDB] Seeded ${sandboxStore.events.length} initial calendar events`);
      } else if (eventCount > 0 && sandboxStore) {
        const storedEvents = await eventCol.find({}, { projection: { _id: 0 } }).sort({ start: 1 }).toArray();
        if (storedEvents.length > 0) {
          sandboxStore.events = storedEvents;
        }
      }

      // 4. Google Drive Files collection
      const driveCol = this.db.collection('drive_files');
      const driveCount = await driveCol.countDocuments();
      if (driveCount === 0 && sandboxStore?.driveFiles?.length > 0) {
        await driveCol.insertMany(sandboxStore.driveFiles.map(f => ({ ...f })));
        console.log(`[MongoDB] Seeded ${sandboxStore.driveFiles.length} initial Drive files`);
      } else if (driveCount > 0 && sandboxStore) {
        const storedFiles = await driveCol.find({}, { projection: { _id: 0 } }).toArray();
        if (storedFiles.length > 0) {
          sandboxStore.driveFiles = storedFiles;
        }
      }

      // 5. Execution History collection
      const execCol = this.db.collection('executions');
      const execCount = await execCol.countDocuments();
      if (execCount === 0 && historyService?.history?.length > 0) {
        await execCol.insertMany(historyService.history.map(h => ({ ...h })));
        console.log(`[MongoDB] Seeded ${historyService.history.length} execution history records`);
      } else if (execCount > 0 && historyService) {
        const storedExecs = await execCol.find({}, { projection: { _id: 0 } }).sort({ timestamp: -1 }).limit(200).toArray();
        if (storedExecs.length > 0) {
          historyService.history = storedExecs;
        }
      }

      // 6. Pending Approvals collection
      const apprCol = this.db.collection('approvals');
      const apprCount = await apprCol.countDocuments();
      if (apprCount > 0 && historyService) {
        const storedApprovals = await apprCol.find({ status: 'PENDING_APPROVAL' }, { projection: { _id: 0 } }).toArray();
        for (const item of storedApprovals) {
          historyService.pendingApprovals.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn('[MongoDB] Sync/Seeding warning:', err.message);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      uri: this.uri.replace(/\/\/([^:]+):[^@]*@/, '//$1:***@'), // keep username visible, mask password
      user: 'afzal4jaipur_db_user',
      cluster: 'cluster0.7pmg9mj.mongodb.net',
      database: this.isConnected && this.db ? this.db.databaseName : this.dbName,
      mode: this.isConnected ? 'MongoDB Atlas Connected' : 'Resilient Local Storage (Active)',
      lastError: this.lastError
    };
  }

  // Generic collection accessor
  getCollection(name) {
    if (this.isConnected && this.db) {
      return this.db.collection(name);
    }
    return null;
  }

  getDb() {
    return this.db;
  }
}

export const dbManager = new DatabaseManager();
