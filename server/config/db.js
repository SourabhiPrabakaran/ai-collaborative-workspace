import mongoose from 'mongoose';

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_workspace';
  
  const options = {
    autoIndex: true, // Build indexes
  };

  try {
    const conn = await mongoose.connect(connUri, options);
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
    console.log('[Database] Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Monitor mongoose events
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Mongoose connection error: ${err.message}`);
});

export default connectDB;
