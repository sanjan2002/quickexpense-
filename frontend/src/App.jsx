import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const API = import.meta.env.VITE_API_URL;

const CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Bills', 'Other'];

const CATEGORY_COLOR = {
  'Food & Dining': '#2F6B4C',
  Transport: '#B8862D',
  Shopping: '#7C6FA6',
  Bills: '#5B7BA6',
  Other: '#A6432B',
};

function categoryColor(name) {
  return CATEGORY_COLOR[name] || '#8B9384';
}

function formatINR(amount) {
  return Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const EMPTY_FORM = { merchant: '', amount: '', date: '', category: 'Food & Dining' };

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API}/api/expenses`);
      setExpenses(res.data);
    } catch {
      setError("Couldn't load expenses. Check that the server is running.");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/expenses`, form);
      setExpenses((prev) => [res.data, ...prev]);
      setForm(EMPTY_FORM);
    } catch {
      setError('Failed to add expense. Check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a receipt image first.');
      return;
    }
    setError('');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      const res = await axios.post(`${API}/api/expenses/receipt`, formData);
      setExpenses((prev) => [res.data, ...prev]);
      setFile(null);
      setTab('manual');
    } catch (err) {
      if (err.response?.status === 422) {
        setError("Couldn't read the receipt clearly. Fill in the missing details below.");
        const partial = err.response.data.partial || {};
        setForm({
          merchant: partial.merchant || '',
          amount: partial.amount || '',
          date: partial.date || '',
          category: 'Food & Dining',
        });
        setTab('manual');
      } else {
        setError('Upload failed. Try a clearer photo of the receipt.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const chartData = useMemo(() => {
    const totals = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const grandTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return expenses
      .filter((e) => e.date?.slice(0, 10) === today)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <p className="masthead-eyebrow">Personal ledger</p>
          <h1>QuickExpense</h1>
        </div>
        <div className="masthead-today">
          <p className="masthead-today-label">Spent today</p>
          <p className="masthead-today-value">₹{formatINR(todayTotal)}</p>
        </div>
      </header>

      {error && <div className="banner-error">{error}</div>}

      <div className="layout">
        <div className="card">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${tab === 'manual' ? 'active' : ''}`}
              onClick={() => setTab('manual')}
            >
              Add manually
            </button>
            <button
              type="button"
              className={`tab ${tab === 'receipt' ? 'active' : ''}`}
              onClick={() => setTab('receipt')}
            >
              Scan receipt
            </button>
          </div>

          {tab === 'manual' ? (
            <form onSubmit={handleManualSubmit}>
              <div className="field">
                <label htmlFor="merchant">Merchant</label>
                <input
                  id="merchant"
                  placeholder="Green Leaf Cafe"
                  value={form.merchant}
                  onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                  required
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="amount">Amount</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button className="btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding…' : 'Add expense'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReceiptUpload} className="receipt-panel">
              <div className="dropzone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <p className="dropzone-hint">Merchant, date, and total are read automatically.</p>
              </div>
              <button className="btn" type="submit" disabled={isUploading}>
                {isUploading ? 'Reading receipt…' : 'Upload and parse'}
              </button>
            </form>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card chart-card">
            <h2>Spend by category</h2>
            {chartData.length > 0 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={categoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${formatINR(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center">
                  <span className="chart-center-value">₹{formatINR(grandTotal)}</span>
                  <span className="chart-center-label">total</span>
                </div>
              </div>
            ) : (
              <p className="chart-empty">Add an expense to see the breakdown.</p>
            )}
            {chartData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8, justifyContent: 'center' }}>
                {chartData.map((entry) => (
                  <span key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    <span className="cat-dot" style={{ background: categoryColor(entry.name) }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>All expenses</h2>
            {expenses.length > 0 ? (
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th className="num">Amount</th>
                    <th>Date</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="merchant">
                        <span className="cat-dot" style={{ background: categoryColor(e.category) }} />
                        {e.merchant}
                      </td>
                      <td className="num">₹{formatINR(e.amount)}</td>
                      <td className="date">{e.date?.slice(0, 10)}</td>
                      <td>
                        <span className={`source-badge ${e.source}`}>{e.source}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ledger-empty">No expenses yet. Add one to get started.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
