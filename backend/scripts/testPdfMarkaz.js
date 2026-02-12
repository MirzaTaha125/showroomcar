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

    console.log('Finding or creating a mock transaction for Car Markaz...');

    // Create a mock transaction object that looks like it's from Car Markaz
    const mockTx = {
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'MARKAZ-TEST-001',
        amount: 2500000,
        transactionDate: new Date(),
        purchaserName: 'Test Purchaser',
        purchaserAddress: '123 Test St, Karachi',
        purchaserCnic: '42101-1234567-1',
        showroom: {
            name: 'Car Markaz',
            address: 'Shop No 11 & 12, Ground Floor Al-Abbas Plaza 12-I, G-8 Markaz Islamabad',
            phone: '0305 2034888',
            ownerName: 'ALI KABIR'
        },
        carAccount: {
            vehicle: {
                make: 'Toyota',
                model: 'Corolla',
                registrationNo: 'B-1234',
                chassisNo: 'CH123456',
                engineNo: 'EN654321',
                color: 'White',
                hp: '1800'
            }
        },
        toObject: function () { return this; }
    };

    console.log('Testing PDF generation for Car Markaz styling...');
    try {
        const pdf = await generateReceiptTwoPagesPDF(mockTx);
        fs.writeFileSync('test-markaz-v2.pdf', pdf);
        console.log('SUCCESS: Car Markaz PDF generated and saved to test-markaz-v2.pdf');
    } catch (err) {
        console.error('FAILURE: PDF generation failed:', err);
    }

    process.exit(0);
}

test().catch((e) => {
    console.error('Script Error:', e);
    process.exit(1);
});
