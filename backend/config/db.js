const { MongoClient } = require('mongodb');

let db = null;
let client = null;

async function connectDB() {
  if (db) return db;

  try {
    const uri = process.env.MONGO_URI;

    console.log("Attempting database connection pool instantiation...");
    client = new MongoClient(uri);

    await client.connect();
    db = client.db('travel_app');

    console.log('MongoDB connected successfully via persistent pool!');
    return db;
  } catch (error) {
    console.error('Database connection breakdown:', error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

module.exports = { connectDB, getDB };