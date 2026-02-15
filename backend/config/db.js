import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://tahaahmed090909_db_user:muab12345@ac-e4l0o6y-shard-00-00.i4ivejj.mongodb.net:27017,ac-e4l0o6y-shard-00-01.i4ivejj.mongodb.net:27017,ac-e4l0o6y-shard-00-02.i4ivejj.mongodb.net:27017/showroom1?ssl=true&replicaSet=atlas-am8fx0-shard-0&authSource=admin&retryWrites=true&w=majority";
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (err.message.includes('querySrv ECONNREFUSED')) {
      console.error('Hint: DNS SRV resolution failed. Ensure your network allows SRV lookups or use a standard connection string.');
    }
    process.exit(1);
  }
};

export default connectDB;
