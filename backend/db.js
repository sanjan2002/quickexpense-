const { Pool, types } = require('pg');
require('dotenv').config();

// Postgres DATE columns are parsed into JS Date objects by default, which
// then get shifted by timezone when serialized to JSON (midnight IST
// becomes the previous day in UTC). Returning DATE as a raw string avoids
// that entirely, since we only ever need YYYY-MM-DD.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;