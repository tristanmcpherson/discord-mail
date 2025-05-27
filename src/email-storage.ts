import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import diskusage from 'diskusage';
import { ParsedMail } from 'mailparser';

interface EmailMetadata {
  from?: string;
  subject?: string;
  date?: Date;
  [key: string]: any;
}

interface StoredEmail {
  id: string;
  authToken: string;
  storedAt: string;
  metadata: EmailMetadata;
  content: ParsedMail;
}

interface EmailStoreResult {
  emailId: string;
  authToken: string;
}

interface FileStats {
  file: string;
  filePath: string;
  mtime: Date;
  size: number;
}

class EmailStorage {
  private readonly storageDir: string;
  private readonly minDiskSpace: number;
  private readonly maxStorageSize: number;
  private readonly maxEmailAge: number;

  constructor(storageDir: string = path.join(__dirname, '..', 'email-storage')) {
    this.storageDir = storageDir;
    this.minDiskSpace = 500 * 1024 * 1024; // 500MB minimum free space
    this.maxStorageSize = 5 * 1024 * 1024 * 1024; // 5GB total storage limit
    this.maxEmailAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  async initialize(): Promise<boolean> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to initialize email storage directory:', error);
      return false;
    }
  }

  async storeEmail(emailContent: ParsedMail, metadata: EmailMetadata = {}): Promise<EmailStoreResult> {
    // Check if we have enough disk space
    if (!await this.ensureDiskSpace()) {
      throw new Error('Insufficient disk space for storing email');
    }

    // Clean up old emails if needed
    await this.cleanupOldEmails();
    
    const emailId = uuidv4();
    const authToken = crypto.randomBytes(16).toString('hex');
    
    const storageObject: StoredEmail = {
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

  async retrieveEmail(emailId: string, authToken: string): Promise<StoredEmail> {
    const emailPath = path.join(this.storageDir, `${emailId}.json`);
    
    try {
      const fileContent = await fs.readFile(emailPath, 'utf8');
      const emailData: StoredEmail = JSON.parse(fileContent);
      
      if (emailData.authToken !== authToken) {
        throw new Error('Invalid authentication token');
      }
      
      return emailData;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error('Email not found');
      }
      throw error;
    }
  }

  async cleanupOldEmails(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const now = new Date();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const emailData: StoredEmail = JSON.parse(fileContent);
        const storedAt = new Date(emailData.storedAt);
        
        if (now.getTime() - storedAt.getTime() > this.maxEmailAge) {
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

  async removeOldestEmails(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const fileStats: FileStats[] = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        fileStats.push({ file, filePath, mtime: stats.mtime, size: stats.size });
      }
      
      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
      
      let totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
      let i = 0;
      
      // Remove oldest files until we're under the limit
      while (totalSize > this.maxStorageSize && i < fileStats.length) {
        await fs.unlink(fileStats[i]!.filePath);
        totalSize -= fileStats[i]!.size;
        i++;
      }
    } catch (error) {
      console.error('Error removing oldest emails:', error);
    }
  }

  async getTotalStorageSize(): Promise<number> {
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

  async ensureDiskSpace(): Promise<boolean> {
    try {
      const { available } = await diskusage.check(path.parse(this.storageDir).root);
      return available > this.minDiskSpace;
    } catch (error) {
      console.error('Error checking disk space:', error);
      return false;
    }
  }
}

export default EmailStorage; 