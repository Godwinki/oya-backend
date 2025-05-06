const express = require('express');
const router = express.Router();

// Simple diagnostic endpoint that won't cause crashes
router.get('/cors-test', (req, res) => {
  try {
    console.log('CORS Test Endpoint Called');
    
    // Set CORS headers directly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Return simple response
    return res.json({
      success: true,
      message: 'CORS test endpoint reached successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    return res.status(500).json({ error: 'Internal server error in diagnostic endpoint' });
  }
});

// Simple OPTIONS handler
router.options('/cors-test', (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(200).end();
  } catch (error) {
    console.error('Error in OPTIONS handler:', error);
    return res.status(500).end();
  }
});

module.exports = router;
