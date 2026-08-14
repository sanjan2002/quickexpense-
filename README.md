# QuickExpense

A personal expense tracker with automatic receipt scanning. Add expenses manually or by uploading a photo of a receipt — merchant, date, and total are extracted automatically. View all expenses with a live category breakdown, and get a daily spending summary by email.

**Live app:** [add your Vercel link here]
**Backend API:** [add your Render link here]

## Features

- Add expenses manually, or upload a receipt photo for automatic extraction (merchant, date, total)
- Live-updating expense list and category breakdown — no page reload needed
- Daily email summary of total spend and top category
- Manual and receipt-based entries are stored with identical structure

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Receipt OCR | Tesseract.js |
| Email | Resend |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
quickexpense/
├── backend/          # Express API, OCR parsing, cron job
│   ├── server.js     # API routes
│   ├── db.js         # Postgres connection
│   ├── ocr.js        # Receipt text extraction
│   └── cron.js        # Daily email summary
└── frontend/         # React app (Vite)
    └── src/App.jsx
```

## Running locally

### Prerequisites

- Node.js 18+
- A Supabase (or any Postgres) database
- A Resend account (free tier) for email

### 1. Clone the repo

```bash
git clone https://github.com/sanjan2002/quickexpense.git
cd quickexpense
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `backend/.env` file:

```
DATABASE_URL=postgresql://user:password@host:port/postgres
RESEND_API_KEY=your_resend_api_key
EMAIL_TO=your_email@example.com
PORT=4000
```

Create the database table (run once, in your Postgres/Supabase SQL editor):

```sql
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  merchant TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  category TEXT DEFAULT 'Uncategorized',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);
```

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:4000`.

### 3. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
```

Create a `frontend/.env` file:

```
VITE_API_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

## API endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/expenses` | List all expenses |
| POST | `/api/expenses` | Add an expense manually |
| POST | `/api/expenses/receipt` | Upload a receipt image, auto-extract and save |
| POST | `/api/trigger-summary` | Manually trigger the daily email summary |

## Daily email summary

The backend schedules a daily job (`node-cron`) that emails a summary of that day's spending. Since free-tier hosts can spin down when idle and may miss the scheduled time, the `/api/trigger-summary` endpoint is also exposed so the job can be triggered reliably by an external scheduler (e.g. [cron-job.org](https://cron-job.org)) hitting it once a day.

## Known limitations

- Single-user app — no authentication, `EMAIL_TO` is a fixed address rather than tied to a user account.
- Receipt category is defaulted to "Food & Dining" rather than inferred from item contents.
- OCR accuracy depends on receipt image quality and font; parsing was tuned against the provided sample receipt.
