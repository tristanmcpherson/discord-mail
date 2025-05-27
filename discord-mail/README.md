# Discord Mail Helm Chart

This Helm chart deploys the Discord Mail application to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster
- Helm 3.x
- kubectl configured to access your cluster

## Installation

### Install the chart

```bash
helm install discord-mail ./discord-mail
```

### Install with custom values

```bash
helm install discord-mail ./discord-mail \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=your-domain.com \
  --set secrets.discordWebhookUrl="your-discord-webhook-url"
```

### Upgrade an existing release

```bash
helm upgrade discord-mail ./discord-mail \
  --set image.tag=v1.1.0
```

## Configuration

The following table lists the configurable parameters and their default values:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `ghcr.io/tristanmcpherson/discord-mail` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.hosts[0].host` | Hostname | `mail.raegous.dev` |
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | Storage size | `5Gi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `config.emailStoragePath` | Email storage path | `/app/email-storage` |
| `config.maxEmailsPerUser` | Max emails per user | `100` |
| `config.maxEmailSize` | Max email size in bytes | `10485760` |
| `config.smtpPort` | SMTP server port | `2525` |
| `config.smtpHost` | SMTP server host | `0.0.0.0` |
| `config.baseUrl` | Base URL for email viewing | `https://mail.raegous.dev` |
| `config.tls.enabled` | Enable TLS for SMTP | `false` |
| `secrets.discordWebhookUrl` | Discord webhook URL | `""` |

## Uninstalling

```bash
helm uninstall discord-mail
```

## Development

### Lint the chart

```bash
helm lint ./discord-mail
```

### Template the chart

```bash
helm template discord-mail ./discord-mail
```

### Package the chart

```bash
helm package ./discord-mail
``` 