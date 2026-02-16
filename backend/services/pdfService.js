import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// For QR codes, use production URL (not localhost)
const frontendUrl = (() => {
  const urls = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(u => u.trim());
  // Prefer https URLs for QR codes (production), fallback to first URL
  return urls.find(u => u.startsWith('https://')) || urls[0];
})();

/** Global cache for static assets (social icons) to avoid re-loading/resizing on every PDF. */
let cachedSocialIcons = null;

const COLORS = {
  primary: '#0051a3', // Professional Blue
  text: '#1a1a1a',
  textMuted: '#4b5563',
  danger: '#dc2626',
  surface: '#f3f4f6', // Light Gray background for headers/tables
  border: '#e5e7eb',
};

/** Convert number to words (Pakistani style) */
function numberToWords(num) {
  if (num === 0) return 'Zero';
  if (!num || isNaN(num)) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convert = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };

  const result = convert(Math.floor(num));
  return result.trim() + ' Only';
}

/** Resolve showroom logo path (stored as /api/uploads/logos/filename) to absolute file path, or null if missing. */
function getShowroomLogoPath(logoPath) {
  if (!logoPath || typeof logoPath !== 'string') return null;
  const filename = path.basename(logoPath);
  const fullPath = path.join(process.cwd(), 'uploads', 'logos', filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

/** Resolve biometric image path (stored as /api/uploads/biometrics/filename) to absolute file path. */
function getBiometricImagePath(imgPath) {
  if (!imgPath || typeof imgPath !== 'string') return null;
  const filename = path.basename(imgPath);
  const fullPath = path.join(process.cwd(), 'uploads', 'biometrics', filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

/** Load logo as buffer; convert WebP to PNG for PDFKit (which only supports JPEG/PNG). */
async function loadLogoBuffer(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return null;
  const ext = path.extname(logoPath).toLowerCase();
  try {
    if (ext === '.webp') {
      const sharp = (await import('sharp')).default;
      return await sharp(logoPath).png().toBuffer();
    }
    return fs.readFileSync(logoPath);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Logo load failed', err);
    }
    return null;
  }
}

/** QR and verification URL: links to /verify-sale/{transactionId} */
function getVerificationUrl(transactionId) {
  return `${frontendUrl}/verify-sale/${transactionId}`;
}

/** Prepare QR and logo once; reuse for all PDFs. Never throws: missing QR/logo are skipped in layout. */
async function prepareAssets(transaction) {
  let qrBuffer = null;
  try {
    const verificationUrl = getVerificationUrl(transaction._id);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 100, margin: 1 });
    qrBuffer = dataUrlToBuffer(qrDataUrl);
  } catch (err) {
    console.warn('[PDF] QR generation failed:', err.message);
  }

  let logoImage = null;
  const logoPath = getShowroomLogoPath(transaction?.showroom?.logoPath);
  if (logoPath) {
    try {
      logoImage = await loadLogoBuffer(logoPath);
    } catch (err) {
      console.warn('[PDF] Logo load failed:', err.message);
    }
  }

  // Load social logos once and cache them
  if (!cachedSocialIcons) {
    const socialIcons = { facebook: null, instagram: null, whatsapp: null, address: null, phone: null };
    const assetsDir = path.join(process.cwd(), 'assets');
    const socialIconPixels = 56;
    const footerIconPixels = 16; // Smaller size for address/phone icons
    const socialFiles = [
      { key: 'facebook', file: 'facebook.webp', size: socialIconPixels },
      { key: 'instagram', file: 'insta.webp', size: socialIconPixels },
      { key: 'whatsapp', file: 'whatsapp.webp', size: socialIconPixels },
      { key: 'address', file: 'address.webp', size: footerIconPixels },
      { key: 'phone', file: 'phone.webp', size: footerIconPixels },
    ];

    try {
      const sharpModule = await import('sharp').catch(() => null);
      const sharp = sharpModule?.default;

      for (const { key, file, size } of socialFiles) {
        const filePath = path.join(assetsDir, file);
        if (!fs.existsSync(filePath)) continue;
        const buf = fs.readFileSync(filePath);

        if (sharp) {
          socialIcons[key] = await sharp(buf)
            .resize(size, size)
            .png()
            .toBuffer()
            .catch(() => buf); // Fallback to raw buffer if sharp resize fails
        } else {
          socialIcons[key] = buf; // Fallback to raw buffer if sharp is missing
        }
      }
      cachedSocialIcons = socialIcons;
    } catch (err) {
      console.warn('[PDF] Social logos load failed:', err.message);
      cachedSocialIcons = socialIcons; // Cache the partial/null results anyway to avoid repeated fails
    }
  }

  return { qrBuffer, logoImage, socialIcons: cachedSocialIcons };
}

/** Convert data URL to buffer for PDFKit image. */
function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

/** Truncate to one line so footer text doesn't wrap and cause new pages. */
function oneLine(str, maxLen = 58) {
  if (str == null || str === '') return '';
  const s = String(str).trim();
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
}

/** Check if current Y will overlap with footer, if so add a new page. */
function checkPageBreak(doc, y, footerReserved = 90) {
  const pageHeight = doc.page.height;
  if (y > pageHeight - footerReserved) {
    doc.addPage({ size: 'A4', margin: 20 });
    return 30; // Return new starting Y
  }
  return y;
}

function formatCnic(cnic) {
  const digits = (cnic || '').toString().replace(/[^0-9]/g, '');
  if (!digits || digits.length < 13) return cnic || '';
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/** Draws a professional header with black text and a subtle line. */
function drawSectionHeader(doc, title, x, y, width) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
    .text(title.toUpperCase(), x, y);
  const textHeight = doc.heightOfString(title.toUpperCase());
  const lineY = y + textHeight + 2;
  doc.lineWidth(0.8).strokeColor(COLORS.text).moveTo(x, lineY).lineTo(x + width, lineY).stroke();
  doc.lineWidth(1);
  return textHeight + 5; // Balanced header height
}

/**
 * Draw "Official Copy" / "Internal Copy" watermark (diagonal, light).
 */
function drawWatermark(doc, text = 'Official Copy') {
  const x = doc.page.width / 2;
  const y = doc.page.height / 2;
  doc.save();
  doc.opacity(0.08);
  doc.fontSize(48).font('Helvetica-Bold');
  doc.translate(x, y);
  doc.rotate(-30, { origin: [0, 0] });
  doc.text(text, -200, -24, { width: 400, align: 'center' });
  doc.restore();
  doc.opacity(1);
}

/**
 * UPDATED PDF GENERATION TO MATCH "CARLAV" VISUAL LAYOUT
 */
async function drawReceiptLayout(doc, transaction, qrImage, options = {}) {
  const { watermark, logoImage: logoImageOption, socialIcons: socialIconsOption } = options;
  const v = transaction.vehicle || {};
  const s = transaction.showroom || {};
  const createdBy = transaction.createdBy || {};

  // Fixed date format (no locale) for legal documents; safe for invalid/malformed dates
  const fmt = (d) => {
    if (d == null || d === '') return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (_) {
      return '';
    }
  };
  const regDate = fmt(v.dateOfRegistration);
  const salesCertDate = fmt(v.salesCertificateDate);
  const invDate = fmt(v.invoiceDate);
  const cplcDt = fmt(v.cplcDate);
  const cplcDateTime = `${cplcDt}${v.cplcTime ? ` ${v.cplcTime}` : ''}`.trim() || '';
  const txDate = fmt(transaction.transactionDate) || fmt(new Date());

  if (watermark) drawWatermark(doc, watermark);
  doc.opacity(1).fillColor('black');

  let y = 5; // Aggressively reduced from 10
  const left = 40;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const fullWidth = 515;
  const centerX = left + fullWidth / 2;

  // --- 0. QR CODE (top left) ---
  const qrSize = 56;
  const qrY = 16;
  const qrX = left;
  if (qrImage && qrImage.length) {
    try {
      doc.image(qrImage, qrX, qrY, { width: qrSize });
      // Rotated text beside QR code (90 degrees)
      doc.save();
      doc.fontSize(5).font('Helvetica').fillColor('black');
      // Translate to the right of QR code, then rotate
      doc.translate(qrX + qrSize + 10, qrY + qrSize - 4);
      doc.rotate(-90);
      doc.text('Scan me for verification', 0, 0);
      doc.restore();
    } catch (err) {
      console.warn('[PDF] QR image render failed:', err.message);
    }
  }

  // --- 1. SHOWROOM LOGO TOP CENTER — when logo exists: only logo (no name/address); bigger size ---
  const showroomName = (s && s.name) ? s.name : '';
  const showroomAddress = (s && s.address) ? s.address : '';
  const showroomPhone = (s && s.phone) ? s.phone : '';
  const hasShowroom = !!(s && (s.name || s._id));
  const logoImage = logoImageOption ?? null;

  if (logoImage && hasShowroom) {
    const logoWidth = 180;
    const logoHeight = 80;
    const logoX = centerX - logoWidth / 2;
    try {
      doc.image(logoImage, logoX, y, { width: logoWidth, height: logoHeight, fit: [logoWidth, logoHeight] });
    } catch (_) { }
    y += logoHeight + 0; // Removed gap completely
  } else if (hasShowroom) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(showroomName || 'Showroom', left, y, { width: fullWidth, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted).text(oneLine(showroomAddress, 70), left, y + 18, { width: fullWidth, align: 'center' });
    doc.fontSize(8).text(showroomPhone ? `Tel: ${showroomPhone}` : '', left, y + 30, { width: fullWidth, align: 'center' });
    y += 50;
  } else {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(showroomName || 'Showroom', left, y, { width: fullWidth, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted).text(oneLine(showroomAddress, 70), left, y + 18, { width: fullWidth, align: 'center' });
    y += 50;
  }

  // Receipt No & Date removed per user request

  const isCarMarkaz = showroomName.toLowerCase().replace(/\s/g, '').includes('carmarkaz');

  if (isCarMarkaz) {
    // Red full-width strip with white text
    y = Math.max(y, 80);
    doc.save();
    doc.rect(0, y, pageWidth, 20).fill(COLORS.danger);
    doc.restore();
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
      .text(transaction.documentTitle || 'VEHICLE DELIVERY ORDER', 0, y + 5, { align: 'center', width: pageWidth });
    doc.fillColor('black');
    y += 30;
  } else {
    // --- 2. TITLE TEXT (above blue banner) ---
    y = Math.max(y, 80);
    doc.fillColor('black').fontSize(11).font('Helvetica-Bold')
      .text(transaction.documentTitle || 'VEHICLE DELIVERY ORDER', left, y, { align: 'center', width: fullWidth });
    y += 22;

    // --- 3. BLUE ASSOCIATION BANNER (Current style for other showrooms) ---
    doc.rect(left, y, fullWidth, 20).fill(COLORS.primary);
    doc.fillColor('white').fontSize(9.5).font('Helvetica-Bold')
      .text('The Automotive Traders and Importers Association Karachi', left, y + 5, { align: 'center', width: fullWidth });
    y += 25;
  }

  // --- 3. VEHICLE DATA SECTION (WITH UNDERLINES) ---
  doc.fillColor('black').fontSize(8.5);

  const drawField = (label, value, x, currY, width, labelWidth, options = {}) => {
    const { underline = false, boldLabel = true, valueBold = false } = options;
    const str = value instanceof Date ? fmt(value) : (value != null && value !== '' ? String(value) : '');
    const valueX = x + labelWidth + 5; // Add 5px padding between label and value
    const vWidth = width - labelWidth - 5;

    doc.fillColor(COLORS.text);
    if (boldLabel) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.text(label, x, currY, { width: labelWidth });
    const labelHeight = doc.heightOfString(label, { width: labelWidth });

    if (valueBold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.text(str, valueX, currY, { width: vWidth });
    const valueHeight = doc.heightOfString(str, { width: vWidth });

    const maxHeight = Math.max(labelHeight, valueHeight);

    if (underline) {
      const lineY = currY + maxHeight + 1;
      doc.lineWidth(0.5).strokeColor(COLORS.border).moveTo(valueX, lineY).lineTo(x + width, lineY).stroke();
      doc.lineWidth(1);
    }

    return maxHeight;
  };

  // --- 3. VEHICLE DATA SECTION ---
  y += drawSectionHeader(doc, 'Vehicle Information', left, y, fullWidth);
  y += 10; // Increased gap after header for better readability

  const isPurchase = (transaction.documentTitle || '').toUpperCase().includes('PURCHASE');
  const dateLabel = isPurchase ? 'Date of Purchasing:' : 'Date of Delivery:';
  const timeLabel = isPurchase ? 'Time of Purchasing:' : 'Time of Delivery:';

  const labelW = 120; // Standard label width for vehicle section

  const hV1 = drawField(dateLabel, txDate, left, y, 250, labelW);
  const hV2 = drawField(timeLabel, transaction.deliveryTime || '', left + 265, y, 250, labelW);
  y += Math.max(hV1, hV2) + 5;

  const hV3 = drawField('Chassis No:', v.chassisNo, left, y, 250, labelW);
  const hV4 = drawField('Engine No:', v.engineNo, left + 265, y, 250, labelW);
  y += Math.max(hV3, hV4) + 5;

  const hV5 = drawField('Registration No:', v.registrationNo, left, y, 250, labelW);
  const hV6 = drawField('Year of Registration:', regDate, left + 265, y, 250, labelW);
  y += Math.max(hV5, hV6) + 5;

  const hV7 = drawField('Make:', v.make, left, y, 165, 45);
  const hV8 = drawField('Model:', v.model, left + 175, y, 165, 45);
  const hV9 = drawField('Color:', v.color, left + 350, y, 165, 45);
  y += Math.max(hV7, hV8, hV9) + 4;

  const hV10 = drawField('Year of Manufacturing:', v.yearOfManufacturing || '', left, y, 260, 120, { valueBold: true });
  const hV11 = drawField('Engine Capacity:', v.hp, left + 275, y, 230, 100);
  y += Math.max(hV10, hV11) + 8;

  // --- 3a. OWNER DETAILS (Newly added for visibility in Vehicle section) ---
  const ownerName = transaction.ownerName || s.name || s.ownerName;
  const ownerCnicVal = transaction.ownerCnic || s.cnic || s.nic;
  const ownerAddressVal = transaction.ownerAddress || s.address;
  const ownerPhoneVal = transaction.ownerTelephone || s.phone;

  // Row 1: Name + CNIC
  const hCombined = drawField('Owner Name:', `${ownerName}${transaction.ownerFatherName ? ` S/O ${transaction.ownerFatherName}` : ''}`, left, y, 250, labelW, { underline: true });
  const hO3 = drawField('Owner CNIC:', formatCnic(ownerCnicVal), left + 265, y, 250, 80, { underline: true });
  y += Math.max(hCombined, hO3) + 4;

  // Row 2: Address + Phone
  const hO5 = drawField('Owner Address:', ownerAddressVal, left, y, 250, labelW, { underline: true });
  const hO4 = drawField('Owner Phone:', ownerPhoneVal, left + 265, y, 250, 80, { underline: true });
  y += Math.max(hO5, hO4) + 4;

  const docDetailsStr = (transaction.documentDetails || []).join(', ');
  if (docDetailsStr) {
    const hDocs = drawField('Document Detail:', docDetailsStr, left, y, fullWidth, 120, { underline: true });
    y += hDocs + 8;
  } else {
    y += 3;
  }

  // --- 3b. CPLC DETAILS ---
  if (transaction.cplcVerification && transaction.cplcVerification.trim() !== '') {
    y += drawSectionHeader(doc, 'CPLC Details', left, y, fullWidth);
    y += 3; // Reduced gap after CPLC header
    doc.fontSize(8.5).font('Helvetica');
    const hC1 = drawField('CPLC Counter No:', transaction.cplcVerification, left, y, 200, labelW);
    const hC2 = drawField('CPLC Date:', transaction.cplcDate ? fmt(transaction.cplcDate) : '', left + 215, y, 160, 70);
    const hC3 = drawField('Time:', transaction.cplcTime, left + 395, y, 120, 40);
    y += Math.max(hC1, hC2, hC3) + 5; // Reduced gap after CPLC
  }

  // --- 4. FOR CAR DEALERS ---
  if (transaction.forCarDealers !== false) {
    y = checkPageBreak(doc, y, 250); // Dealer section is tall, check for break
    y += drawSectionHeader(doc, 'For Car Dealers', left, y, fullWidth);
    y += 5; // Reduced gap after header

    const ownerName = transaction.ownerName || s.name || s.ownerName;
    const ownerCnicVal = transaction.ownerCnic || s.cnic || s.nic;
    const ownerAddressVal = transaction.ownerAddress || s.address;
    const rightColX = left + 265;
    const dealerColWidth = (fullWidth - 15) / 2;
    const drawDealerRow = (label, val, x, cY, opts = {}) => {
      return drawField(label, val, x, cY, dealerColWidth, 105, opts);
    };

    // Row 2: Name (left) | Name (right)
    const hR2L = drawDealerRow('Name:', transaction.salesmanName || createdBy.name, left, y, { underline: true });
    const hR2R = drawDealerRow('Name:', transaction.purchaserSalesmanName || '', rightColX, y, { underline: true });
    y += Math.max(hR2L, hR2R) + 4;
    // Row 3: Address (left) | Address (right)
    const hR3L = drawDealerRow('Address:', ownerAddressVal, left, y, { underline: true });
    const hR3R = drawDealerRow('Address:', transaction.purchaserAddress || '', rightColX, y, { underline: true });
    y += Math.max(hR3L, hR3R) + 4;
    // Row 5: Phone (left) | Phone (right)
    const hR4L = drawDealerRow('Phone:', transaction.ownerTelephone || s.phone, left, y, { underline: true });
    const hR4R = drawDealerRow('Phone:', transaction.purchaserPhone || '', rightColX, y, { underline: true });
    y += Math.max(hR4L, hR4R) + 4;
    // Row 6: CNIC (left) | CNIC (right)
    const hR5L = drawDealerRow('CNIC:', formatCnic(ownerCnicVal), left, y, { underline: true });
    const hR5R = drawDealerRow('CNIC:', formatCnic(transaction.purchaserCnic), rightColX, y, { underline: true });
    y += Math.max(hR5L, hR5R) + 4;
    // Row 6.5: Father Name (left and right)
    if (transaction.ownerFatherName || transaction.purchaserFatherName) {
      const hR6L = transaction.ownerFatherName ? drawDealerRow('S/O:', transaction.ownerFatherName, left, y, { underline: true }) : 0;
      const hR6R = transaction.purchaserFatherName ? drawDealerRow('S/O:', transaction.purchaserFatherName, rightColX, y, { underline: true }) : 0;
      y += Math.max(hR6L, hR6R) + 4;
    }
    // Row 7: Nadra Bio Date (only if values exist)
    if (transaction.sellerBiometricDate || transaction.purchaserBiometricDate) {
      const hB1 = drawDealerRow('Nadra Bio Date:', transaction.sellerBiometricDate ? fmt(transaction.sellerBiometricDate) : '_________________', left, y, { underline: true });
      const hB2 = drawDealerRow('Nadra Bio Date:', transaction.purchaserBiometricDate ? fmt(transaction.purchaserBiometricDate) : '_________________', rightColX, y, { underline: true });
      y += Math.max(hB1, hB2) + 4;
    }
    // Row 8: Sign
    const hS1 = drawDealerRow('Sellers Sign:', '', left, y, { underline: true });
    const hS2 = drawDealerRow('Sign:', '', rightColX, y, { underline: true });
    y += Math.max(hS1, hS2);
  }












  // --- 6. SIGNATURES SECTION (standard view only) ---
  if (!transaction.forCarDealers) {
    y = checkPageBreak(doc, y, 200);
    y += drawSectionHeader(doc, 'Signatures & Verification', left, y, fullWidth);
    y += 40; // Increased spacing for signature lines

    const sellerLabel = "Seller's Sign";
    const purchaserLabel = "Purchaser's Sign";
    const signLine = '_____________________';
    const labelToLineGap = 8;

    doc.fontSize(10).font('Helvetica-Oblique').fillColor(COLORS.text);
    const sellerLabelW = doc.widthOfString(sellerLabel);
    const purchaserLabelW = doc.widthOfString(purchaserLabel);

    doc.text(sellerLabel, left, y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textMuted).text(signLine, left + sellerLabelW + labelToLineGap + 5, y + 1);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.text).text(purchaserLabel, left + 285, y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textMuted).text(signLine, left + 285 + purchaserLabelW + labelToLineGap + 5, y + 1);
    y += 18; // Increased from 10 to prevent sticking

    const drawSignInfo = (x, currY, data, mode) => {
      let currentY = currY;
      doc.fontSize(10); // Standard label size for signatures
      const lW = 85;
      const blockWidth = 265;
      // Prioritize manually entered name (data.name) over salesman/agent name (data.salesman)
      // unless it's strictly a showroom-only signature where no name was entered.
      const combinedName = (mode === 'showroom' && !data.name) ? data.salesman : (data.name || data.salesman);
      const hN = drawField('Name:', `${combinedName}${data.fatherName ? ` S/O ${data.fatherName}` : ''}`, x, currentY, blockWidth, lW);
      currentY += hN + 5;
      const hA = drawField('Address:', data.address, x, currentY, blockWidth, lW);
      currentY += hA + 5;
      const hT = drawField('Tel:', data.tel, x, currentY, blockWidth, lW);
      currentY += hT + 5;
      const hC = drawField('CNIC:', formatCnic(data.nic), x, currentY, blockWidth, lW);
      currentY += hC + 5;
      if (data.nadraDate) {
        const hN = drawField('Nadra Bio Date:', data.nadraDate, x, currentY, blockWidth, lW);
        currentY += hN + 5;
      }
      return currentY - currY;
    };

    const isPurchase = transaction.documentTitle === 'VEHICLE PURCHASE ORDER';

    const hSeller = drawSignInfo(left, y, {
      salesman: transaction.salesmanName || createdBy.name,
      name: transaction.sellerName || transaction.ownerName || s.ownerName || s.name,
      fatherName: transaction.sellerFatherName || transaction.ownerFatherName || '',
      address: transaction.sellerAddress || transaction.ownerAddress || s.address,
      tel: transaction.sellerPhone || transaction.ownerTelephone || s.phone,
      nic: transaction.sellerCnic || transaction.ownerCnic || s.nic || s.cnic,
      nadraDate: transaction.sellerBiometricDate
    }, isPurchase ? 'person' : 'showroom');

    const hPurchaser = drawSignInfo(left + 285, y, {
      salesman: transaction.purchaserSalesmanName || '',
      name: transaction.purchaserName,
      fatherName: transaction.purchaserFatherName || '',
      address: transaction.purchaserAddress,
      tel: transaction.purchaserPhone,
      nic: transaction.purchaserCnic,
      nadraDate: transaction.purchaserBiometricDate
    }, isPurchase ? 'showroom' : 'person');

    y += Math.max(hSeller, hPurchaser);
  }

  // --- 7. TRANSACTION DETAILS (table, before Remarks) ---
  y = checkPageBreak(doc, y, 150);
  y += drawSectionHeader(doc, 'Transaction Details', left, y, fullWidth);
  y += 5;

  const paymentMethods = transaction.paymentMethods || [];
  const col1Width = 220; // Description
  const col2Width = 140; // Amount
  const col3Width = fullWidth - col1Width - col2Width; // Details (bank/cheque)
  const rowHeight = 22;
  const tableLeft = left;
  const amountLeft = tableLeft + col1Width;
  const detailsLeft = amountLeft + col2Width;

  // Header row
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLORS.text);
  doc.rect(tableLeft, y, col1Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.rect(amountLeft, y, col2Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.rect(detailsLeft, y, col3Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.text('Description', tableLeft + 6, y + 6, { width: col1Width - 10 });
  doc.text('Amount', amountLeft + 6, y + 6, { width: col2Width - 10 });
  doc.text('Details', detailsLeft + 6, y + 6, { width: col3Width - 10 });
  y += rowHeight;


  doc.fontSize(8.5);

  // Payment breakdown rows
  if (paymentMethods.length > 0) {
    paymentMethods.forEach((p) => {
      const m = (p.method || '').toLowerCase();
      const amt = p.amount ? Number(p.amount) : 0;
      const amtStr = `PKR ${amt.toLocaleString()}`;
      const pDate = p.date ? fmt(p.date) : '';
      let desc = '';
      let details = '';
      if (m === 'cash') {
        desc = 'Cash';
      } else if (m === 'online_banking' || m === 'bank') {
        desc = 'Online Banking';
        details = p.bankDetails ? String(p.bankDetails) : '';
      } else if (m === 'token') {
        desc = 'Token';
        details = p.bankDetails ? String(p.bankDetails) : '';
      } else if (m === 'cheque') {
        desc = 'Cheque';
        const chequeParts = [];
        if (p.chequeNo) chequeParts.push(`No: ${p.chequeNo}`);
        if (p.bankName) chequeParts.push(`Bank: ${p.bankName}`);
        if (p.accountTitle) chequeParts.push(`Title: ${p.accountTitle}`);
        details = chequeParts.join(', ');
      } else {
        desc = p.method ? String(p.method) : '—';
      }
      doc.rect(tableLeft, y, col1Width, rowHeight).strokeColor(COLORS.border).stroke();
      doc.rect(amountLeft, y, col2Width, rowHeight).strokeColor(COLORS.border).stroke();
      doc.rect(detailsLeft, y, col3Width, rowHeight).strokeColor(COLORS.border).stroke();
      doc.text(desc + (pDate ? ` (${pDate})` : ''), tableLeft + 6, y + 6, { width: col1Width - 10 });
      doc.text(amtStr, amountLeft + 6, y + 6, { width: col2Width - 10 });
      doc.text(details, detailsLeft + 6, y + 6, { width: col3Width - 10 });
      y += rowHeight;
    });
  } else {
    doc.rect(tableLeft, y, col1Width, rowHeight).stroke();
    doc.rect(amountLeft, y, col2Width, rowHeight).stroke();
    doc.rect(detailsLeft, y, col3Width, rowHeight).stroke();
    doc.text('Payment', tableLeft + 6, y + 6, { width: col1Width - 10 });
    doc.text('—', amountLeft + 6, y + 6, { width: col2Width - 10 });
    y += rowHeight;
  }
  // Total Amount row
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLORS.text);
  doc.rect(tableLeft, y, col1Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.rect(amountLeft, y, col2Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.rect(detailsLeft, y, col3Width, rowHeight).strokeColor(COLORS.border).stroke();
  doc.text('Total Amount', tableLeft + 6, y + 6, { width: col1Width - 10 });
  doc.text(`PKR ${(transaction.amount || 0).toLocaleString()}`, amountLeft + 6, y + 6, { width: col2Width - 10 });
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(COLORS.text);
  doc.text(`${numberToWords(transaction.amount)}`, detailsLeft + 6, y + 6, { width: col3Width - 10 });
  y += rowHeight;

  // No extra gap before Agent Details

  // --- 7a. FOR OFFICE USE ONLY ---
  y = checkPageBreak(doc, y, 100);
  y += 3; // Reduced from 5
  y += drawSectionHeader(doc, 'FOR OFFICE USE ONLY', left, y, fullWidth);
  y += 3;

  const agentDetailsY = y;
  const agentLabelW = 85;
  const agentColWidth = 265;

  // Left side: Details
  const hAN = drawField('Agent Name:', transaction.agentName || createdBy.name, left, y, agentColWidth, agentLabelW);
  y += hAN + 4;
  const hAA = drawField('Address:', transaction.agentAddress || createdBy.address || '', left, y, agentColWidth, agentLabelW);
  y += hAA + 4;
  const hAC = drawField('CNIC:', formatCnic(transaction.agentCnic || createdBy.cnic || ''), left, y, agentColWidth, agentLabelW);
  y += hAC + 4;
  const hAP = drawField('Phone:', transaction.agentPhone || createdBy.phone || '', left, y, agentColWidth, agentLabelW);
  y += hAP + 4;

  const agentDetailsHeight = y - agentDetailsY;

  // Right side: Signature / Thumb Impression Box
  const boxWidth = 140;
  const boxHeight = 65; // Height to fit thumb + sign
  const boxX = left + fullWidth - boxWidth;
  const boxY = agentDetailsY;

  doc.rect(boxX, boxY, boxWidth, boxHeight).strokeColor(COLORS.border).stroke();
  doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.textMuted);
  doc.text('Signature / Thumb Impression', boxX, boxY + boxHeight + 2, { width: boxWidth, align: 'center' });

  y = Math.max(y, boxY + boxHeight + 5); // Reduced from 15

  // --- 7b. UNDERTAKING ---
  const isDO = (transaction.documentTitle || '').toUpperCase().includes('DELIVERY');
  const isPO = (transaction.documentTitle || '').toUpperCase().includes('PURCHASE');

  if (isDO || isPO) {
    y = checkPageBreak(doc, y, 120);
    y += 3; // Reduced from 5
    y += drawSectionHeader(doc, 'Undertaking', left, y, fullWidth);
    y += 3;

    let undertakingText = '';
    let signLabel = '';

    if (isDO) {
      undertakingText = `I confirm that I have made the full payment for this vehicle and have received all the complete original documents, including the original registration book, original file, and transfer deed. I am satisfied with the vehicle and the documents at the time of purchase.
From today onward, I will be responsible for all matters related to the vehicle, including its use, transfer, taxes, challans, accidents, or any legal issues. I agree to transfer the vehicle into my name within 15 days. After this period, the showroom will not be responsible for any matters related to the vehicle.
If any issue arises regarding past documentation or prior ownership (such as record defects or theft claims), it will be handled directly with the seller and not the showroom. I am signing this undertaking willingly and in full understanding as confirmation of the above. Therefore, I have written this receipt while in full possession of my senses and in the presence of witnesses, so that it may serve as evidence.`;
      signLabel = 'Purchaser’s Signature: __________';
    } else {
      undertakingText = `I confirm that I have sold my vehicle to the showroom after receiving the agreed payment and handing over all original documents, including the original registration book, original file, transfer deed, and any related papers. I confirm that all documents provided are genuine and complete to the best of my knowledge.

I declare that I am fully responsible for any past matters related to this vehicle, including but not limited to previous legal issues, accidents, theft claims, unpaid taxes or challans, lost documents, ownership disputes, or any undisclosed defects before the date of sale. If any such issue arises in the future relating to the period before today, I will be solely responsible, and the showroom will bear no liability.

From today onward, the showroom will have full rights over the vehicle as purchaser, including possession, resale, and transfer. I am signing this undertaking willingly and in full understanding as confirmation of the above. Therefore, I have written this receipt while in full possession of my senses and in the presence of witnesses, so that it may serve as evidence.`;
      signLabel = 'Seller’s Signature: __________';
    }

    doc.font('Helvetica').fontSize(8).lineGap(0).fillColor(COLORS.text);
    doc.text(undertakingText, left + 5, y, { width: fullWidth - 10, align: 'justify' });
    y += doc.heightOfString(undertakingText, { width: fullWidth - 10, align: 'justify' }) + 8;

    doc.font('Helvetica-Bold').fontSize(9).text(signLabel, left + 5, y);
    y += 5;
  }

  // --- 8. REMARKS ---
  y = checkPageBreak(doc, y, 90);
  y += 3; // Reduced from 5
  y += drawSectionHeader(doc, 'Remarks', left, y, fullWidth);
  y += 3;
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.text).text(transaction.remarks || 'No additional remarks.', left + 5, y, { width: fullWidth - 10 });
  y += 40;
  doc.fillColor('black');

  // Footer: always at bottom of page (address, website, social row, bottom rule)
  const pageMargin = 20;
  const footerHeight = 48; // 3 lines + social row (possibly 2 lines in center) + rule
  const footerY = pageHeight - pageMargin - footerHeight;

  if (isCarMarkaz) {
    // Custom footer for Car Markaz - with icons
    const stripY = pageHeight - 60;
    const infoY = stripY + 26;

    // Draw red full-width strip
    doc.save();
    doc.rect(0, stripY, pageWidth, 20).fill(COLORS.danger);
    doc.restore();

    // Draw address and phone below strip with icons - address left, phone right
    const addr = oneLine(showroomAddress || s?.address || '', 100);
    const owner = (s?.ownerName || '').trim().toUpperCase();
    const phone = oneLine(showroomPhone || s?.phone || '', 25);

    const addressIcon = socialIconsOption?.address;
    const phoneIcon = socialIconsOption?.phone;
    const iconSize = 12;
    const iconGap = 6;
    const sideMargin = 40; // Margin from page edges

    doc.font('Helvetica-Bold').fontSize(10).fillColor('black'); // Increased from 8 to 10

    // Phone section - RIGHT ALIGNED
    const phoneText = `${owner}${owner ? ' : ' : ''}${phone}`;
    const phoneTextWidth = doc.widthOfString(phoneText);
    const phoneIconWidth = phoneIcon ? iconSize + iconGap : 0;
    const totalPhoneWidth = phoneIconWidth + phoneTextWidth;
    let rightX = pageWidth - sideMargin - totalPhoneWidth;

    // Draw phone first
    let currentRightX = rightX;
    if (phoneIcon) {
      try {
        doc.image(phoneIcon, currentRightX, infoY - 2, { width: iconSize, height: iconSize });
        currentRightX += iconSize + iconGap;
      } catch (_) { }
    }
    doc.text(phoneText, currentRightX, infoY, { lineBreak: false });

    // Address section - LEFT ALIGNED (with width limit to avoid overlap)
    let leftX = sideMargin;
    if (addressIcon) {
      try {
        doc.image(addressIcon, leftX, infoY - 2, { width: iconSize, height: iconSize });
        leftX += iconSize + iconGap;
      } catch (_) { }
    }
    const maxAddrWidth = rightX - leftX - 15; // 15px safe gap
    doc.text(addr, leftX, infoY, { width: maxAddrWidth, lineBreak: false, ellipsis: '…' });
  } else {
    // Original footer style (Blue/Social Icon row)
    const social = s?.socialLinks || {};
    const socialIcons = socialIconsOption || { facebook: null, instagram: null, whatsapp: null };
    const fullAddress = (showroomAddress || s?.address || '').trim().toUpperCase() || '—';
    const website = (social.website || '').replace(/^https?:\/\//i, '').trim().toUpperCase() || '—';
    const fbText = social.facebook ? String(social.facebook).replace(/^https?:\/\//i, '').trim().toUpperCase() : '—';
    const igText = social.instagram ? String(social.instagram).replace(/^https?:\/\//i, '').trim().toUpperCase() : '—';
    const waText = (social.whatsapp || showroomPhone || s?.phone || '').trim() || '—';
    const centerLine2 = oneLine(igText, 28);

    const iconSize = 28;
    const iconGap = 8;
    const socialY = footerY + 22;
    const iconYSingle = socialY + 3.5 - iconSize / 2;
    const rightEdge = left + fullWidth;

    doc.fontSize(7).font('Helvetica-Bold').fillColor('black');
    doc.text(oneLine(fullAddress, 95), left, footerY, { width: fullWidth, align: 'center' });
    doc.text(oneLine(website, 50), left, footerY + 10, { width: fullWidth, align: 'center' });

    doc.font('Helvetica').fontSize(7).fillColor('black');
    const drawPart = (part, x, iconY) => {
      let curX = x;
      if (part.icon && part.icon.length) {
        try { doc.image(part.icon, curX, iconY, { width: iconSize, height: iconSize }); }
        catch (_) { }
        curX += iconSize + iconGap;
      }
      doc.text(part.text || '—', curX, socialY);
      return curX + doc.widthOfString(part.text || '—') - x;
    };

    drawPart({ icon: socialIcons.facebook, text: oneLine(fbText, 28) }, left, iconYSingle);

    const centerBlockW = (socialIcons.instagram && socialIcons.instagram.length ? iconSize + iconGap : 0) + doc.widthOfString(centerLine2);
    let centerXStart = centerX - centerBlockW / 2;
    if (socialIcons.instagram && socialIcons.instagram.length) {
      try { doc.image(socialIcons.instagram, centerXStart, iconYSingle, { width: iconSize, height: iconSize }); }
      catch (_) { }
      centerXStart += iconSize + iconGap;
    }
    doc.text(centerLine2, centerXStart, socialY);

    const rightPart = { icon: socialIcons.whatsapp, text: oneLine(waText, 18) };
    const rightW = (rightPart.icon && rightPart.icon.length ? iconSize + iconGap : 0) + doc.widthOfString(rightPart.text || '—');
    drawPart(rightPart, rightEdge - rightW, iconYSingle);
  }
}

export async function generateCustomerReceiptPDF(transaction) {
  const { qrBuffer, logoImage, socialIcons } = await prepareAssets(transaction);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (async () => {
      try {
        await drawReceiptLayout(doc, transaction, qrBuffer, { watermark: 'Customer Copy', logoImage, socialIcons });
        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

export async function generateInternalPDF(transaction) {
  const { qrBuffer, logoImage, socialIcons } = await prepareAssets(transaction);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (async () => {
      try {
        await drawReceiptLayout(doc, transaction, qrBuffer, { watermark: 'Showroom Copy', logoImage, socialIcons });
        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

/** One PDF with two pages: page 1 = Customer Copy, page 2 = Showroom Copy (same content, different watermark). */
export async function generateReceiptTwoPagesPDF(transaction) {
  const { qrBuffer, logoImage, socialIcons } = await prepareAssets(transaction);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (async () => {
      try {
        await drawReceiptLayout(doc, transaction, qrBuffer, { watermark: 'Customer Copy', logoImage, socialIcons });
        doc.addPage({ size: 'A4', margin: 20 });
        await drawReceiptLayout(doc, transaction, qrBuffer, { watermark: 'Showroom Copy', logoImage, socialIcons });
        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

export async function generateReceiptPDF(transaction) {
  return generateReceiptTwoPagesPDF(transaction);
}
