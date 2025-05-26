# Discord Mail Server

A Node.js SMTP server that forwards emails to Discord webhooks, with a web interface for viewing stored emails.

## Features

- SMTP server for receiving emails
- Discord webhook integration for notifications
- Web interface for viewing stored emails
- Email filtering rules
- Kubernetes deployment support
- Custom Docker image with Node.js and Python support

## Prerequisites

- Node.js 18 or higher
- Python 3.x
- Docker
- Kubernetes cluster (for production deployment)
- Discord webhook URL

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/discord-mail.git
cd discord-mail
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
DISCORD_WEBHOOK_URL=your_webhook_url
SMTP_PORT=2525
WEB_PORT=3000
BASE_URL=https://your-domain.com
```

4. Start the server:
```bash
npm start
```

## Docker Build

To build the custom Docker image with Node.js and Python:

```bash
# Build the image
docker build -t your-registry/discord-mail:latest .

# Push to your registry
docker push your-registry/discord-mail:latest
```

## Kubernetes Deployment

1. Update the domain in `k8s/ingress.yaml` and `k8s/configmap.yaml`

2. Create a secret for the Discord webhook URL:
```bash
kubectl create secret generic discord-mail-secrets \
  --from-literal=DISCORD_WEBHOOK_URL=your_webhook_url
```

3. Apply the Kubernetes resources:
```bash
kubectl apply -f k8s/
```

The deployment includes:
- Application deployment with custom Node.js + Python image
- Service for SMTP and web traffic
- Ingress for HTTPS access
- ConfigMap for configuration
- Secret for sensitive data
- PersistentVolumeClaim for email storage

## Configuration

### Environment Variables

- `DISCORD_WEBHOOK_URL`: Discord webhook URL for notifications
- `SMTP_PORT`: Port for SMTP server (default: 2525)
- `WEB_PORT`: Port for web server (default: 3000)
- `BASE_URL`: Base URL for the web interface
- `MAX_EMAIL_SIZE`: Maximum email size in bytes (default: 10MB)
- `EMAIL_RETENTION_DAYS`: Number of days to keep emails (default: 7)

### Email Filtering Rules

- Allowed domains: `steampowered.com`, `gmail.com`
- Blocked keywords: `spam`, `unwanted`
- Maximum email size: 10MB

## Web Interface

The web interface is available at `https://your-domain.com` and provides:
- Email viewing with authentication
- Health check endpoint
- Clean HTML interface for email content

## Security Notes

- The SMTP server is configured to accept connections from any IP
- The web interface requires authentication tokens for viewing emails
- All sensitive data is stored in Kubernetes secrets
- HTTPS is enforced through Ingress configuration
- The application runs as a non-root user in the container

## Development

```bash
# Run tests
npm test

# Run with nodemon for development
npm run dev
```

## License

MIT 