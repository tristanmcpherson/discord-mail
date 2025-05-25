const express = require('express');
const path = require('path');
const EmailStorage = require('./email-storage');

class WebServer {
  constructor(emailStorage) {
    this.app = express();
    this.emailStorage = emailStorage;
    this.setupRoutes();
  }

  setupRoutes() {
    // Serve static files from the public directory
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    // View email endpoint
    this.app.get('/view-email/:emailId', async (req, res) => {
      try {
        const { emailId } = req.params;
        const { token } = req.query;

        if (!token) {
          return res.status(401).json({ error: 'Authentication token required' });
        }

        const emailData = await this.emailStorage.retrieveEmail(emailId, token);
        
        // Send HTML response with email content
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Email Viewer</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f5f5f5;
                }
                .email-container {
                  background-color: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .email-header {
                  border-bottom: 1px solid #eee;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                .email-meta {
                  color: #666;
                  font-size: 0.9em;
                  margin-bottom: 10px;
                }
                .email-content {
                  white-space: pre-wrap;
                  line-height: 1.5;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h2>${emailData.metadata.subject || 'No Subject'}</h2>
                  <div class="email-meta">
                    <p><strong>From:</strong> ${emailData.metadata.from || 'Unknown'}</p>
                    <p><strong>Date:</strong> ${new Date(emailData.metadata.date).toLocaleString()}</p>
                  </div>
                </div>
                <div class="email-content">
                  ${emailData.content.text || 'No content'}
                </div>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        if (error.message === 'Email not found') {
          res.status(404).json({ error: 'Email not found' });
        } else if (error.message === 'Invalid authentication token') {
          res.status(401).json({ error: 'Invalid authentication token' });
        } else {
          console.error('Error retrieving email:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  start(port = process.env.WEB_PORT || 3000) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Web server running on port ${port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = WebServer; 