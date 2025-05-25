require('dotenv').config();
const { SMTPServer } = require('smtp-server');
const { WebhookClient } = require('discord.js');
const { simpleParser } = require('mailparser');

// Initialize Discord webhook
const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });

// Email filtering rules
const filterRules = {
    // Add your filtering rules here
    allowedDomains: ['steampowered.com', 'gmail.com'],
    blockedKeywords: ['spam', 'unwanted'],
    maxSize: 10 * 1024 * 1024, // 10MB
};

// Create SMTP server
const server = new SMTPServer({
    secure: false, // Set to true in production with proper SSL/TLS
    authOptional: true, // Set to false in production
    onConnect(session, callback) {
        // Log connection for debugging
        console.log(`New connection from ${session.remoteAddress}`);
        callback();
    },
    onAuth(auth, session, callback) {
        // For health checks, we'll accept any auth
        if (auth.username === 'healthcheck') {
            return callback(null, { user: 'healthcheck' });
        }
        callback(new Error('Invalid authentication'));
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
                    // Extract Steam Guard code
                    if (!parsed.text) {
                        console.log('No text content found in email');
                        return callback(new Error('No text content found'));
                    }

                    const steamCode = extractSteamCode(parsed.text);
                    
                    
                    if (steamCode) {
                        console.log(`Found Steam Guard code: ${steamCode}`);
                        // Format message for Discord
                        const discordMessage = formatSteamCodeForDiscord(steamCode, parsed);
                        
                        // Send to Discord
                        await webhookClient.send({
                            content: discordMessage,
                            username: 'Steam Guard',
                            avatarURL: 'https://store.steampowered.com/favicon.ico'
                        });
                        console.log('Successfully sent code to Discord');
                    } else {
                        console.log('No Steam Guard code found in email');
                    }
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

// Extract Steam Guard code from email content
function extractSteamCode(content) {
    if (!content) return null;

    // Look for 'Login Code' followed by a code (5 alphanumeric, usually uppercase)
    // Handles possible whitespace and line breaks
    const match = content.match("Login Code\\n([0-9A-Z]{5})");
    if (match) return match[1];

    return null;
}

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

// Format Steam Guard code for Discord
function formatSteamCodeForDiscord(code, email) {
    return `🔐 Steam Guard Code
Code: \`${code}\`
Time: ${email.date.toLocaleString()}

From: ${email.from.text}
To: ${email.to.text}`;
}

// Start server
const port = process.env.SMTP_PORT || 2525;
const host = process.env.SMTP_HOST || '0.0.0.0';

server.listen(port, host, () => {
    console.log(`SMTP server running on ${host}:${port}`);
});

// Export functions for testing
module.exports = {
    extractSteamCode,
    shouldForwardEmail
}; 