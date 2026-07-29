import 'dotenv/config';
import User from '../models/User.js';
import Showroom from '../models/Showroom.js';
import connectDB from '../config/db.js';

async function seed() {
  // Go through connectDB so scripts get the same SRV/DNS handling as the server
  await connectDB();
  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
    return;
  }
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@showroom.com',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Admin created:', admin.email, '| Username:', admin.username, '| Password: admin123');
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
