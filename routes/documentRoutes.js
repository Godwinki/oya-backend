// routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure multer storage directly in the routes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/member-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${uuidv4()}-${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload a document - requires authentication
router.post('/upload', 
  auth.protect, 
  upload.single('document'), 
  documentController.uploadDocument
);

// Get all documents for a member - requires authentication
router.get('/member/:memberId', 
  auth.protect, 
  documentController.getMemberDocuments
);

// Get a specific document by ID - requires authentication
router.get('/:id', 
  auth.protect, 
  documentController.getDocumentById
);

// Delete a document - requires authentication
router.delete('/:id', 
  auth.protect, 
  documentController.deleteDocument
);

// Verify a document - requires authentication
router.patch('/:id/verify', 
  auth.protect, 
  documentController.verifyDocument
);

// Download a document - requires authentication
router.get('/:id/download', 
  auth.protect, 
  documentController.downloadDocument
);

module.exports = router;
