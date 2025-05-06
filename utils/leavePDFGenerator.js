const PDFDocument = require('pdfkit');

const fs = require('fs');
const path = require('path');

function generateLeavePDF(leave, stream) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(stream);

  // --- Layout constants ---
  const pageWidth = 550;
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // --- Logo and Branding ---
  const logoPath = path.join(__dirname, '../public/logos/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin, yPos, { width: 80 });
  }
  // Header text - Green text
  doc.fillColor('#165a36')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('ARUSHA WOMEN IN BUSINESS SACCOS LIMITED', margin + 85, yPos + 10, { align: 'left' });
  // Contact information
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica')
     .text('Email: arushawomen2003@yahoo.com | info@awibsaccos.com', margin + 85, yPos + 28, { align: 'left' })
     .text('Tel:+255 27 2543158 Mobile: +255 767 642 839', margin + 85, yPos + 38, { align: 'left' })
     .text('Website: www.awib-saccos.com  P.O.Box 6032 ARUSHA', margin + 85, yPos + 48, { align: 'left' });

  // Add extra space below logo and header
  yPos = 105;

  // Light green background for title
  doc.rect(margin, yPos, contentWidth, 30)
     .fillAndStroke('#e6f2ea', '#165a36');
  doc.fillColor('#000000')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('LEAVE REQUEST DOCUMENT', margin, yPos + 7, { align: 'center', width: contentWidth });

  // --- Two columns: Requester Information & Leave Details ---
  yPos += 50;
  const leftColWidth = contentWidth / 2 - 5;
  const rightColWidth = contentWidth / 2 - 5;

  // Left column header
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Requester Information', margin, yPos);
  doc.moveTo(margin, yPos + 14)
     .lineTo(margin + leftColWidth, yPos + 14)
     .strokeColor('#0066cc')
     .stroke();
  // Left column content
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica')
     .text(`Name: ${leave.requestedBy ? leave.requestedBy.firstName + ' ' + leave.requestedBy.lastName : 'N/A'}`, margin, yPos + 22)
     .text(`Department: ${leave.department ? leave.department.name : 'N/A'}`, margin, yPos + 36);

  // Right column header
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Leave Details', margin + leftColWidth + 10, yPos);
  doc.moveTo(margin + leftColWidth + 10, yPos + 14)
     .lineTo(margin + contentWidth, yPos + 14)
     .strokeColor('#0066cc')
     .stroke();
  // Right column content
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica')
     .text(`Request Number: ${leave.requestNumber || ''}`, margin + leftColWidth + 10, yPos + 22)
     .text(`Type: ${leave.type}`, margin + leftColWidth + 10, yPos + 36)
     .text(`Status: ${leave.status}`, margin + leftColWidth + 10, yPos + 50)
     .text(`Start Date: ${leave.startDate ? new Date(leave.startDate).toLocaleDateString() : ''}`, margin + leftColWidth + 10, yPos + 64)
     .text(`End Date: ${leave.endDate ? new Date(leave.endDate).toLocaleDateString() : ''}`, margin + leftColWidth + 10, yPos + 78);

  // --- Reason Section ---
  yPos += 110;
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Reason', margin, yPos);
  doc.moveTo(margin, yPos + 14)
     .lineTo(margin + contentWidth, yPos + 14)
     .strokeColor('#0066cc')
     .stroke();
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica')
     .text(leave.reason || '', margin, yPos + 22, { width: contentWidth });

  // --- Approval Section ---
  yPos += 60;
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Approval', margin, yPos);
  doc.moveTo(margin, yPos + 14)
     .lineTo(margin + contentWidth, yPos + 14)
     .strokeColor('#0066cc')
     .stroke();
  doc.fillColor('#000000')
     .fontSize(9)
     .font('Helvetica');
  if (leave.status === 'APPROVED') {
    doc.text(`Approved By: ${leave.approver ? leave.approver.firstName + ' ' + leave.approver.lastName : ''}`, margin, yPos + 22)
       .text(`Approval Comments: ${leave.approvalNotes || ''}`, margin, yPos + 36)
       .text(`Approval Date: ${leave.approvedAt ? new Date(leave.approvedAt).toLocaleDateString() : ''}`, margin, yPos + 50);
  } else {
    doc.text('Not approved', margin, yPos + 22);
  }

  // --- Rejection Section ---
  if (leave.status === 'REJECTED') {
    yPos += 56;
    doc.fillColor('#cc0000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Rejection', margin, yPos);
    doc.moveTo(margin, yPos + 14)
       .lineTo(margin + contentWidth, yPos + 14)
       .strokeColor('#cc0000')
       .stroke();
    doc.fillColor('#000000')
       .fontSize(9)
       .font('Helvetica')
       .text(`Rejected By: ${leave.rejector ? leave.rejector.firstName + ' ' + leave.rejector.lastName : ''}`, margin, yPos + 22)
       .text(`Rejection Reason: ${leave.rejectionReason || ''}`, margin, yPos + 36)
       .text(`Rejection Date: ${leave.rejectedAt ? new Date(leave.rejectedAt).toLocaleDateString() : ''}`, margin, yPos + 50);
  }

  // --- Meta Section ---
  yPos += 70;
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Meta Information', margin, yPos);
  doc.moveTo(margin, yPos + 14)
     .lineTo(margin + contentWidth, yPos + 14)
     .strokeColor('#0066cc')
     .stroke();
  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica')
     .text(`Created At: ${leave.createdAt ? new Date(leave.createdAt).toLocaleString() : ''}`, margin, yPos + 22)
     .text(`Updated At: ${leave.updatedAt ? new Date(leave.updatedAt).toLocaleString() : ''}`, margin, yPos + 36);

  // --- Verification Section (Stamp & Signature) ---
  yPos += 70;
  doc.fillColor('#0066cc')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('OFFICIAL VERIFICATION', margin, yPos, { align: 'center', width: contentWidth });
  doc.rect(margin, yPos + 20, contentWidth, 80)
     .fillAndStroke('#f8f8f8', '#cccccc');
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('OFFICE STAMP', margin + 20, yPos + 30);
  doc.rect(margin + 20, yPos + 45, 150, 45)
     .dash(3, { space: 3 })
     .strokeColor('#0066cc')
     .stroke();
  doc.fillColor('#555555')
     .fontSize(7)
     .font('Helvetica-Oblique')
     .text('(Place official stamp here)', margin + 45, yPos + 65);
  doc.fillColor('#0066cc')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('SIGNATURE', margin + 250, yPos + 30);
  doc.moveTo(margin + 250, yPos + 70)
     .lineTo(margin + 480, yPos + 70)
     .undash()
     .lineWidth(1)
     .strokeColor('#000000')
     .stroke();
  doc.fillColor('#555555')
     .fontSize(7)
     .font('Helvetica')
     .text('Authorized Signature', margin + 350, yPos + 75);

  // --- Footer ---
  doc.fontSize(7)
     .fillColor('#555555')
     .text('This document is automatically generated by AWIB SACCOS.', margin, 740, { align: 'center', width: contentWidth });

  doc.end();
}



module.exports = { generateLeavePDF };
