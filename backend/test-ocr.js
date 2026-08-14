const fs = require('fs');
const { parseReceipt } = require('./ocr');

fs.readFile('../sample_receipt.png', async (err, buffer) => {
  const result = await parseReceipt(buffer);
  console.log(result);
});