const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Helper function to format currency in TSH
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return `TSH ${parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Generate QR code as buffer
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<Buffer>} QR code as buffer
 */
const generateQRCode = async (text) => {
  try {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 120
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};

/**
 * Generates an expense voucher PDF
 * @param {Object} expense - The expense data with all relations loaded
 * @param {Object} doc - PDFDocument instance
 */
const generateExpenseVoucher = async (expense, doc) => {
  // Set up page margins and dimensions
  const pageWidth = 550;
  const margin = 40; // Increased margin for better spacing
  const contentWidth = pageWidth - (margin * 2);
  
  // Add logo and header (match the organization's letterhead)
  const logoPath = path.join(__dirname, '../public/logos/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin, 25, { width: 80 }); 
  } else {
    console.error('Logo file not found at path:', logoPath);
  }
  
  // Header text - Green text (adjusted spacing)
  doc.fillColor('#165a36')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('ARUSHA WOMEN IN BUSINESS SACCOS LIMITED', 125, 30, { align: 'center' }); 
     
  // Contact information - Black text (adjusted spacing)
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica')
     .text('Email: arushawomen2003@yahoo.com | info@awibsaccos.com', 125, 50, { align: 'center' })
     .text('Tel:+255 27 2543158 Mobile: +255 767 642 839', 125, 62, { align: 'center' })
     .text('Website: www.awib-saccos.com  P.O.Box 6032 ARUSHA', 125, 74, { align: 'center' });
  
  // Light green background for title (adjusted spacing)
  doc.rect(margin, 95, contentWidth, 30) 
     .fillAndStroke('#e6f2ea', '#165a36');
  
  // EXPENSE VOUCHER title
  doc.fillColor('#000000')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('EXPENSE VOUCHER', margin, 102, { align: 'center', width: contentWidth });
  
  // First row with two columns
  let yPos = 135;
  const leftColWidth = contentWidth / 2 - 5;
  const rightColWidth = contentWidth / 2 - 5;
  
  // Left column header - Requester Information
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Requester Information', margin, yPos);
  
  // Underline
  doc.moveTo(margin, yPos + 12)
     .lineTo(margin + leftColWidth, yPos + 12)
     .strokeColor('#0066cc')
     .stroke();
  
  // Right column header - Request Details
  doc.fillColor('#0066cc')
     .fontSize(10)
     .text('Request Details', margin + leftColWidth + 10, yPos);
  
  // Underline
  doc.moveTo(margin + leftColWidth + 10, yPos + 12)
     .lineTo(margin + contentWidth, yPos + 12)
     .strokeColor('#0066cc')
     .stroke();
  
  // Left column content
  yPos += 20;
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica')
     .text(`Name: ${expense.user ? `${expense.user.firstName} ${expense.user.lastName}` : 'N/A'}`, margin, yPos);
  
  yPos += 12;
  doc.text(`Department: ${expense.department ? expense.department.name : 'N/A'}`, margin, yPos);
  
  // Right column content
  yPos = 155;
  doc.text(`Request Number: ${expense.requestNumber}`, margin + leftColWidth + 10, yPos);
  
  yPos += 12;
  doc.text(`Date: ${expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`, margin + leftColWidth + 10, yPos);
  
  yPos += 12;
  doc.text(`Status: ${expense.status}`, margin + leftColWidth + 10, yPos);
  
  // Expense Details section
  yPos = 195;
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Expense Details', margin, yPos);
  
  // Underline
  doc.moveTo(margin, yPos + 12)
     .lineTo(margin + (contentWidth / 2), yPos + 12)
     .strokeColor('#0066cc')
     .stroke();
  
  // Expense amount on right side
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(`Amount: ${formatCurrency(expense.totalEstimatedAmount)}`, margin + leftColWidth + 10, yPos);
  
  // Expense Details content
  yPos += 20;
  doc.fillColor('#000000')
     .font('Helvetica')
     .text(`Title: ${expense.title || 'N/A'}`, margin, yPos);
  
  yPos += 12;
  doc.text(`Purpose: ${expense.purpose || 'N/A'}`, margin, yPos);
  
  // Create a wrapping function for long description text
  const wrapTextWithMax = (text, width, maxLines = 3) => {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const testWidth = doc.widthOfString(testLine);
      
      if (testWidth > width && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
        
        if (lines.length >= maxLines - 1) {
          if (i < words.length - 1) {
            line += '...';
          }
          lines.push(line);
          break;
        }
      } else {
        line = testLine;
      }
    }
    
    if (line.length > 0 && lines.length < maxLines) {
      lines.push(line);
    }
    
    return lines;
  };
  
  yPos += 12;
  const descriptionLines = wrapTextWithMax(expense.description || 'N/A', leftColWidth * 1.8, 3);
  doc.text(`Description: ${descriptionLines[0] || ''}`, margin, yPos);
  
  // Add additional description lines if present
  for (let i = 1; i < descriptionLines.length; i++) {
    yPos += 12;
    doc.text(`${descriptionLines[i] || ''}`, margin + 70, yPos);
  }
  
  // Expense Items section
  yPos = 270; // Adjusted position to accommodate wrapped description
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Expense Items', margin, yPos);
  
  // Underline
  doc.moveTo(margin, yPos + 12)
     .lineTo(margin + contentWidth, yPos + 12)
     .strokeColor('#0066cc')
     .stroke();
  
  // Items table with proper column widths
  yPos += 20;
  const tableTop = yPos;
  const tableColWidths = [
    contentWidth * 0.35, // Description - 35%
    contentWidth * 0.25, // Category - 25%
    contentWidth * 0.08, // Qty - 8%
    contentWidth * 0.16, // Unit Price - 16%
    contentWidth * 0.16  // Total - 16%
  ];
  const tableHeaders = ['Description', 'Category', 'Qty', 'Unit Price', 'Total'];
  
  // Draw table header background
  doc.rect(margin, tableTop, contentWidth, 20)
     .fillAndStroke('#e6e6fa', '#cccccc');
  
  // Table header text
  let xPos = margin;
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica-Bold');
  
  tableHeaders.forEach((header, i) => {
    const align = i >= 2 ? 'right' : 'left';
    const paddingLeft = i >= 2 ? 0 : 5;
    const paddingRight = i >= 2 ? 5 : 0;
    
    const textOptions = { 
      width: tableColWidths[i] - (paddingLeft + paddingRight), 
      align: align 
    };
    
    doc.text(header, xPos + paddingLeft, tableTop + 6, textOptions);
    xPos += tableColWidths[i];
  });
  
  // Table rows
  yPos = tableTop + 20;
  let totalHeight = 0;
  
  // Function to add table row with wrapped text
  const addTableRow = (data, rowY, isAlternate = false) => {
    const initialY = rowY;
    let rowHeight = 20; // Minimum row height
    
    // Pre-calculate wrapped text for description to determine row height
    const wrappedDesc = wrapTextWithMax(data[0], tableColWidths[0] - 10, 2);
    if (wrappedDesc.length > 1) {
      rowHeight = 12 * wrappedDesc.length + 8; // 12pt per line + padding
    }
    
    // Draw row background
    if (isAlternate) {
      doc.rect(margin, rowY, contentWidth, rowHeight)
         .fillAndStroke('#f9f9f9', '#eeeeee');
    } else {
      doc.rect(margin, rowY, contentWidth, rowHeight)
         .fillAndStroke('#ffffff', '#eeeeee');
    }
    
    // Draw cell content
    let x = margin;
    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica');
    
    // Description column with text wrapping
    doc.text(wrappedDesc.join('\n'), x + 5, rowY + 6, { 
      width: tableColWidths[0] - 10,
      align: 'left'
    });
    x += tableColWidths[0];
    
    // Category
    doc.text(data[1], x + 5, rowY + 6, { 
      width: tableColWidths[1] - 10,
      align: 'left' 
    });
    x += tableColWidths[1];
    
    // Quantity
    doc.text(data[2], x + 5, rowY + 6, { 
      width: tableColWidths[2] - 10,
      align: 'right' 
    });
    x += tableColWidths[2];
    
    // Unit Price
    doc.text(data[3], x + 5, rowY + 6, { 
      width: tableColWidths[3] - 10,
      align: 'right' 
    });
    x += tableColWidths[3];
    
    // Total
    doc.text(data[4], x + 5, rowY + 6, { 
      width: tableColWidths[4] - 10,
      align: 'right' 
    });
    
    return initialY + rowHeight;
  };
  
  // Add item rows
  const items = expense.items || [];
  items.forEach((item, index) => {
    const rowData = [
      item.description || '',
      item.category ? item.category.name : '-',
      item.quantity ? item.quantity.toString() : '1',
      formatCurrency(item.unitPrice || 0),
      formatCurrency(item.estimatedAmount)
    ];
    
    // Check if we need a new page
    if (yPos > 650) {
      doc.addPage();
      // Reset position to top of new page
      yPos = 50;
      // Add column headers on new page
      doc.rect(margin, yPos, contentWidth, 20)
         .fillAndStroke('#e6e6fa', '#cccccc');
      
      let headerX = margin;
      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold');
      
      tableHeaders.forEach((header, i) => {
        const align = i >= 2 ? 'right' : 'left';
        const paddingLeft = i >= 2 ? 0 : 5;
        const paddingRight = i >= 2 ? 5 : 0;
        
        const textOptions = { 
          width: tableColWidths[i] - (paddingLeft + paddingRight), 
          align: align 
        };
        
        doc.text(header, headerX + paddingLeft, yPos + 6, textOptions);
        headerX += tableColWidths[i];
      });
      
      yPos += 20;
    }
    
    yPos = addTableRow(rowData, yPos, index % 2 === 0);
  });
  
  // Total row
  doc.rect(margin + (tableColWidths[0] + tableColWidths[1] + tableColWidths[2]), yPos, 
           tableColWidths[3] + tableColWidths[4], 24)
     .fillAndStroke('#e6e6fa', '#cccccc');
  
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('Total:', 
           margin + (tableColWidths[0] + tableColWidths[1] + tableColWidths[2]) + 15, 
           yPos + 8, 
           { width: 50 })
     .text(formatCurrency(expense.totalEstimatedAmount), 
           margin + (tableColWidths[0] + tableColWidths[1] + tableColWidths[2] + tableColWidths[3]), 
           yPos + 8, 
           { align: 'right', width: tableColWidths[4] - 10 });
  
  yPos += 35;
  
  // Approval Workflow section
  const approvalYPos = yPos;
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Approval Workflow', margin, approvalYPos);
  
  // Underline
  doc.moveTo(margin, approvalYPos + 12)
     .lineTo(margin + contentWidth, approvalYPos + 12)
     .strokeColor('#0066cc')
     .stroke();
  
  // Three approval boxes next to each other
  const boxWidth = contentWidth / 3 - 7;
  const boxHeight = 70;
  yPos = approvalYPos + 20;
  
  // Accountant box
  doc.rect(margin, yPos, boxWidth, boxHeight)
     .stroke('#cccccc');
  
  doc.fillColor('#0066cc')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('Accountant Approval', margin + 5, yPos + 5);
  
  // Accountant approval content
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica');
     
  if (expense.accountantApprover) {
    doc.font('Helvetica-Bold')
       .text(`Status: Approved`, margin + 5, yPos + 20)
       .text(`${expense.accountantApprover.firstName} ${expense.accountantApprover.lastName}`, margin + 5, yPos + 33);
    
    doc.font('Helvetica')
       .text(`Date: ${expense.accountantApprovalDate ? new Date(expense.accountantApprovalDate).toLocaleDateString() : 'N/A'}`, margin + 5, yPos + 46);
    
    if (expense.accountantNotes) {
      doc.text(`Notes: ${expense.accountantNotes}`, margin + 5, yPos + 59, { width: boxWidth - 10 });
    }
  } else {
    doc.text(`Status: Pending`, margin + 5, yPos + 20);
  }
  
  // Manager box
  doc.rect(margin + boxWidth + 7, yPos, boxWidth, boxHeight)
     .stroke('#cccccc');
  
  doc.fillColor('#0066cc')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('Manager Approval', margin + boxWidth + 12, yPos + 5);
  
  // Manager approval content
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica');
     
  if (expense.managerApprover) {
    doc.font('Helvetica-Bold')
       .text(`Status: Approved`, margin + boxWidth + 12, yPos + 20)
       .text(`${expense.managerApprover.firstName} ${expense.managerApprover.lastName}`, margin + boxWidth + 12, yPos + 33);
    
    doc.font('Helvetica')
       .text(`Date: ${expense.managerApprovalDate ? new Date(expense.managerApprovalDate).toLocaleDateString() : 'N/A'}`, margin + boxWidth + 12, yPos + 46);
    
    if (expense.managerNotes) {
      doc.text(`Notes: ${expense.managerNotes}`, margin + boxWidth + 12, yPos + 59, { width: boxWidth - 10 });
    }
  } else {
    doc.text(`Status: Pending`, margin + boxWidth + 12, yPos + 20);
  }
  
  // Payment Processing box
  doc.rect(margin + (boxWidth * 2) + 14, yPos, boxWidth, boxHeight)
     .stroke('#cccccc');
  
  doc.fillColor('#0066cc')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('Payment Processing', margin + (boxWidth * 2) + 19, yPos + 5);
  
  // Cashier content
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica');
     
  if (expense.cashierProcessor) {
    doc.font('Helvetica-Bold')
       .text(`Status: Processed`, margin + (boxWidth * 2) + 19, yPos + 20)
       .text(`${expense.cashierProcessor.firstName} ${expense.cashierProcessor.lastName}`, margin + (boxWidth * 2) + 19, yPos + 33);
    
    doc.font('Helvetica')
       .text(`Date: ${expense.processedDate ? new Date(expense.processedDate).toLocaleDateString() : 'N/A'}`, margin + (boxWidth * 2) + 19, yPos + 46);
    
    if (expense.transactionDetails) {
      doc.text(`Ref: ${expense.transactionDetails}`, margin + (boxWidth * 2) + 19, yPos + 59, { width: boxWidth - 10 });
    }
  } else {
    doc.text(`Status: Pending`, margin + (boxWidth * 2) + 19, yPos + 20);
  }
  
  // Rejection status if applicable
  if (expense.status === 'REJECTED') {
    yPos += boxHeight + 15;
    doc.fillColor('#cc0000')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('REJECTED', margin, yPos)
       .font('Helvetica')
       .text(`Reason: ${expense.rejectionReason || 'No reason provided'}`, margin + 70, yPos, { width: contentWidth - 70 });
  }
  
  // Add some spacing to push QR code lower
  yPos += boxHeight + 50;
  
  // Digital verification section
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('DIGITAL VERIFICATION', margin, yPos, { align: 'center', width: contentWidth });
  
  // Add light background
  doc.rect(margin, yPos + 20, contentWidth, 60)
     .fillAndStroke('#f9f9f9', '#e5e5e5');
  
  // Digital verification text
  doc.fillColor('#333333')
     .fontSize(9)
     .font('Helvetica')
     .text('This document is electronically generated and does not require physical signature or stamp for verification.', 
           margin + 20, 
           yPos + 40, 
           { width: contentWidth - 150, align: 'left' });
  
  // QR Code section
  try {
    // Generate QR code data
    const qrCodeData = JSON.stringify({
      id: expense.id,
      number: expense.requestNumber,
      amount: expense.totalEstimatedAmount,
      status: expense.status,
      date: new Date(expense.createdAt).toISOString().split('T')[0]
    });
    
    // Generate the QR code buffer
    const qrBuffer = await generateQRCode(qrCodeData);
    
    // Only add the QR code if generation was successful
    if (qrBuffer) {
      // Place QR code at right side
      doc.image(qrBuffer, margin + contentWidth - 90, yPos + 5, {
        width: 70,
        height: 70
      });
      
      // Add QR code caption
      doc.fillColor('#333333')
         .fontSize(7)
         .text('Scan to verify authenticity', 
               margin + contentWidth - 90, 
               yPos + 80, 
               { width: 70, align: 'center' });
    }
  } catch (error) {
    console.error('QR code error:', error);
  }
  
  // Footer
  doc.fillColor('#666666')
     .fontSize(7)
     .text('This document is automatically generated by the WealthGuard system.', margin, 750, { align: 'center', width: contentWidth });
  
  // Page number and timestamp with time
  const pageCount = doc.bufferedPageRange().count;
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString();
  doc.fillColor('#666666')
     .fontSize(7)
     .text(`Page ${pageCount} | Generated: ${formattedDate} ${formattedTime}`, margin, 760, { align: 'right', width: contentWidth });

  return doc;
};

module.exports = {
  generateExpenseVoucher,
  formatCurrency
};