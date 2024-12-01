const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.get('/', emailController.getEmails);
router.get('/fetch', emailController.fetchAndProcessEmails);
router.post('/download', emailController.downloadAttachment);
router.get('/preview', emailController.previewAttachment);

module.exports = router;
