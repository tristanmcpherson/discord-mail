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

describe('Steam Code Extraction', () => {
  test('extracts Steam Guard code from plain text', () => {
    const text = 'Your Steam Guard code is: ABC12';
    expect(extractSteamCode(text)).toBe('ABC12');
  });

  test('extracts Steam Guard code from HTML content', () => {
    const html = '<div>Your Steam Guard code is: <strong>XYZ45</strong></div>';
    expect(extractSteamCode(html)).toBe('XYZ45');
  });

  test('returns null when no code is found', () => {
    const text = 'This is a regular email without a Steam code';
    expect(extractSteamCode(text)).toBeNull();
  });

  test('handles multiple potential codes and returns the correct one', () => {
    const text = 'Some text ABC12\nYour Steam Guard code is: XYZ45';
    expect(extractSteamCode(text)).toBe('XYZ45');
  });
});

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
}); 