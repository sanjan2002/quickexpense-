const Tesseract = require('tesseract.js');

async function parseReceipt(buffer) {
  const { data: { text } } = await Tesseract.recognize(buffer, 'eng');

  // Merchant: usually the first non-empty line, often in caps
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const merchant = lines[0] || null;

  // Date: matches DD-MM-YYYY or DD/MM/YYYY
  const dateMatch = text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
  let date = null;
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split(/[-/]/);
    date = `${y}-${m}-${d}`; // normalize to YYYY-MM-DD
  }

  // Total: look for a line that STARTS with "TOTAL" (word boundary),
  // not "Subtotal" — and take the LAST such match, since "TOTAL" can
  // also appear inside header text like a title.
  const totalLineRegex = /(?<!sub)\bTOTAL\b[^\d\n]*(?:[Rr]s\.?\s*)?([\d,]+\.\d{2})/gi;
  const matches = [...text.matchAll(totalLineRegex)];
  const amount = matches.length
    ? parseFloat(matches[matches.length - 1][1].replace(/,/g, ''))
    : null;

  return {
    merchant,
    date,
    amount,
    category: 'Food & Dining', // heuristic default; refine if you want
    rawText: text
  };
}

module.exports = { parseReceipt };