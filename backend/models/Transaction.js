import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
    carAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'CarAccount', default: null },
    type: { type: String, enum: ['sale', 'purchase'], required: true },
    amount: { type: Number, required: true, min: 0 },
    commission: { type: Number, default: 0, min: 0, max: 100 },
    make: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    chassisNo: { type: String, default: '', trim: true },
    engineNo: { type: String, default: '', trim: true },
    transactionDate: { type: Date, default: Date.now },
    amountReceived: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    receiptNumber: { type: String },
    documentTitle: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pdfCount: { type: Number, default: 0 },
    customerPdfLink: { type: String, trim: true },
    internalPdfLink: { type: String, trim: true },
    pdfGeneratedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

transactionSchema.index({ showroom: 1, transactionDate: -1 });
transactionSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('Transaction', transactionSchema);
