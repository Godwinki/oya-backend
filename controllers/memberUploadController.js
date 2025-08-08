// memberUploadController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { Member, MemberAccount, AccountType, sequelize } = require('../models');
const validatePhone = require('../utils/validatePhone');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/excel');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// Filter only excel files
const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check for common Excel MIME types
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream', // Common for downloaded templates
    'application/x-msexcel'
  ];
  
  // Log the file info for debugging
  console.log('File upload attempt:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  if (extname && (validMimeTypes.includes(file.mimetype) || file.mimetype.includes('excel'))) {
    cb(null, true);
  } else {
    console.log('File rejected: Not an Excel file');
    cb(new Error('Only Excel files are allowed! Please use the provided template.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get next available account number
const getNextAccountNumber = async (accountTypeId) => {
  try {
    const accountType = await AccountType.findByPk(accountTypeId);
    if (!accountType) {
      throw new Error('Account type not found');
    }
    
    const prefix = accountType.prefix || 'MEM';
    
    // Find the latest account with this prefix
    const latestAccount = await MemberAccount.findOne({
      where: {
        accountNumber: {
          [sequelize.Op.like]: `${prefix}%`
        }
      },
      order: [['accountNumber', 'DESC']]
    });
    
    // Default starting number
    let nextNumber = 1;
    
    if (latestAccount) {
      // Extract the number from the account number
      const currentNumber = parseInt(latestAccount.accountNumber.replace(prefix, ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }
    
    // Create the new account number with padding zeros
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    console.error('Error generating account number:', error);
    throw error;
  }
};

// Generate a sample Excel template for download
exports.generateTemplate = (req, res) => {
  try {
    const headers = [
      'Full Name *', 
      'Account Number', 
      'Phone Number'
    ];
    
    // Create worksheet with headers
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    
    // Create example data row
    const exampleRow = [
      'John Doe',
      '', // Account Number (will be auto-generated if empty)
      '255712345678'
    ];
    
    // Add example row
    xlsx.utils.sheet_add_aoa(ws, [exampleRow], { origin: 1 });
    
    // Column widths
    const wscols = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;
    
    // Create workbook and add worksheet
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Members');
    
    // Create a buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename=member_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template',
      error: error.message
    });
  }
};

// Handle Excel file upload
exports.uploadMembers = async (req, res) => {
  const uploadMiddleware = upload.single('file');
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file!'
      });
    }
    
    // Get the account type ID from the request or find a default
    let accountTypeId = req.body.accountTypeId;
    let defaultAccountTypeId = null;
    
    // If no account type ID provided, find a default one
    if (!accountTypeId) {
      try {
        console.log('No account type ID provided, searching for a default...');
        
        // First try to find the SAVINGS account type (case insensitive)
        const savingsType = await AccountType.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            'savings'
          )
        });
        
        if (savingsType) {
          defaultAccountTypeId = savingsType.id;
          console.log(`Found SAVINGS account type with ID: ${defaultAccountTypeId}`);
        } else {
          // Next try to find SHARES account type
          const sharesType = await AccountType.findOne({
            where: sequelize.where(
              sequelize.fn('LOWER', sequelize.col('name')),
              'shares'
            )
          });
          
          if (sharesType) {
            defaultAccountTypeId = sharesType.id;
            console.log(`Found SHARES account type with ID: ${defaultAccountTypeId}`);
          } else {
            // Last resort - get any account type
            const anyType = await AccountType.findOne();
            if (anyType) {
              defaultAccountTypeId = anyType.id;
              console.log(`Found account type ${anyType.name} with ID: ${defaultAccountTypeId}`);
            } else {
              console.error('No account types found in the database');
              return res.status(400).json({
                success: false,
                message: 'No account types found in the system. Please create at least one account type first.'
              });
            }
          }
        }
        
        // Use the default account type ID we found
        accountTypeId = defaultAccountTypeId;
        
      } catch (error) {
        console.error('Error finding default account type:', error);
        return res.status(500).json({
          success: false,
          message: 'Error finding default account type: ' + error.message
        });
      }
    }
    
    try {
      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty!'
        });
      }
      
      const results = {
        success: [],
        errors: [],
        total: data.length
      };
      
      const transaction = await sequelize.transaction();
      
      try {
        for (const row of data) {
          // Map Excel columns to Member model fields
          // Required fields validation
          if (!row['Full Name *']) {
            results.errors.push({
              row: { ...row },
              error: 'Full Name is required'
            });
            continue;
          }
          
          // Generate a random 20-digit NIN for each member
          const generateRandomNIN = () => {
            // Start with date part (YYYYMMDD)
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            // Add random digits to complete 20 digits
            const randomPart = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
            return datePart + randomPart;
          };
          
          // Prepare member data with auto-generated NIN
          const memberData = {
            fullName: row['Full Name *'],
            nin: generateRandomNIN(), // Auto-generate NIN
            idNo: generateRandomNIN(), // Auto-generate ID
            // Ensure phone is a string before passing to formatPhone
            mobile: row['Phone Number'] ? validatePhone.formatPhone(String(row['Phone Number'])) : null,
            region: 'Arusha', // Default to Arusha as requested
            // Set minimum required fields with defaults
            email: null,
            dateOfBirth: null,
            placeOfBirth: null,
            district: null,
            ward: null,
            village: null,
            residence: null,
            pobox: null,
            maritalStatus: null,
            employmentStatus: null,
            employerName: null,
            incomeBracket: null,
            tin: null
          };
          
          console.log(`Member created with auto-generated NIN: ${memberData.nin}`);
          
          // Create member
          try {
            
            console.log(`Creating member with data:`, JSON.stringify(memberData));
            const newMember = await Member.create(memberData, { transaction });
            
            // Generate a proper account number if not provided
            let accountNumber = row['Account Number'];
            if (!accountNumber) {
              // Find the first account type (just for the prefix)
              const defaultType = await AccountType.findOne();
              if (defaultType && defaultType.prefix) {
                // Use the account type's prefix to generate a number
                accountNumber = await getNextAccountNumber(defaultType.id);
                console.log(`Generated account number: ${accountNumber}`);
              } else {
                // Fallback to a generic MEM prefix
                const prefix = 'MEM';
                // Find the latest account with this prefix
                const latestMember = await Member.findOne({
                  order: [['id', 'DESC']]
                });
                
                // Default starting number
                let nextNumber = 1;
                
                if (latestMember && latestMember.id) {
                  nextNumber = latestMember.id + 1;
                }
                
                // Create the new account number with padding zeros
                const paddedNumber = String(nextNumber).padStart(6, '0');
                accountNumber = `${prefix}${paddedNumber}`;
                console.log(`Generated fallback account number: ${accountNumber}`);
              }
            }
            
            // Update the member record with the account number
            await newMember.update({
              accountNumber: accountNumber
            }, { transaction });
            
            console.log(`Member updated with account number: ${accountNumber}`);
            
            // Skip account creation - will be done manually later
            console.log(`Member created successfully, accounts will be added manually later`);
            
            results.success.push({
              id: newMember.id,
              fullName: newMember.fullName,
              nin: newMember.nin,
              accountNumber: accountNumber
            });
          } catch (createError) {
            console.error(`Error creating member:`, createError);
            results.errors.push({
              row: { ...row },
              error: createError.message || 'Unknown validation error'
            });
          }
        }
        
        await transaction.commit();
        
        // Delete uploaded file after processing
        fs.unlinkSync(filePath);
        
        return res.status(200).json({
          success: true,
          message: `Processed ${data.length} members. ${results.success.length} created successfully, ${results.errors.length} failed.`,
          results
        });
      } catch (processError) {
        await transaction.rollback();
        throw processError;
      }
    } catch (error) {
      console.error('Error processing Excel file:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing Excel file',
        error: error.message
      });
    }
  });
};
