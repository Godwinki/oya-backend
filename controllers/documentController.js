// controllers/documentController.js
const db = require('../models');
const MemberDocument = db.MemberDocument;
const fs = require('fs');
const path = require('path');

// Upload a document
exports.uploadDocument = async (req, res) => {
  console.log('📝 [Document] Upload document request received');
  try {
    const { memberId, documentType, description, category, expiryDate } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ emoji: '❌', error: 'No file uploaded' });
    }
    
    const document = await MemberDocument.create({
      memberId,
      documentType,
      documentName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description,
      category,
      expiryDate: expiryDate || null
    });
    
    console.log('✅ [Document] Document uploaded:', document.id);
    res.status(201).json({ 
      emoji: '🎉', 
      message: 'Document uploaded successfully', 
      document 
    });
  } catch (error) {
    console.log('❌ [Document] Failed to upload document:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Get all documents for a member
exports.getMemberDocuments = async (req, res) => {
  console.log(`📥 [Document] Request to list documents for member: ${req.params.memberId}`);
  try {
    const documents = await MemberDocument.findAll({
      where: { memberId: req.params.memberId }
    });
    console.log(`✅ [Document] Returned ${documents.length} documents for member: ${req.params.memberId}`);
    res.json({ 
      emoji: '📁', 
      message: 'Member documents fetched successfully', 
      documents 
    });
  } catch (error) {
    console.log('❌ [Document] Failed to fetch documents:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get a specific document by ID
exports.getDocumentById = async (req, res) => {
  console.log(`📥 [Document] Request to get document: ${req.params.id}`);
  try {
    const document = await MemberDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [Document] Document not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    console.log(`✅ [Document] Document returned: ${req.params.id}`);
    res.json({ emoji: '📄', message: 'Document fetched successfully', document });
  } catch (error) {
    console.log('❌ [Document] Failed to fetch document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  console.log(`🗑️ [Document] Delete request for document: ${req.params.id}`);
  try {
    const document = await MemberDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [Document] Document not found for delete: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    // Delete the physical file if it exists
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    await document.destroy();
    console.log(`✅ [Document] Document deleted: ${req.params.id}`);
    res.json({ emoji: '🗑️', message: 'Document deleted successfully' });
  } catch (error) {
    console.log('❌ [Document] Failed to delete document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Verify a document
exports.verifyDocument = async (req, res) => {
  console.log(`✓ [Document] Verify request for document: ${req.params.id}`);
  try {
    const document = await MemberDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [Document] Document not found for verification: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    // Update verification details
    await document.update({
      isVerified: true,
      verifiedBy: req.user.id,
      verificationDate: new Date()
    });
    
    console.log(`✅ [Document] Document verified: ${req.params.id}`);
    res.json({ emoji: '✓', message: 'Document verified successfully', document });
  } catch (error) {
    console.log('❌ [Document] Failed to verify document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Download a document
exports.downloadDocument = async (req, res) => {
  console.log(`📥 [Document] Download request for document: ${req.params.id}`);
  try {
    const document = await MemberDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [Document] Document not found for download: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    if (!fs.existsSync(document.filePath)) {
      console.log(`⚠️ [Document] File not found on disk: ${document.filePath}`);
      return res.status(404).json({ emoji: '⚠️', error: 'File not found on disk' });
    }
    
    res.download(document.filePath, document.documentName);
  } catch (error) {
    console.log('❌ [Document] Failed to download document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
