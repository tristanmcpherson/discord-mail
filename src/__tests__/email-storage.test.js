const EmailStorage = require('../email-storage');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Email Storage', () => {
  let emailStorage;
  let tempDir;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `email-storage-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    emailStorage = new EmailStorage(tempDir);
    await emailStorage.initialize();
  });
  
  afterEach(async () => {
    // Clean up temporary directory after tests
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  test('stores and retrieves email correctly', async () => {
    const emailContent = {
      from: { text: 'noreply@steampowered.com' },
      subject: 'Steam Guard Code',
      text: 'Your Steam Guard Code is: 2DWGV',
      date: new Date().toISOString()
    };
    
    const { emailId, authToken } = await emailStorage.storeEmail(emailContent);
    
    expect(emailId).toBeDefined();
    expect(authToken).toBeDefined();
    
    const retrieved = await emailStorage.retrieveEmail(emailId, authToken);
    
    expect(retrieved.content).toEqual(emailContent);
    expect(retrieved.metadata).toBeDefined();
  });

  test('fails with invalid auth token', async () => {
    const emailContent = { subject: 'Test Email' };
    
    const { emailId } = await emailStorage.storeEmail(emailContent);
    
    await expect(
      emailStorage.retrieveEmail(emailId, 'invalid-token')
    ).rejects.toThrow('Invalid authentication token');
  });

  test('cleans up old emails', async () => {
    // Override maxEmailAge for testing
    emailStorage.maxEmailAge = 0; // Make all emails immediately "old"
    
    // Store an email
    const { emailId } = await emailStorage.storeEmail({ subject: 'Old Email' });
    
    // Verify it exists
    const files = await fs.readdir(tempDir);
    expect(files.length).toBe(1);
    
    // Run cleanup
    await emailStorage.cleanupOldEmails();
    
    // Verify it's gone
    const filesAfter = await fs.readdir(tempDir);
    expect(filesAfter.length).toBe(0);
  });
});