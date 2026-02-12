import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
    registrationNo: { type: String, default: '', trim: true },
    dateOfRegistration: { type: Date, default: null },
    chassisNo: { type: String, required: true, trim: true },
    engineNo: { type: String, required: true, trim: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    hp: { type: String, default: '', trim: true },
    yearOfManufacturing: { type: String, default: '', trim: true },
    registrationBookNoNew: { type: String, default: '', trim: true },
    registrationBookNo: { type: String, default: '', trim: true },
    cardNumber3: { type: String, default: '', trim: true },
    salesCertificate: { type: String, default: '', trim: true },
    salesCertificateBillOfEntryNo: { type: String, default: '', trim: true },
    salesCertificateDate: { type: Date, default: null },
    invoiceNo: { type: String, default: '', trim: true },
    invoiceDate: { type: Date, default: null },
    cplcVerification: { type: String, default: '', trim: true },
    cplcDate: { type: Date, default: null },
    cplcTime: { type: String, default: '', trim: true },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vehicleSchema.index({ showroom: 1, chassisNo: 1 }, { unique: true });
vehicleSchema.index({ showroom: 1, status: 1 });

export default mongoose.model('Vehicle', vehicleSchema);
