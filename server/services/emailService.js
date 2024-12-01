const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

exports.fetchEmails = () => {
  return new Promise((resolve, reject) => {
    console.log('Connecting to IMAP server...');
    const imap = new Imap(imapConfig);
    const emails = [];

    imap.once('ready', () => {
      console.log('IMAP connection established. Opening inbox...');
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('Error opening mailbox:', err);
          reject(err);
          return;
        }
        
        console.log('Inbox opened. Fetching emails...');
        const fetchStream = imap.seq.fetch('1:10', { 
          bodies: [''],  // Fetch entire email
          markSeen: false  // Don't mark emails as read
        });

        fetchStream.on('message', (msg) => {
          console.log('Processing a message...');
          let emailData = {};

          msg.on('body', (stream, info) => {
            simpleParser(stream, async (err, parsed) => {
              if (err) {
                console.error('Error parsing email:', err);
                return;
              }

              // Process attachments
              const processedAttachments = await Promise.all(
                (parsed.attachments || []).map(async (attachment) => {
                  // Generate a unique filename to prevent overwriting
                  const uniqueFilename = `${Date.now()}-${attachment.filename}`;
                  const filepath = path.join(UPLOADS_DIR, uniqueFilename);

                  // Write attachment to file
                  try {
                    await fs.promises.writeFile(filepath, attachment.content);

                    return {
                      filename: attachment.filename,
                      contentType: attachment.contentType,
                      size: attachment.size,
                      filepath: uniqueFilename 
                    };
                    
                  } catch (writeErr) {
                    console.error('Error saving attachment:', writeErr);
                    return null;
                  }

                 
                })
              ).then(attachments => attachments.filter(att => att !== null));

              emailData = {
                ...parsed,
                attachments: processedAttachments
              };

              emails.push(emailData);
            });
          });
        });

        fetchStream.once('error', (err) => {
          console.error('Error in fetch stream:', err);
          reject(err);
        });

        fetchStream.once('end', () => {
          console.log('Fetch stream ended, closing connection');
          imap.end();
          resolve(emails);
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
    });

    imap.connect();
  });
};