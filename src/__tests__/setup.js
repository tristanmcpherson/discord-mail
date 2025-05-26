// Set up test environment variables
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/test';
process.env.SMTP_PORT = '2525';
process.env.WEB_PORT = '3000';
process.env.BASE_URL = 'http://localhost:3000';
process.env.MAX_EMAIL_SIZE = '10485760';
process.env.EMAIL_RETENTION_DAYS = '7';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASSWORD = 'test123';
process.env.SMTP_BANNER = 'ESMTP Test Server';

// Mock discord.js WebhookClient
jest.mock('discord.js', () => ({
  WebhookClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(undefined)
  }))
})); 