const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const diskusage = require('diskusage');

class EmailStorage {
  constructor(storageDir = path.join(__dirname, '..', 'email-storage')) {
    this.storageDir = storageDir;
    this.minDiskSpace = 500 * 1024 * 1024; // 500MB minimum free space
    this.maxStorageSize = 5 * 1024 * 1024 * 1024; // 5GB total storage limit
    this.maxEmailAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  async initialize() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to initialize email storage directory:', error);
      return false;
    }
  }

  async storeEmail(emailContent, metadata = {}) {
    // Check if we have enough disk space
    if (!await this.ensureDiskSpace()) {
      throw new Error('Insufficient disk space for storing email');
    }

    // Clean up old emails if needed
    await this.cleanupOldEmails();
    
    const emailId = uuidv4();
    const authToken = crypto.randomBytes(16).toString('hex');
    
    const storageObject = {
      id: emailId,
      authToken,
      storedAt: new Date().toISOString(),
      metadata,
      content: emailContent
    };
    
    const emailPath = path.join(this.storageDir, `${emailId}.json`);
    
    try {
      await fs.writeFile(emailPath, JSON.stringify(storageObject), 'utf8');
      return { emailId, authToken };
    } catch (error) {
      console.error('Failed to store email:', error);
      throw error;
    }
  }

  async retrieveEmail(emailId, authToken) {
    const emailPath = path.join(this.storageDir, `${emailId}.json`);
    
    try {
      const fileContent = await fs.readFile(emailPath, 'utf8');
      const emailData = JSON.parse(fileContent);
      
      if (emailData.authToken !== authToken) {
        throw new Error('Invalid authentication token');
      }
      
      return emailData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Email not found');
      }
      throw error;
    }
  }

  async cleanupOldEmails() {
    try {
      const files = await fs.readdir(this.storageDir);
      const now = new Date();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const emailData = JSON.parse(fileContent);
        const storedAt = new Date(emailData.storedAt);
        
        if (now - storedAt > this.maxEmailAge) {
          await fs.unlink(filePath);
        }
      }
      
      // Check total storage size
      const totalSize = await this.getTotalStorageSize();
      if (totalSize > this.maxStorageSize) {
        await this.removeOldestEmails();
      }
    } catch (error) {
      console.error('Error during email cleanup:', error);
    }
  }

  async removeOldestEmails() {
    try {
      const files = await fs.readdir(this.storageDir);
      const fileStats = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        fileStats.push({ file, filePath, mtime: stats.mtime, size: stats.size });
      }
      
      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);
      
      let totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
      let i = 0;
      
      // Remove oldest files until we're under the limit
      while (totalSize > this.maxStorageSize && i < fileStats.length) {
        await fs.unlink(fileStats[i].filePath);
        totalSize -= fileStats[i].size;
        i++;
      }
    } catch (error) {
      console.error('Error removing oldest emails:', error);
    }
  }

  async getTotalStorageSize() {
    try {
      const files = await fs.readdir(this.storageDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  async ensureDiskSpace() {
    try {
      const { available } = await diskusage.check(path.parse(this.storageDir).root);
      return available > this.minDiskSpace;
    } catch (error) {
      console.error('Error checking disk space:', error);
      return false;
    }
  }
}

module.exports = EmailStorage;