const Email = require('../models/Email');
const path = require('path');
const fs = require('fs');
const emailService = require('../services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Fetch all emails stored in the database
exports.getEmails = async (req, res) => {
  try {
    const emails = await Email.find().sort({ createdAt: -1 }).limit(10);
    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ 
      message: 'Error fetching emails', 
      error: error.message,
      details: error.stack 
    });
  }
};

// Fetch and process incoming emails (using the emailService to fetch emails via IMAP)
exports.fetchAndProcessEmails = async (req, res) => {
  try {
    console.log('Fetching emails...');
    console.log('Environment Variables:', {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER ? 'PROVIDED' : 'MISSING'
    });
    
    // Call the fetchEmails function from the emailService
    const fetchedEmails = await emailService.fetchEmails();
    
    if (fetchedEmails && fetchedEmails.length > 0) {
      console.log(`${fetchedEmails.length} email(s) fetched successfully.`);
      
      // Process and save each email to the database
      const processedEmails = [];
      for (const emailData of fetchedEmails) {
        try {
          const newEmail = new Email({
            subject: emailData.subject || 'No Subject',
            sender: emailData.from ? emailData.from.text : 'Unknown Sender',
            receiver: emailData.to ? emailData.to.text : 'Unknown Receiver',
            body: emailData.text || emailData.textAsHtml || 'Empty Body',
            isInvoice: emailData.subject && emailData.subject.includes('Invoice'),
            attachments: emailData.attachments.map(att => ({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size,
              filepath: att.filepath,
            })),
          });

          // Save to database
          await newEmail.save();
          processedEmails.push(newEmail);
        } catch (saveError) {
          console.error('Error saving individual email:', saveError);
        }
      }

      res.json({ 
        message: `${processedEmails.length} emails processed and saved to the database.`,
        emails: processedEmails 
      });
    } else {
      res.status(404).json({ message: 'No new emails found.' });
    }
  } catch (error) {
    console.error('Detailed Error Processing Emails:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Error processing emails', 
      error: error.message,
      details: error.stack 
    });
  }
};

// This function handles downloading the attachment
exports.downloadAttachment = async (req, res) => {
  const { filepath, filename } = req.body;

  // Check if filepath or filename is undefined
  if (!filepath || !filename) {
    return res.status(400).json({ error: 'Invalid attachment data. Filepath or filename is missing.' });
  }

  const fullPath = path.resolve(filepath);

  // Check if the file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found', path: fullPath });
  }

  // Proceed with sending the file for download
  res.download(fullPath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', {
        message: err.message,
        path: fullPath,
        filename: filename
      });
      res.status(500).send('Error downloading file');
    }
  });
};

// Additional helper function to clean up old attachments
exports.cleanupOldAttachments = async () => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than 7 days
      if (now - stats.mtime.getTime() > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up attachments:', error);
  }
};