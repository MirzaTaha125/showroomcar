# 🚀 Quick Start Guide

Get your Showroom Management System up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Git installed

## Step 1: Clone & Install (2 minutes)

```bash
# Navigate to project
cd "d:\MirzaTaha\Showroom Management"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 2: Configure Environment (1 minute)

```bash
# In backend folder
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# IMPORTANT: Change JWT_SECRET to a secure random string!
```

**Minimum required in `.env`:**
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secure_random_string_min_32_chars
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Step 3: Seed Admin User (30 seconds)

```bash
# Still in backend folder
npm run seed
```

**Default Admin Credentials:**
- Email: `admin@showroom.com`
- Password: `admin123`

⚠️ Change these immediately after first login!

## Step 4: Start Servers (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Access Application (30 seconds)

Open your browser and navigate to:
```
http://localhost:3000
```

Login with the admin credentials above.

---

## ✅ Verification Checklist

After starting, verify everything works:

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can login with admin credentials
- [ ] Dashboard loads successfully
- [ ] MongoDB connection successful

---

## 🎯 First Steps After Login

1. **Change Admin Password**
   - Go to Users → Edit admin user
   - Set a strong password

2. **Create Your First Showroom**
   - Go to Showrooms → Add Showroom
   - Fill in details and upload logo

3. **Add a User**
   - Go to Users → Add User
   - Assign to showroom

4. **Add a Vehicle**
   - Go to Vehicles → Add Vehicle
   - Enter vehicle details

5. **Create a Transaction**
   - Go to Car Account → New
   - Select vehicle and fill details
   - Generate PDF receipt

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

### MongoDB Connection Error

- Check MONGODB_URI in .env
- Ensure MongoDB is running
- For Atlas: Check IP whitelist

### Dependencies Installation Failed

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Not Loading

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## 📱 Test the Features

### Test PDF Generation
1. Create a transaction
2. Click "Generate PDF"
3. Verify logo, CNIC boxes, and layout

### Test User Management
1. Create a new user
2. Logout
3. Login with new user
4. Verify showroom restrictions

### Test Vehicle Tracking
1. Add multiple vehicles
2. Create a sale transaction
3. Verify vehicle status changes to "Sold"

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change JWT_SECRET to a secure random string
- [ ] Change admin password
- [ ] Update FRONTEND_URL to production domain
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB backups
- [ ] Review and update CORS settings

---

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [CHANGELOG.md](CHANGELOG.md) for recent updates
- Review [PROFESSIONAL_AUDIT_SUMMARY.md](PROFESSIONAL_AUDIT_SUMMARY.md) for security features

---

## 💡 Pro Tips

1. **Use npm run dev** for development (auto-restart on changes)
2. **Check browser console** for frontend errors
3. **Check terminal** for backend logs
4. **Use Postman** to test API endpoints
5. **Enable request logging** in development (already enabled)

---

## 🎉 You're Ready!

Your Showroom Management System is now running. Start managing your showrooms, vehicles, and transactions with ease!

**Need Help?** Check the troubleshooting section or review the full documentation.

---

**Happy Managing! 🚗💼**
