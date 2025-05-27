const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { SMTPServer } = require('smtp-server');
const { WebhookClient } = require('discord.js');
const { simpleParser } = require('mailparser');
const EmailStorage = require('./email-storage');
const WebServer = require('./web-server');

// Validate required environment variables
if (!process.env.DISCORD_WEBHOOK_URL) {
    console.error('Error: DISCORD_WEBHOOK_URL environment variable is required');
    process.exit(1);
}

// Initialize Discord webhook
const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
const emailStorage = new EmailStorage();
const webServer = new WebServer(emailStorage);

// Email filtering rules
const filterRules = {
    // Add your filtering rules here
    allowedDomains: ['steampowered.com', 'gmail.com'],
    blockedKeywords: ['spam', 'unwanted'],
    maxSize: 10 * 1024 * 1024, // 10MB
};

// Create SMTP server configuration
const smtpConfig = {
    secure: false, // Disable TLS by default for simplicity
    authOptional: true, // Make authentication optional
    hideSTARTTLS: true, // Hide STARTTLS for now
    banner: process.env.SMTP_BANNER || 'ESMTP Discord Mail Server',
};

// Add TLS configuration if certificates are provided
if (process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH) {
    try {
        smtpConfig.secure = true;
        smtpConfig.hideSTARTTLS = false;
        smtpConfig.tls = {
            key: fs.readFileSync(process.env.TLS_KEY_PATH),
            cert: fs.readFileSync(process.env.TLS_CERT_PATH)
        };
        console.log('TLS certificates loaded successfully');
    } catch (error) {
        console.warn('Failed to load TLS certificates, running without TLS:', error.message);
    }
}

// Create SMTP server
const server = new SMTPServer({
    ...smtpConfig,
    onConnect(session, callback) {
        // Log connection for debugging
        console.log(`New connection from ${session.remoteAddress}`);
        callback();
    },
    onMailFrom(address, session, callback) {
        // Validate sender domain
        const senderDomain = address.address.split('@')[1];
        if (!filterRules.allowedDomains.includes(senderDomain)) {
            return callback(new Error('Sender domain not allowed'));
        }
        callback();
    },
    onRcptTo(address, session, callback) {
        // Allow any recipient since we're just receiving
        callback();
    },
    onData(stream, session, callback) {
        let mailData = '';
        stream.on('data', (chunk) => {
            mailData += chunk;
        });

        stream.on('end', async () => {
            try {
                const parsed = await simpleParser(mailData);
                console.log(`Received email from ${parsed.from.text} to ${parsed.to.text}`);
                
                // Apply filtering rules
                if (shouldForwardEmail(parsed)) {
                    // Store the email
                    const { emailId, authToken } = await emailStorage.storeEmail(parsed, {
                        from: parsed.from?.text,
                        subject: parsed.subject,
                        date: parsed.date
                    });

                    // Create the viewing URL
                    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.WEB_PORT || 3000}`;
                    const viewUrl = `${baseUrl}/view-email/${emailId}?token=${authToken}`;

                    // Extract Steam Guard code
                    const steamCode = extractSteamCode(parsed.text);
                    
                    // Format message for Discord
                    let discordMessage = `New email from: ${parsed.from?.text}\nSubject: ${parsed.subject}`;
                    
                    if (steamCode) {
                        discordMessage += `\n\nSteam Guard Code: **${steamCode}**`;
                    }
                    
                    discordMessage += `\n\nView full email: ${viewUrl}`;
                    
                    // Send to Discord
                    await webhookClient.send({
                        content: discordMessage,
                        username: 'Steam Guard',
                        avatarURL: 'https://store.steampowered.com/favicon.ico'
                    });
                    console.log('Successfully sent code to Discord');
                } else {
                    console.log('Email filtered out by rules');
                }

                callback();
            } catch (err) {
                console.error('Error processing email:', err);
                callback(new Error('Error processing email'));
            }
        });
    }
});

// Email filtering function
function shouldForwardEmail(email) {
    // Check domain
    const fromDomain = email.from.value[0].address.split('@')[1];
    if (!filterRules.allowedDomains.includes(fromDomain)) {
        console.log(`Email from domain ${fromDomain} not in allowed list`);
        return false;
    }

    // Check for blocked keywords
    const subject = email.subject.toLowerCase();
    if (filterRules.blockedKeywords.some(keyword => subject.includes(keyword))) {
        console.log(`Email contains blocked keyword in subject: ${subject}`);
        return false;
    }

    // Check size
    if (email.size > filterRules.maxSize) {
        console.log(`Email size ${email.size} exceeds maximum allowed size`);
        return false;
    }

    return true;
}

// Extract Steam Guard code from email text
function extractSteamCode(text) {
    if (!text) return null;
    
    // Look for Steam Guard code pattern
    const codeMatch = text.match(/Steam Guard code:?\s*([A-Z0-9]{5})/i);
    if (codeMatch) {
        return codeMatch[1];
    }
    
    return null;
}

// Initialize and start servers
async function startServers() {
    try {
        // Initialize email storage
        await emailStorage.initialize();
        console.log('Email storage initialized');

        // Start web server
        await webServer.start();
        console.log('Web server started');

        // Start SMTP server
        const smtpPort = process.env.SMTP_PORT || 2525;
        const smtpHost = process.env.SMTP_HOST || '0.0.0.0';
        server.listen(smtpPort, smtpHost, () => {
            console.log(`SMTP server running on ${smtpHost}:${smtpPort}`);
        });
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal');
    await webServer.stop();
    server.close(() => {
        console.log('Servers stopped');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT signal');
    await webServer.stop();
    server.close(() => {
        console.log('Servers stopped');
        process.exit(0);
    });
});

// Start the servers
startServers();

// Export functions for testing
module.exports = {
    extractSteamCode,
    shouldForwardEmail
};