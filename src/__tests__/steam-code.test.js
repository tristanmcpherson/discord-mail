// Mock the discord.js module
jest.mock('discord.js', () => ({
  WebhookClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

const { extractSteamCode, shouldForwardEmail } = require('../index');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');

describe('Email Filtering', () => {
  test('allows email from steampowered.com', () => {
    const email = {
      from: { value: [{ address: 'noreply@steampowered.com' }] },
      subject: 'Steam Guard Code',
      size: 1024
    };
    expect(shouldForwardEmail(email)).toBe(true);
  });

  test('blocks email from unauthorized domain', () => {
    const email = {
      from: { value: [{ address: 'spam@malicious.com' }] },
      subject: 'Steam Guard Code',
      size: 1024
    };
    expect(shouldForwardEmail(email)).toBe(false);
  });

  test('blocks email with blocked keywords', () => {
    const email = {
      from: { value: [{ address: 'noreply@steampowered.com' }] },
      subject: 'spam Steam Guard Code',
      size: 1024
    };
    expect(shouldForwardEmail(email)).toBe(false);
  });

  test('blocks oversized email', () => {
    const email = {
      from: { value: [{ address: 'noreply@steampowered.com' }] },
      subject: 'Steam Guard Code',
      size: 11 * 1024 * 1024 // 11MB
    };
    expect(shouldForwardEmail(email)).toBe(false);
  });
});

describe('EML File Processing', () => {
  test('processes real Steam Guard EML file', async () => {
    const emlPath = path.join(__dirname, 'fixtures', 'steam-guard.eml');
    const emlContent = await fs.readFile(emlPath, 'utf8');
    const parsed = await simpleParser(emlContent);
    
    expect(shouldForwardEmail(parsed)).toBe(true);
    expect(extractSteamCode(parsed.text)).toBe('2DWGV');
  });

  test('processes real Steam Guard EML file 2', async () => {
    const emlPath = path.join(__dirname, 'fixtures', 'steam-guard-2.eml');
    const emlContent = await fs.readFile(emlPath, 'utf8');
    const parsed = await simpleParser(emlContent);
    
    expect(shouldForwardEmail(parsed)).toBe(true);
    expect(extractSteamCode(parsed.text)).toBe('2DWGV');
  });
}); 