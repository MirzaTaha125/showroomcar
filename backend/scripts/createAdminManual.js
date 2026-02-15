import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Using the same connection string logic as the rest of the app for reliability
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://caradmin:adminADE%4012345@api.carmarkaz.com:27017/car_markaz_db?authSource=admin';

async function run() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const email = 'admin@carmarkaz.com';
        const existing = await User.findOne({ email });

        if (existing) {
            console.log('Admin user already exists with email:', email);
            process.exit(0);
        }

        const adminUser = {
            name: 'Admin User',
            email: email,
            password: 'StrongPassword123!', // Mongoose model will hash this via pre-save hook
            role: 'admin',
        };

        const result = await User.create(adminUser);
        console.log('Admin user created with id:', result._id);
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
