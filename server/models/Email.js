const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  size: Number
});

const EmailSchema = new mongoose.Schema({
  subject: String,
  sender: String,
  receiver: String,
  body: String,
  isInvoice: Boolean,
  attachments: [AttachmentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Email', EmailSchema);

