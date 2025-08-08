const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const { Sequelize } = require('sequelize');
const colors = require('colors');
require('dotenv').config();
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimiter');
const userRoutes = require('./routes/userRoutes');
const config = require('./config/config.json');
const activityRoutes = require('./routes/activityRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const budgetCategoryRoutes = require('./routes/budgetCategoryRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const memberRoutes = require('./routes/memberRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const accountRoutes = require('./routes/accountRoutes');


const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

// Add this before initializing Express app
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const receiptsDir = path.join(uploadsDir, 'receipts');
  const memberDocsDir = path.join(uploadsDir, 'member-documents');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir);
  }
  if (!fs.existsSync(memberDocsDir)) {
    fs.mkdirSync(memberDocsDir);
  }
};

// Initialize Express app
const app = express();
ensureUploadsDirectory();

// Custom Banner
const displayBanner = () => {
  console.log('\n');
  console.log('⚡️'.yellow, '='.repeat(50).cyan);
  console.log(`
     /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     /\\\\\\     /\\\\\\  /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     
    /\\\\\\//////     /\\\\\\//////     \\/\\\\\\    /\\\\\\  /\\\\\\//////     /\\\\\\//////     /\\\\\\//////      

  `.blue);
  console.log('🏦', 'T Management System v1.0.0'.yellow.bold);
  console.log('📍', ' Server Status:'.cyan, 'Initializing...'.yellow);
  console.log('⚡️'.yellow, '='.repeat(50).cyan);
  console.log('\n');
};

// Replace existing console.log banner with:
displayBanner();

// Database connection setup
console.log('\n🔄 Setting up database connection...'.yellow);

// Log the DATABASE_URL if available (without exposing credentials)
if (process.env.DATABASE_URL) {
  const sanitizedUrl = process.env.DATABASE_URL.replace(/(postgresql:\/\/[^:]+:)[^@]+(@.+)/, '$1****$2');
  console.log(`🔄 DATABASE_URL is set: ${sanitizedUrl}`.yellow);
} else {
  console.log('⚠️ No DATABASE_URL found, will use local config'.yellow);
}

// Import database models
const db = require('./models');
const sequelize = db.sequelize;

// Function to initialize database including SMS tables
const initDatabase = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully'.green);
    
    // Check if we should sync database (only in development or when forced via env var)
    if (process.env.NODE_ENV === 'development' || process.env.FORCE_DB_SYNC === 'true') {
      console.log('🔄 Starting database sync (this will create all tables)...'.yellow);
      
      // Sync database - this will create all tables based on models
      // Using { alter: false } to prevent modifying existing tables in production
      const syncOptions = process.env.NODE_ENV === 'production' ? { alter: false } : { alter: true };
      await sequelize.sync(syncOptions);
      console.log('✅ Database sync completed successfully'.green);
    } else {
      console.log('ℹ️ Database sync skipped (set FORCE_DB_SYNC=true to enable)'.blue);
    }
  } catch (error) {
    console.error('❌ Database connection error:'.red, error.message);
    // Don't exit process on DB error in production - allow the server to start anyway
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      console.error('⚠️ Continuing despite database error in production environment'.yellow);
    }
  }
};

// Database initialization will be handled by initializeDatabase() in startServer()
// Removed redundant initDatabase() call to prevent sync conflicts

// Middleware
app.use(helmet()); // Security headers

// Add static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// For Railway deployments, trust the X-Forwarded headers
// Place this BEFORE any middleware that uses this setting
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0); // Trust first proxy in production

// Use the cors package instead of custom middleware for more reliable CORS handling
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://awibsaccosms.netlify.app', 'https://awibsms.netlify.app'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      console.log(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    }
    console.log(`CORS allowed origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// Explicit OPTIONS preflight handler - this helps with some CORS edge cases
app.options('*', cors());

// Let express use its built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Simplified logging for troubleshooting
app.use(morgan('dev'));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  morgan.token('emoji', (req) => {
    switch (req.method) {
      case 'GET': return '👀';
      case 'POST': return '📝';
      case 'PUT': return '📤';
      case 'DELETE': return '🗑️';
      default: return '❓';
    }
  });
  app.use(morgan(':emoji  :method :url :status :response-time ms'));
} else {
  // In production, only log errors
  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000 || 15 * 60 * 1000, // Default 15 minutes if not set
  max: process.env.RATE_LIMIT_MAX || 100, // Default 100 requests per windowMs
  message: '⚠️  Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP from X-Forwarded-For but only trust Railway's proxy
  keyGenerator: (req) => {
    // For Railway, get the real IP from X-Forwarded-For
    return req.ip || req.connection.remoteAddress;
  }
});
app.use(limiter);

// Health check endpoint for Railway deployment
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AWIB SACCO API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    features: ['SMS messaging', 'Notifications', 'Member management']
  });
});

// Add a simple ping endpoint that doesn't use DB
app.get('/ping', (req, res) => {
  // Add detailed logging to help diagnose health check issues
  console.log(`PING request received from ${req.ip || 'unknown'} at ${new Date().toISOString()}`);
  
  // Send a simple response for Railway health checks
  res.set('Connection', 'keep-alive');
  res.set('Cache-Control', 'no-cache');
  res.status(200).send('pong');
});

// Add diagnostic routes BEFORE authentication middleware
const diagnosticRoutes = require('./routes/diagnosticRoutes');
app.use('/api/diagnostic', diagnosticRoutes);

// Session management
const sessionConfig = {
  store: new pgSession({
    conObject: process.env.DATABASE_URL 
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {
          connectionString: `postgres://${config.development.username}:${config.development.password}@${config.development.host}:${config.development.port || 5432}/${config.development.database}`
        },
    createTableIfMissing: true,
    pruneSessionInterval: 60
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined
  }
};

app.use(session(sessionConfig));

// Routes with proper prefixes
app.use('/api/activities', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/budget-categories', budgetCategoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/leaves', leaveRoutes); 
app.use('/api/notifications', notificationRoutes); 

// Register settings routes at top-level
const settingRoutes = require('./routes/settingRoutes');
app.use('/api/settings', settingRoutes);

app.use('/api/members', memberRoutes);

// Member bulk upload routes
const memberUploadRoutes = require('./routes/memberUploadRoutes');
app.use('/api/member-uploads', memberUploadRoutes);

app.use('/api/documents', documentRoutes);
app.use('/api/accounts', accountRoutes);

// Import account type controller directly
const accountController = require('./controllers/accountController');
const { protect } = require('./middleware/authMiddleware');

// Add direct routes for account types to match frontend expectations
app.get('/api/account-types', protect, accountController.getAccountTypes);
app.get('/api/account-types/:id', protect, accountController.getAccountTypeById);


// Apply API rate limiting to routes except special cases
// The readOnlyLimiter is applied directly in the route files for special endpoints
app.use('/api/users', apiLimiter);
app.use('/api/budgets', apiLimiter);
app.use('/api/activities', apiLimiter);
app.use('/api/expenses', apiLimiter);

// Add a catch-all route for debugging
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Update the initializeDatabase function
const initializeDatabase = async () => {
  try {
    console.log('\n🔄 Initializing database...'.yellow);
    
    // Test database connection with retry logic
    let retries = 5;
    let lastError;
    
    while (retries) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully'.green);
        break;
      } catch (error) {
        lastError = error;
        retries -= 1;
        if (retries === 0) {
          console.error('❌ All connection attempts failed'.red);
          throw lastError;
        }
        console.log(`⚠️ Database connection attempt failed. Retrying... (${retries} attempts left)`.yellow);
        console.log(`Error details: ${error.message}`.yellow);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Explicitly require the Member model to ensure it's loaded
    try {
      require('./models/Member');
      console.log('✅ Member model loaded successfully'.green);
    } catch (error) {
      console.error('❌ Error loading Member model:'.red, error.message);
    }
    
    // Check if this is a fresh database by looking for Users table
    let isFreshDatabase = false;
    try {
      const usersTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Users'
        )`,
        { type: sequelize.QueryTypes.SELECT, plain: true }
      );
      isFreshDatabase = !usersTableExists.exists;
    } catch (error) {
      // If we can't check, assume it's a fresh database
      isFreshDatabase = true;
    }
    
    if (isFreshDatabase) {
      console.log('🆕 Fresh database detected - enabling synchronization to create tables'.green);
      try {
        await sequelize.sync({ alter: false });
        console.log('✅ Database tables created successfully'.green);
      } catch (syncError) {
        console.error('❌ Error creating database tables:'.red, syncError.message);
        throw syncError;
      }
    } else {
      console.log('ℹ️ Existing database detected - skipping synchronization to prevent conflicts'.yellow);
      console.log('✅ Using existing database schema'.green);
    }
    
    // Verify Member table was created
    try {
      const memberTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Members'
        )`,
        { type: sequelize.QueryTypes.SELECT, plain: true }
      );
      
      if (memberTableExists && memberTableExists.exists) {
        console.log('✅ Members table exists in database'.green);
      } else {
        console.log('⚠️ Members table does not exist in database'.yellow);
        
        // Attempt to explicitly create Members table if it's missing
        console.log('🔧 Attempting to create Members table...'.yellow);
        try {
          const Member = require('./models/Member');
          await Member.sync();
          console.log('✅ Members table created successfully'.green);
        } catch (error) {
          console.error('❌ Error creating Members table:'.red, error.message);
          // Continue execution despite table creation error
        }
      }
    } catch (error) {
      console.error('❌ Error verifying/creating Members table:'.red, error.message);
      // Continue execution despite table verification error
    }
    
    // Check if admin user exists and create if not
    const AdminSeeder = require('./seeders/20240328-admin-user');
    const [results] = await sequelize.query('SELECT * FROM "Users" WHERE role = \'admin\' LIMIT 1');
    
    if (results.length === 0) {
      console.log('👤 No admin user found, creating one...'.yellow);
      await AdminSeeder.up(sequelize.getQueryInterface(), Sequelize);
      console.log('👤 Admin user created successfully'.green);
    } else {
      console.log('👤 Admin user already exists'.green);
    }
    
    console.log('✅ Database synchronized successfully'.green);

  } catch (error) {
    console.error('❌ Database initialization error:'.red);
    console.error('⚠️  Details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Update start server function
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Railway expects the server to listen on PORT
    const server = app.listen(PORT, () => {
      console.log('🚀'.green, `Server running on port ${PORT}`.cyan);
      console.log('📍'.yellow, `Environment: ${process.env.NODE_ENV}`.cyan);
      console.log('🔗'.yellow, `Health check at: /ping`.cyan);
      console.log('⚡️'.yellow, '='.repeat(50).cyan);
    });

    // Critical for Railway - specify longer timeouts to prevent premature connection termination
    server.keepAliveTimeout = 65000; // Ensure longer than ALB's idle timeout (usually 60s)
    server.headersTimeout = 66000; // Slightly more than keepAliveTimeout
    
    // Add proper shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`🛑 Received ${signal || 'shutdown'} signal, closing server...`.yellow);
      server.close(() => {
        console.log('✅ Server closed successfully'.green);
        process.exit(0);
      });
      
      // Force close if it takes too long
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down'.red);
        process.exit(1);
      }, 30000); // Give it 30 seconds to close connections
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:'.red, error.message);
      
      // Don't exit on connection errors in production
      if (process.env.NODE_ENV === 'production' && 
          (error.code === 'ECONNRESET' || error.code === 'EPIPE')) {
        console.log('⚠️ Connection error in production - not exiting'.yellow);
      } else {
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:'.red, error);
    process.exit(1);
  }
};

startServer();

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:'.red, err.stack);
  res.status(500).json({
    status: 'error',
    message: '🔥 Internal server error'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION! Shutting down...'.red.bold);
  console.error('Error:', err);
  process.exit(1);
});