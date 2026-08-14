const cron = require('node-cron');
const { Resend } = require('resend');
const pool = require('./db');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDailySummary() {
  const today = new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `SELECT * FROM expenses WHERE date = $1`, [today]
  );
  const expenses = result.rows;
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: process.env.EMAIL_TO,
    subject: `QuickExpense Daily Summary - ${today}`,
    html: `<p>Total spend today: ₹${total.toFixed(2)}</p>
           <p>Top category: ${topCategory ? topCategory[0] : 'N/A'}</p>`
  });
}

// Runs every day at 8 PM server time
cron.schedule('0 20 * * *', sendDailySummary);

module.exports = { sendDailySummary };