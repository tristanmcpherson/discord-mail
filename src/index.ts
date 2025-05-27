import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SMTPServer, SMTPServerSession, SMTPServerAddress, SMTPServerOptions } from 'smtp-server';
import { WebhookClient } from 'discord.js';
import { simpleParser, ParsedMail } from 'mailparser';
import EmailStorage from './email-storage';
import WebServer from './web-server';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

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
interface FilterRules {
    allowedDomains: string[];
    blockedKeywords: string[];
    maxSize: number;
}

const filterRules: FilterRules = {
    // Add your filtering rules here
    allowedDomains: ['steampowered.com', 'gmail.com'],
    blockedKeywords: ['spam', 'unwanted'],
    maxSize: 10 * 1024 * 1024, // 10MB
};

const smtpConfig: SMTPServerOptions = {
    secure: false, // Disable TLS by default for simplicity
    authOptional: true, // Make authentication optional
    name: 'raegous.dev',
};

// Add TLS configuration if certificates are provided
if (process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH) {
    try {
        smtpConfig.secure = false;
        smtpConfig.hideSTARTTLS = false;
        smtpConfig.key = fs.readFileSync(process.env.TLS_KEY_PATH);
        smtpConfig.cert = fs.readFileSync(process.env.TLS_CERT_PATH);
        console.log('TLS certificates loaded successfully');
    } catch (error: any) {
        console.warn('Failed to load TLS certificates, running without TLS:', error.message);
    }
}

// Create SMTP server
const server = new SMTPServer({
    ...smtpConfig,
    onConnect(session: SMTPServerSession, callback: (err?: Error) => void) {
        // Log connection for debugging
        console.log(`New connection from ${session.remoteAddress}`);
        callback();
    },
    onMailFrom(address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error) => void) {
        // Validate sender domain
        const senderDomain = address.address.split('@')[1];
        if (senderDomain && !filterRules.allowedDomains.includes(senderDomain)) {
            return callback(new Error('Sender domain not allowed'));
        }
        callback();
    },
    onRcptTo(address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error) => void) {
        // Allow any recipient since we're just receiving
        callback();
    },
    onData(stream: NodeJS.ReadableStream, session: SMTPServerSession, callback: (err?: Error) => void) {
        let mailData = '';
        stream.on('data', (chunk: Buffer) => {
            mailData += chunk.toString();
        });

        stream.on('end', async () => {
            try {
                const parsed = await simpleParser(mailData);
                const fromText = Array.isArray(parsed.from) ? parsed.from[0]?.text : parsed.from?.text;
                const toText = Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text;
                console.log(`Received email from ${fromText} to ${toText}`);
                
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
            } catch (err: any) {
                console.error('Error processing email:', err);
                callback(new Error('Error processing email'));
            }
        });
    }
});

// Email filtering function
function shouldForwardEmail(email: ParsedMail): boolean {
    // Check domain
    const fromAddress = email.from?.value?.[0]?.address;
    if (!fromAddress) {
        console.log('Email has no from address');
        return false;
    }
    
    const fromDomain = fromAddress.split('@')[1];
    if (fromDomain && !filterRules.allowedDomains.includes(fromDomain)) {
        console.log(`Email from domain ${fromDomain} not in allowed list`);
        return false;
    }

    // Check for blocked keywords
    const subject = (email.subject || '').toLowerCase();
    if (filterRules.blockedKeywords.some(keyword => subject.includes(keyword))) {
        console.log(`Email contains blocked keyword in subject: ${subject}`);
        return false;
    }

    // Check size (approximate)
    const emailSize = (email.text || '').length + (email.html || '').length;
    if (emailSize > filterRules.maxSize) {
        console.log(`Email size ${emailSize} exceeds maximum allowed size`);
        return false;
    }

    return true;
}

// Extract Steam Guard code from email text
function extractSteamCode(text?: string): string | null {
    if (!text) return null;
    
    // Look for Steam Guard code pattern
    const codeMatch = text.match(/Steam Guard code:?\s*([A-Z0-9]{5})/i);
    if (codeMatch && codeMatch[1]) {
        return codeMatch[1];
    }

    const secondMatch = text.match(/\n([A-Z0-9]{5})/);
    if (secondMatch && secondMatch[1]) {
        return secondMatch[1];
    }
    
    return null;
}

// Initialize and start servers
async function startServers(): Promise<void> {
    try {
        // Initialize email storage
        await emailStorage.initialize();
        console.log('Email storage initialized');

        // Start web server
        await webServer.start();
        console.log('Web server started');

        // Start SMTP server
        const smtpPort = parseInt(process.env.SMTP_PORT || '2525', 10);
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
export {
    extractSteamCode,
    shouldForwardEmail
}; 