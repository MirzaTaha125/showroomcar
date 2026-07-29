import 'dotenv/config';
import mongoose from 'mongoose';

// Register models
import '../models/User.js';
import '../models/Showroom.js';
import '../models/Vehicle.js';
import '../models/CarAccount.js';
import Transaction from '../models/Transaction.js';

import { generateReceiptTwoPagesPDF } from '../services/pdfService.js';
import fs from 'fs';

async function test() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Finding a transaction...');
    const tx = await Transaction.findOne()
        .populate('showroom')
        .populate({ path: 'carAccount', populate: { path: 'vehicle' } });

    if (!tx) {
        console.log('No transactions found in database to test with.');
        process.exit(0);
    }

    // Basic merge logic similar to pdf.js
    const ca = tx.carAccount;
    const merged = {
        ...tx.toObject(),
        ...(ca ? (typeof ca.toObject === 'function' ? ca.toObject() : ca) : {}),
        vehicle: ca?.vehicle || null,
        showroom: tx.showroom,
    };

    console.log('Testing PDF generation for:', merged._id || merged.receiptNumber);
    try {
        const pdf = await generateReceiptTwoPagesPDF(merged);
        fs.writeFileSync('test-receipt-v2.pdf', pdf);
        console.log('SUCCESS: PDF generated and saved to test-receipt-v2.pdf');
    } catch (err) {
        console.error('FAILURE: PDF generation failed:', err);
        process.exit(1);
    }

    process.exit(0);
}

test().catch((e) => {
    console.error('Script Error:', e);
    process.exit(1);
});
