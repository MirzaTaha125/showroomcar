import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// Colors consistent with the main app but tailored for premium look
const COLORS = {
    primary: '#0051a3',
    text: '#1a1a1a',
    textMuted: '#4b5563',
    surface: '#f3f4f6',
    border: '#e5e7eb',
    danger: '#dc2626',
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
        return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
    };
    return convert(Math.floor(num)).trim() + ' Only';
}

function formatCnic(cnic) {
    if (!cnic) return '';
    const nums = cnic.replace(/\D/g, '');
    if (nums.length === 13) return `${nums.slice(0, 5)}-${nums.slice(5, 12)}-${nums.slice(12)}`;
    return cnic;
}

function oneLine(str, maxLen = 58) {
    if (!str) return '';
    const clean = str.replace(/[\r\n]+/g, ' ').trim();
    return clean.length > maxLen ? clean.substring(0, maxLen) + '...' : clean;
}

function checkPageBreak(doc, y, footerReserved = 90) {
    const bottom = doc.page.height - footerReserved;
    if (y > bottom) {
        doc.addPage();
        return 20;
    }
    return y;
}

function drawSectionHeader(doc, title, x, y, width) {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('black').text(title.toUpperCase(), x, y);
    const h = doc.heightOfString(title.toUpperCase(), { width });
    const lineY = y + h + 2;
    doc.lineWidth(0.8).strokeColor(COLORS.border).moveTo(x, lineY).lineTo(x + width, lineY).stroke();
    return h + 6;
}

function drawWatermark(doc, text = 'Official Copy') {
    doc.save();
    doc.opacity(0.12).fillColor(COLORS.textMuted).fontSize(50).font('Helvetica-Bold');
    doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text(text.toUpperCase(), 0, doc.page.height / 2 - 30, { align: 'center', width: doc.page.width });
    doc.restore();
}

const drawField = (doc, label, value, x, currY, width, lWidth, options = {}) => {
    const { underline = false, boldLabel = true, valueBold = false } = options;
    const str = (value != null && value !== '' ? String(value) : '').toUpperCase();
    const upLabel = label.toUpperCase();
    const valX = x + lWidth + 5;
    const vWidth = width - lWidth - 5;
    doc.fillColor(COLORS.text);
    if (boldLabel) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.fontSize(8.5).text(upLabel, x, currY, { width: lWidth });
    const labelHeight = doc.heightOfString(upLabel, { width: lWidth });
    if (valueBold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.text(str, valX, currY, { width: vWidth });
    const valueHeight = doc.heightOfString(str, { width: vWidth });
    const maxHeight = Math.max(labelHeight, valueHeight);
    if (underline) {
        const lineY = currY + maxHeight + 1;
        doc.lineWidth(0.5).strokeColor(COLORS.border).moveTo(valX, lineY).lineTo(x + width, lineY).stroke();
    }
    return maxHeight;
};

async function loadLogoBuffer(logoPath) {
    if (!logoPath) return null;
    const fullPath = path.join(process.cwd(), 'uploads', 'logos', path.basename(logoPath));
    if (!fs.existsSync(fullPath)) return null;
    const ext = path.extname(fullPath).toLowerCase();
    try {
        if (ext === '.webp') {
            const sharp = (await import('sharp')).default;
            return await sharp(fullPath).png().toBuffer();
        }
        return fs.readFileSync(fullPath);
    } catch (_) { return null; }
}

async function drawTokenReceiptLayout(doc, receipt, options = {}) {
    const { watermark } = options;
    const s = receipt.showroom || {};
    const txDate = new Date(receipt.createdAt).toLocaleDateString('en-GB');

    if (watermark) drawWatermark(doc, watermark);
    doc.opacity(1).fillColor('black');

    let y = 20;
    const left = 40;
    const fullWidth = 515;
    const centerX = left + fullWidth / 2;

    const logoImage = await loadLogoBuffer(s.logoPath);
    if (logoImage) {
        const logoWidth = 180;
        const logoHeight = 80;
        doc.image(logoImage, centerX - logoWidth / 2, y, { width: logoWidth, fit: [logoWidth, logoHeight] });
        y += logoHeight + 10;
    } else {
        doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(s.name || '', left, y, { width: fullWidth, align: 'center' });
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted).text(oneLine(s.address, 70), left, y + 18, { width: fullWidth, align: 'center' });
        y += 50;
    }

    const isCarMarkaz = (s.name || '').toLowerCase().replace(/\s/g, '').includes('carmarkaz');
    if (isCarMarkaz) {
        y = Math.max(y, 80);
        doc.save().rect(0, y, doc.page.width, 20).fill(COLORS.danger).restore();
        doc.fillColor('white').fontSize(11).font('Helvetica-Bold').text('TOKEN RECEIPT', 0, y + 5, { align: 'center', width: doc.page.width });
        y += 30;
    } else {
        y = Math.max(y, 80);
        doc.fillColor('black').fontSize(11).font('Helvetica-Bold').text('TOKEN RECEIPT', left, y, { align: 'center', width: fullWidth });
        y += 22;
        doc.rect(left, y, fullWidth, 20).fill(COLORS.primary);
        doc.fillColor('white').fontSize(9.5).font('Helvetica-Bold').text('The Automotive Traders and Importers Association Karachi', left, y + 5, { align: 'center', width: fullWidth });
        y += 25;
    }

    const labelW = 120;
    drawField(doc, 'Receipt Date:', txDate, left, y, 250, labelW);
    y += 22;

    drawField(doc, 'Token Received:', `PKR ${receipt.amountReceived.toLocaleString()}`, left, y, fullWidth, labelW, { valueBold: true });
    y += 15;
    doc.font('Helvetica-Oblique').fontSize(8).text(`(${numberToWords(receipt.amountReceived).toUpperCase()})`, left + labelW + 5, y);
    y += 20;

    const receivedFrom = receipt.fromMrMrs + (receipt.fatherName ? ` S/O ${receipt.fatherName}` : '');
    drawField(doc, 'Received From:', receivedFrom, left, y, fullWidth, labelW, { underline: true });
    y += 25;

    drawField(doc, 'On Behalf Of Car Chassis no.:', receipt.onBehalfOfSellingCar, left, y, fullWidth, 150, { underline: true });
    y += 22;

    drawField(doc, 'Make:', receipt.make, left, y, 170, 40, { underline: true });
    drawField(doc, 'Model:', receipt.model, left + 180, y, 160, 40, { underline: true });
    drawField(doc, 'Reg #:', receipt.registrationNo, left + 350, y, 165, 40, { underline: true });
    y += 22;

    drawField(doc, 'Year:', receipt.yearOfManufacture, left, y, 170, 40, { underline: true });
    drawField(doc, 'Colour:', receipt.colour, left + 180, y, 160, 40, { underline: true });
    y += 28;

    drawField(doc, 'Total Price:', `PKR ${receipt.totalPrice.toLocaleString()}`, left, y, 250, labelW, { underline: true });
    drawField(doc, 'Remaining Balance:', `PKR ${receipt.remainingBalance.toLocaleString()}`, left + 265, y, 250, 115, { valueBold: true, underline: true });
    y += 28;

    if (receipt.note) {
        const hNote = drawField(doc, 'Note:', receipt.note, left, y, fullWidth, labelW, { underline: true });
        y += hNote + 15;
    }

    y = checkPageBreak(doc, y, 150);
    const colWidth = (fullWidth - 20) / 2;
    const drawPersonBox = (title, name, cnic, mobile, x, currY) => {
        let sY = currY;
        sY += drawSectionHeader(doc, title, x, sY, colWidth);
        sY += 10;
        sY += drawField(doc, 'Name:', name, x, sY, colWidth, 50, { underline: true });
        sY += 8;
        sY += drawField(doc, 'CNIC:', formatCnic(cnic), x, sY, colWidth, 50, { underline: true });
        sY += 8;
        sY += drawField(doc, 'Mobile:', mobile, x, sY, colWidth, 50, { underline: true });
        return sY - currY;
    };

    const hP = drawPersonBox('Purchaser Details', receipt.purchaserName, receipt.purchaserCnic, receipt.purchaserMobile, left, y);
    const hS = drawPersonBox('Seller Details', receipt.sellerName, receipt.sellerCnic, receipt.sellerMobile, left + colWidth + 20, y);
    y += Math.max(hP, hS) + 65;

    y = checkPageBreak(doc, y, 100);
    const signWidth = (fullWidth - 80) / 3;
    const drawSignLine = (label, x, currY) => {
        doc.lineWidth(0.5).strokeColor(COLORS.text).moveTo(x, currY).lineTo(x + signWidth, currY).stroke();
        doc.fontSize(8.5).font('Helvetica-Bold').text(label.toUpperCase(), x, currY + 5, { width: signWidth, align: 'center' });
    };
    drawSignLine('Purchaser Sign', left, y);
    drawSignLine('Seller Sign', left + signWidth + 40, y);
    drawSignLine('Showroom Stamp', left + (signWidth + 40) * 2, y);

    const fY = doc.page.height - 65;
    if (isCarMarkaz) {
        doc.save().rect(0, fY + 5, doc.page.width, 20).fill(COLORS.danger).restore();
        doc.font('Helvetica-Bold').fontSize(9).fillColor('white').text(s.address || '', 0, fY + 11, { align: 'center', width: doc.page.width });
    } else {
        doc.lineWidth(0.5).strokeColor(COLORS.border).moveTo(left, fY).lineTo(left + fullWidth, fY).stroke();
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted).text(s.address || '', left, fY + 10, { align: 'center', width: fullWidth });
    }
}

export async function generateTokenReceiptPDF(receipt) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 20 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        (async () => {
            try {
                await drawTokenReceiptLayout(doc, receipt, { watermark: 'Customer Copy' });
                doc.addPage({ size: 'A4', margin: 20 });
                await drawTokenReceiptLayout(doc, receipt, { watermark: 'Showroom Copy' });
                doc.end();
            } catch (err) { reject(err); }
        })();
    });
}
