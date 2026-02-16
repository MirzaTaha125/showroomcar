import mongoose from 'mongoose';

const tokenReceiptSchema = new mongoose.Schema(
    {
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
        amountReceived: { type: Number, required: true },
        fromMrMrs: { type: String, required: true, trim: true },
        fatherName: { type: String, trim: true },
        onBehalfOfSellingCar: { type: String, required: true, trim: true }, // Chassis No
        make: { type: String, required: true, trim: true },
        model: { type: String, required: true, trim: true },
        registrationNo: { type: String, trim: true, default: '-' },
        yearOfManufacture: { type: String, trim: true },
        colour: { type: String, trim: true },
        totalPrice: { type: Number, required: true },
        remainingBalance: { type: Number, required: true },
        note: { type: String, trim: true },

        // Purchaser Details
        purchaserName: { type: String, required: true, trim: true },
        purchaserCnic: { type: String, trim: true },
        purchaserMobile: { type: String, trim: true },

        // Seller Details
        sellerName: { type: String, required: true, trim: true },
        sellerFatherName: { type: String, trim: true },
        sellerCnic: { type: String, trim: true },
        sellerMobile: { type: String, trim: true },
        sellerAddress: { type: String, trim: true },

        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

tokenReceiptSchema.index({ showroom: 1, createdAt: -1 });

export default mongoose.model('TokenReceipt', tokenReceiptSchema);
