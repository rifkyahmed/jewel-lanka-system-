const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let mongoServer;

async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

async function closeTestDB() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

async function createUserAndToken(attrs = {}) {
  const user = await User.create({
    username: attrs.username || `test_${Date.now()}`,
    password: attrs.password || 'test123',
    fullName: attrs.fullName || 'Test User',
    role: attrs.role || 'Admin'
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'haralusso_jewel_secret_key_998877', { expiresIn: '1h' });
  return { user, token };
}

module.exports = { connectTestDB, closeTestDB, clearDB, createUserAndToken };
