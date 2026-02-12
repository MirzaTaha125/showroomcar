# 🚗 Showroom Management System

A professional, full-stack car showroom management system with inventory tracking, transaction management, PDF receipt generation, and comprehensive admin controls.

## ✨ Features

### Core Functionality
- **Multi-Showroom Support** - Manage multiple car showrooms from a single platform
- **Inventory Management** - Track vehicles with detailed specifications (chassis, engine, registration, etc.)
- **Transaction Processing** - Complete sale/purchase workflow with receipt generation
- **PDF Receipts** - Professional PDF generation with QR codes for verification
- **User Management** - Role-based access control (Admin, Showroom Staff)
- **Activity Logging** - Comprehensive audit trail of all system activities
- **Real-time Dashboard** - Statistics and insights for business operations

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Input sanitization to prevent NoSQL injection
- Helmet.js security headers
- CORS protection
- Graceful error handling

### PDF Features
- QR code for transaction verification
- Custom showroom logos (supports WebP, PNG, JPEG, GIF)
- Professional layout matching industry standards
- CNIC boxes with one digit per box
- Thumb impression placeholder
- Dual PDF generation (customer copy + internal copy)
- Watermarking support

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication
- **PDFKit** - PDF generation
- **Sharp** - Image processing (WebP conversion)
- **Express Validator** - Input validation
- **Helmet** + **Rate Limiting** - Security

### Frontend
- **React 18** - UI library
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Vite** - Build tool

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB 6+ (local or Atlas)
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Change JWT_SECRET to a secure random string!

# Seed admin user (optional)
npm run seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔐 Default Admin Credentials

After running the seed script:
- **Email:** admin@showroom.com
- **Password:** admin123

⚠️ **IMPORTANT:** Change these credentials immediately in production!

## 📁 Project Structure

```
showroom-management/
├── backend/
│   ├── config/           # Database configuration
│   ├── middleware/       # Auth, security, logging
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic (PDF generation)
│   ├── utils/            # Helper functions
│   ├── uploads/          # File uploads (logos)
│   └── server.js         # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context (Auth)
│   │   ├── pages/        # Page components
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # React entry point
│   └── public/           # Static assets
│
└── README.md
```

## 🚀 Deployment

### Environment Variables

**Backend (.env):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
```

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Deploy the 'dist' folder to your hosting service
```

**Backend:**
```bash
cd backend
npm start
# Or use PM2: pm2 start server.js --name showroom-api
```

### Recommended Hosting
- **Frontend:** Vercel, Netlify, or Cloudflare Pages
- **Backend:** Railway, Render, or DigitalOcean
- **Database:** MongoDB Atlas

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Showrooms
- `GET /api/showrooms` - List all showrooms
- `POST /api/showrooms` - Create showroom (admin only)
- `PUT /api/showrooms/:id` - Update showroom (admin only)
- `DELETE /api/showrooms/:id` - Delete showroom (admin only)

### Vehicles
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Add vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### PDF Generation
- `GET /api/pdf/customer/:id` - Generate customer receipt
- `GET /api/pdf/internal/:id` - Generate internal copy

### Verification
- `GET /api/verify-sale/:id` - Public transaction verification

## 🔒 Security Best Practices

1. **Change default credentials** immediately
2. **Use strong JWT_SECRET** (minimum 32 characters)
3. **Enable HTTPS** in production
4. **Regular backups** of MongoDB database
5. **Keep dependencies updated** (`npm audit`)
6. **Monitor logs** for suspicious activity
7. **Use environment variables** for sensitive data
8. **Enable MongoDB authentication**

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 5000
npx kill-port 5000
```

**MongoDB connection error:**
- Check MONGODB_URI in .env
- Ensure MongoDB is running
- Check network connectivity for Atlas

**PDF generation fails:**
- Ensure uploads/logos directory exists
- Check image file formats (JPEG, PNG, GIF, WebP)
- Verify Sharp is installed correctly

## 📝 License

This project is proprietary software. All rights reserved.

## 👨‍💻 Developer

Developed by Mirza Taha

## 🤝 Support

For issues or questions, please contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** January 2026
