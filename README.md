# Discord Mail Server

A Node.js mail server that receives emails, filters them, and forwards them to Discord channels.

## Features

- SMTP server for receiving emails
- Email filtering capabilities
- Discord webhook integration
- Configurable settings via environment variables

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
DISCORD_WEBHOOK_URL=your_discord_webhook_url
SMTP_PORT=25
SMTP_HOST=localhost
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

The server can be configured through environment variables:

- `DISCORD_WEBHOOK_URL`: Your Discord webhook URL
- `SMTP_PORT`: Port for the SMTP server (default: 25)
- `SMTP_HOST`: Host for the SMTP server (default: localhost)

## Usage

1. Configure your email client to use the SMTP server
2. Send emails to the configured SMTP server
3. Filtered emails will be forwarded to your Discord channel

## Security Note

Make sure to properly secure your SMTP server in production by:
- Using SSL/TLS
- Implementing authentication
- Setting up proper firewall rules 