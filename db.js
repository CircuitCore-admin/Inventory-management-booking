// db.js
const { Pool } = require('pg');

// Create a config object
const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
};

// Log the config to the terminal to verify it's correct
console.log('--- DATABASE CONNECTION ---');
console.log('Attempting to connect with the following settings:');
console.log(`Database: ${poolConfig.database}`);
console.log(`User: ${poolConfig.user}`);
console.log(`Host: ${poolConfig.host}`);
console.log(`Port: ${poolConfig.port}`);
console.log('---------------------------');

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Add getClient for transactions
  getClient: () => pool.connect(),
};