import { MongoClient } from 'mongodb';
import { sandboxStore } from '../services/sandboxStore.js';
import dotenv from 'dotenv';
dotenv.config();

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcp_workspace';
  }

  async connect() {
    if (this.isConnected) return this.db;

    try {
      // Connect with a 2.5 second timeout so startup remains instant if no daemon is running
      this.client = new MongoClient(this.uri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500
      });

      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;
      console.log(`[MongoDB] Connected successfully to database: ${this.db.databaseName}`);
      
      // Seed initial collections if empty
      await this.seedInitialData();
      return this.db;
    } catch (err) {
      console.log(`[MongoDB] Notice: Active MongoDB server not detected at ${this.uri}. Running in resilient Local/Sandbox storage mode (${err.message}).`);
      this.isConnected = false;
      return null;
    }
  }

  async seedInitialData() {
    try {
      const emailCol = this.db.collection('emails');
      const emailCount = await emailCol.countDocuments();
      if (emailCount === 0) {
        const initialEmails = sandboxStore.listMessages({ maxResults: 50 }).messages;
        if (initialEmails.length > 0) {
          await emailCol.insertMany(initialEmails);
          console.log(`[MongoDB] Seeded ${initialEmails.length} initial emails`);
        }
      }

      const docCol = this.db.collection('documents');
      const docCount = await docCol.countDocuments();
      if (docCount === 0) {
        const initialDocs = sandboxStore.listDocuments({ pageSize: 50 }).documents;
        if (initialDocs.length > 0) {
          await docCol.insertMany(initialDocs);
          console.log(`[MongoDB] Seeded ${initialDocs.length} initial documents`);
        }
      }

      const eventCol = this.db.collection('events');
      const eventCount = await eventCol.countDocuments();
      if (eventCount === 0) {
        const initialEvents = sandboxStore.listEvents({ maxResults: 50 }).events;
        if (initialEvents.length > 0) {
          await eventCol.insertMany(initialEvents);
          console.log(`[MongoDB] Seeded ${initialEvents.length} initial calendar events`);
        }
      }
    } catch (err) {
      console.warn('[MongoDB] Seeding error:', err.message);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      uri: this.uri.replace(/\/\/[^@]*@/, '//***:***@'), // sanitize credentials
      database: this.isConnected ? this.db.databaseName : 'mcp_workspace',
      mode: this.isConnected ? 'MongoDB Active' : 'Resilient Local Storage (Active)'
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
