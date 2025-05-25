# Discord Mail Server

A Node.js mail server that receives emails, filters them, and forwards them to Discord channels. It also provides a web interface to view stored emails.

## Features

- SMTP server for receiving emails
- Email filtering capabilities
- Discord webhook integration
- Web interface for viewing stored emails
- Configurable settings via environment variables
- Kubernetes deployment support

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
WEB_PORT=3000
BASE_URL=http://your-domain.com  # Optional, defaults to http://localhost:3000
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Kubernetes Deployment

1. Update the domain in `k8s/ingress.yaml` and `k8s/configmap.yaml` to match your domain.

2. Create a secret for the Discord webhook URL:
```bash
kubectl create secret generic discord-mail-secrets \
  --from-literal=DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

3. Apply the Kubernetes resources:
```bash
kubectl apply -f k8s/
```

The deployment includes:
- Deployment for the application
- Service exposing SMTP (25) and HTTP/HTTPS (80/443) ports
- Ingress for the web interface with TLS
- ConfigMap for configuration
- Secret for sensitive data

## Configuration

The server can be configured through environment variables:

- `DISCORD_WEBHOOK_URL`: Your Discord webhook URL
- `SMTP_PORT`: Port for the SMTP server (default: 25)
- `SMTP_HOST`: Host for the SMTP server (default: localhost)
- `WEB_PORT`: Port for the web server (default: 3000)
- `BASE_URL`: Base URL for email viewing links (default: http://localhost:3000)

## Usage

1. Configure your email client to use the SMTP server
2. Send emails to the configured SMTP server
3. Filtered emails will be:
   - Forwarded to your Discord channel
   - Stored and accessible via the web interface
   - Automatically cleaned up after 7 days

## Web Interface

The web server provides the following endpoints:

- `/view-email/:emailId?token=<auth_token>`: View a specific email
- `/health`: Health check endpoint

## Security Note

Make sure to properly secure your servers in production by:
- Using SSL/TLS for both SMTP and web servers
- Implementing authentication for SMTP
- Setting up proper firewall rules
- Using secure tokens for email access
- Regularly cleaning up old emails
- Configuring proper network policies in Kubernetes
- Using TLS certificates from a trusted CA 