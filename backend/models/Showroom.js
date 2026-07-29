import mongoose from 'mongoose';

const showroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoPath: { type: String, default: '', trim: true },
    ownerName: { type: String, default: '', trim: true },
    cnic: { type: String, default: '', trim: true },
    nic: { type: String, default: '', trim: true },
    socialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      whatsapp: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Showroom', showroomSchema);
