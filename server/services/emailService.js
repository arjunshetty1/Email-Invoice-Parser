const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const { Buffer } = require('buffer');

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  tls: true,
  tlsOptions: { rejectUnauthorized: false } // Add this line to ignore certificate errors
};

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
                  return {
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    content: attachment.content ? Buffer.from(attachment.content).toString('base64') : null
                  };
                })
              );

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