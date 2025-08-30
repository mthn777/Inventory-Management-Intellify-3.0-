import React, { useEffect, useState, useMemo } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from './constants';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#059669', '#F59E0B', '#EF4444'];

function Analytics() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [salesHistory, setSalesHistory] = useState([]); // [{date, units}]
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedId) || null, [products, selectedId]);

  // Fetch inventory (basic) and mock sales (until real sales collection implemented)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setProducts(list);
        if (list.length) setSelectedId(list[0].id);
      } catch (e) {
        console.error(e);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Generate placeholder sales if none (replace with real sales fetch when collection exists)
  useEffect(() => {
    if (!selectedProduct) return;
    // If you later store real daily sales, replace this with Firestore query.
    const days = 14;
    const today = new Date();
    const synthetic = Array.from({ length: days }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        date: d.toISOString().slice(0, 10),
        units: Math.max(0, Math.round((selectedProduct.stockLevel || 50) / 10 + Math.random() * 5))
      };
    });
    setSalesHistory(synthetic);
    setAnalysis(null); // reset when product switches
  }, [selectedProduct]);

  const runAnalysis = async () => {
    if (!selectedProduct || !salesHistory.length) return;
    setRunning(true);
    setError('');
    try {
      const res = await fetch(process.env.REACT_APP_AI_URL || 'http://127.0.0.1:8010/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
            productName: selectedProduct.productName || selectedProduct.name || 'Product',
          costPrice: Number(selectedProduct.price || selectedProduct.costPrice || 0),
          sellingPrice: Number(selectedProduct.sellingPrice || 0),
          salesHistory: salesHistory.map(s => ({ date: s.date, units: s.units }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'AI service error');
      setAnalysis(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Analytics Dashboard</h1>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm">{error}</div>
      )}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Product</label>
          <select
            className="border rounded px-3 py-2 min-w-[240px]"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            disabled={loading}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.productName || p.name || p.id}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runAnalysis}
          disabled={!selectedProduct || running || !salesHistory.length}
          className={`px-6 h-10 rounded-md text-white text-sm font-medium transition ${running || !selectedProduct ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {running ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>

      {loading && <div className="text-gray-500">Loading products…</div>}
      {!loading && !products.length && <div className="text-gray-500">No products found. Add inventory items first.</div>}

      {selectedProduct && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Sales Trend</h2>
            {salesHistory.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesHistory}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="units" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No sales data.</p>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Cost vs Selling Price</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[{ label: selectedProduct.productName || selectedProduct.name || 'Product', cost: Number(selectedProduct.price || 0), selling: Number(selectedProduct.sellingPrice || 0) }] }>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#6B7280" name="Cost" />
                <Bar dataKey="selling" fill="#059669" name="Selling" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Stock Distribution</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Stock Level', value: Number(selectedProduct.stockLevel || 0) },
                    { name: 'Sold (sample)', value: salesHistory.reduce((a, b) => a + b.units, 0) },
                    { name: 'Other', value: Math.max(0,  (Number(selectedProduct.stockLevel || 0) / 5)) }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {analysis && (
            <div className="bg-white shadow rounded-lg p-4 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">AI Forecast & Recommendation</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><strong>Model:</strong> {analysis.modelUsed}</div>
                <div><strong>Avg Next 7 Days:</strong> {analysis.forecastAvgNext7}</div>
                <div><strong>Historical Avg:</strong> {analysis.avgHistoricalDemand}</div>
                <div><strong>Estimated Profit:</strong> ₹{analysis.estimatedProfit}</div>
                <div><strong>Unit Margin:</strong> ₹{analysis.unitMargin}</div>
              </div>
              <p className="mt-4 font-medium text-emerald-700">{analysis.recommendation}</p>
              {analysis.forecastPoints && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">yhat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.forecastPoints.map((p, i) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          <td className="px-2 py-1 border">{p.ds}</td>
                          <td className="px-2 py-1 border">{p.yhat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Analytics;
