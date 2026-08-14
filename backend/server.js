const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pool = require('./db');
const { parseReceipt } = require('./ocr');
require('dotenv').config();
require('./cron'); // starts the daily email job

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Add manual expense
app.post('/api/expenses', async (req, res) => {
  const { merchant, amount, date, category } = req.body;
  if (!merchant || !amount || !date) {
    return res.status(400).json({ error: 'merchant, amount, and date are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO expenses (merchant, amount, date, category, source)
       VALUES ($1, $2, $3, $4, 'manual') RETURNING *`,
      [merchant, amount, date, category || 'Uncategorized']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

// Upload receipt -> OCR -> save
app.post('/api/expenses/receipt', (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const parsed = await parseReceipt(req.file.buffer);

    if (!parsed.merchant || !parsed.amount || !parsed.date) {
      return res.status(422).json({
        error: 'Could not confidently read all fields from the receipt',
        partial: parsed // let frontend prefill manual form with what we got
      });
    }

    const result = await pool.query(
      `INSERT INTO expenses (merchant, amount, date, category, source)
       VALUES ($1, $2, $3, $4, 'receipt') RETURNING *`,
      [parsed.merchant, parsed.amount, parsed.date, parsed.category || 'Food & Dining']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

// Manual trigger for the daily summary email (useful since free-tier hosts
// can spin down and miss the scheduled cron time)
const { sendDailySummary } = require('./cron');
app.post('/api/trigger-summary', async (req, res) => {
  try {
    await sendDailySummary();
    res.json({ status: 'sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send summary' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));