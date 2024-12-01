const Email = require('../models/Email');
const path = require('path');
const fs = require('fs').promises;
const emailService = require('../services/emailService');
const ocrService = require('../services/ocrService');
const invoiceDetectionService = require('../services/invoiceDetectionService');
const { PDFDocument } = require('pdf-lib');

exports.getEmails = async (req, res) => {
  try {
    const emails = await Email.find().sort({ createdAt: -1 }).limit(10);
    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ message: 'Error fetching emails', error: error.message });
  }
};

exports.fetchAndProcessEmails = async (req, res) => {
  try {
    console.log('Fetching emails...');
    const fetchedEmails = await emailService.fetchEmails();
    
    if (fetchedEmails && fetchedEmails.length > 0) {
      console.log(`${fetchedEmails.length} email(s) fetched successfully.`);
      
      const processedEmails = await Promise.all(fetchedEmails.map(async (emailData) => {
        try {
          const attachments = await Promise.all(emailData.attachments.map(async (att) => {
            // Store only the filename in the database, not the full path
            const filename = path.basename(att.filepath);
            let isInvoice = false;
            let extractedText = '';

            if (att.contentType === 'application/pdf') {
              const pdfBuffer = await fs.readFile(att.filepath);
              const pdfDoc = await PDFDocument.load(pdfBuffer);
              
              for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                const page = pdfDoc.getPages()[i];
                const { width, height } = page.getSize();
                const pngImage = await page.renderPng({ scale: 2 });
                const pngPath = path.join(__dirname, '..', 'uploads', `${filename}_page_${i}.png`);
                await fs.writeFile(pngPath, pngImage);
                
                const pageText = await ocrService.performOCR(pngPath);
                extractedText += pageText + '\n';
                
                await fs.unlink(pngPath); // Clean up temporary PNG file
              }
            } else if (att.contentType.startsWith('image/')) {
              extractedText = await ocrService.performOCR(att.filepath);
            }

            if (extractedText) {
              isInvoice = await invoiceDetectionService.detectInvoice(extractedText);
            }

            return {
              filename: filename,
              contentType: att.contentType,
              size: att.size,
              isInvoice,
              extractedText
            };
          }));

          const newEmail = new Email({
            subject: emailData.subject || 'No Subject',
            sender: emailData.from ? emailData.from.text : 'Unknown Sender',
            receiver: emailData.to ? emailData.to.text : 'Unknown Receiver',
            body: emailData.text || emailData.textAsHtml || 'Empty Body',
            isInvoice: attachments.some(att => att.isInvoice),
            attachments: attachments,
          });

          await newEmail.save();
          return newEmail;
        } catch (saveError) {
          console.error('Error processing individual email:', saveError);
          return null;
        }
      }));

      const savedEmails = processedEmails.filter(email => email !== null);

      res.json({ 
        message: `${savedEmails.length} emails processed and saved to the database.`,
        emails: savedEmails 
      });
    } else {
      res.status(404).json({ message: 'No new emails found.' });
    }
  } catch (error) {
    console.error('Error processing emails:', error);
    res.status(500).json({ message: 'Error processing emails', error: error.message });
  }
};

exports.downloadAttachment = async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Invalid attachment data. Filename is missing.' });
  }

  const fullPath = path.resolve(__dirname, '..', 'uploads', filename);

  try {
    await fs.access(fullPath);
    res.download(fullPath, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(404).json({ error: 'File not found', path: fullPath });
  }
};

exports.previewAttachment = async (req, res) => {
  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const fullPath = path.join(uploadsDir, filename);

  try {
    console.log('Attempting to access file:', fullPath);

    await fs.access(fullPath);

    const fileContent = await fs.readFile(fullPath);
    const contentType = path.extname(filename).toLowerCase() === '.pdf' ? 'application/pdf' : 'image/png';

    res.setHeader('Content-Type', contentType);
    res.send(fileContent);

  } catch (error) {
    console.error('Preview Error:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found', path: fullPath });
    }
    
    res.status(500).json({ error: 'Unable to preview file', details: error.message });
  }
};

