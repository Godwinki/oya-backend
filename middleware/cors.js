// Super permissive CORS middleware for testing
const setCors = (req, res, next) => {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Allow all methods and headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  
  next();
};

module.exports = setCors;
