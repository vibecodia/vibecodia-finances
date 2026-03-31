import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conexão com MongoDB estabelecida com sucesso!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Falha na conexão com MongoDB:', err.message);
  } finally {
    process.exit();
  }
}

testConnection();