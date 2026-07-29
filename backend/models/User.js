import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional alternative login handle. Left absent (never '' or null) on users who don't have
    // one, so the sparse unique index below ignores them instead of treating them as duplicates.
    username: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9._-]{3,30}$/, 'Username must be 3-30 characters: letters, numbers, dot, underscore or hyphen.'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', default: null },
    isActive: { type: Boolean, default: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    cnic: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
