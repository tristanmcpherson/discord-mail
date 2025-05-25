const WebServer = require('../web-server');
const EmailStorage = require('../email-storage');
const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('Web Server', () => {
  let webServer;
  let emailStorage;
  let tempDir;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `email-storage-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Initialize email storage and web server
    emailStorage = new EmailStorage(tempDir);
    await emailStorage.initialize();
    webServer = new WebServer(emailStorage);
    await webServer.start(0); // Use random port for testing
  });
  
  afterEach(async () => {
    // Clean up
    await webServer.stop();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  test('health check endpoint returns ok', async () => {
    const response = await request(webServer.app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('view email endpoint requires token', async () => {
    const response = await request(webServer.app).get('/view-email/123');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication token required' });
  });

  test('view email endpoint returns 404 for non-existent email', async () => {
    const response = await request(webServer.app)
      .get('/view-email/non-existent?token=invalid');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Email not found' });
  });

  test('view email endpoint returns 401 for invalid token', async () => {
    // Store an email
    const emailContent = {
      from: { text: 'test@example.com' },
      subject: 'Test Subject',
      text: 'Test content',
      date: new Date().toISOString()
    };
    
    const { emailId } = await emailStorage.storeEmail(emailContent);
    
    // Try to view with invalid token
    const response = await request(webServer.app)
      .get(`/view-email/${emailId}?token=invalid`);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid authentication token' });
  });

  test('view email endpoint returns email content with valid token', async () => {
    // Store an email
    const emailContent = {
      from: { text: 'test@example.com' },
      subject: 'Test Subject',
      text: 'Test content',
      date: new Date().toISOString()
    };
    
    const { emailId, authToken } = await emailStorage.storeEmail(emailContent);
    
    // View with valid token
    const response = await request(webServer.app)
      .get(`/view-email/${emailId}?token=${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('Test Subject');
    expect(response.text).toContain('test@example.com');
    expect(response.text).toContain('Test content');
  });
}); 