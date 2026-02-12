import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Showroom from '../models/Showroom.js';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
    return;
  }
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@showroom.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Admin created:', admin.email, '| Password: admin123');
  const showroom = await Showroom.create({
    name: 'Main Showroom',
    address: 'Sample Address',
    phone: '+92 300 1234567',
  });
  console.log('Sample showroom created:', showroom.name);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
