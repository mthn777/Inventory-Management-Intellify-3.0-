import React, { useEffect, useState, useMemo } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from './constants';
import { fetchSalesForProduct, subscribeSalesForProduct, aggregateDaily, seedSalesForProduct } from './Services/salesService';
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
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState([]); // [{productId, name, recommendation, forecastAvgNext7,...}]
  const [leadTimeDays, setLeadTimeDays] = useState(7);

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

  // Real-time sales subscription when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    setAnalysis(null);
    setError('');
    // initial fetch (in case historical load needed before snapshot ready)
    fetchSalesForProduct(selectedProduct.id, { days: 60 })
      .then(async rows => {
  if (!rows.length && process.env.REACT_APP_DISABLE_SALES_SEED !== 'true') {
          // attempt seed so user sees output
            try {
              const seedResult = await seedSalesForProduct(selectedProduct, { days: 30 });
              if (seedResult.seeded) {
                const seededRows = await fetchSalesForProduct(selectedProduct.id, { days: 60 });
                setSalesHistory(aggregateDaily(seededRows));
                return;
              }
            } catch (se) {
              console.warn('Seeding failed', se);
            }
        }
        setSalesHistory(aggregateDaily(rows));
      })
      .catch(e => { console.error(e); setError('Failed to load sales data'); });

    const unsub = subscribeSalesForProduct(selectedProduct.id, {
      days: 60,
      onData: rows => setSalesHistory(aggregateDaily(rows)),
      onError: e => { console.error(e); setError('Realtime sales error: ' + (e.message || 'unknown')); }
    });
    return () => unsub();
  }, [selectedProduct]);

  const runAnalysis = async () => {
    if (!selectedProduct || !salesHistory.length) return;
    setRunning(true);
    setError('');
    const normalize = (u) => {
      if (!u) return null;
      const trimmed = u.replace(/\/$/, '');
      return /\/analyze$/i.test(trimmed) ? trimmed : trimmed + '/analyze';
    };
    const endpoints = [
      normalize(process.env.REACT_APP_AI_URL),
      'http://127.0.0.1:8010/analyze',
      'http://127.0.0.1:8000/analyze',
      'http://localhost:8010/analyze',
      'http://localhost:8000/analyze'
    ].filter(Boolean);

    const costPrice = Number(selectedProduct.price || selectedProduct.costPrice || 0);
    let sellingPrice = selectedProduct.sellingPrice !== undefined && selectedProduct.sellingPrice !== ''
      ? Number(selectedProduct.sellingPrice)
      : costPrice; // fallback to costPrice if missing
    if (sellingPrice < costPrice) sellingPrice = costPrice; // avoid validation failure

    const payloadObj = {
      productId: selectedProduct.id,
      productName: selectedProduct.productName || selectedProduct.name || 'Product',
      costPrice,
      sellingPrice,
      salesHistory: salesHistory.map(s => ({ date: s.date, units: s.units })),
      stockLevel: Number(selectedProduct.stockLevel || 0),
      assumedLeadTimeDays: Number(leadTimeDays || 7)
    };
    const payload = JSON.stringify(payloadObj);

    const networkErrors = [];

    const extractError = (data, res) => {
      if (!data) return res.status + ' ' + res.statusText;
      let d = data.detail || data.error || data.message;
      if (Array.isArray(d)) {
        d = d.map(x => x.msg || JSON.stringify(x)).join('; ');
      }
      if (typeof d === 'object') {
        d = JSON.stringify(d);
      }
      if (d && d.toLowerCase().includes('selling price cannot be less')) {
        return 'Selling price < cost price. Adjusted automatically to cost (' + costPrice + '). Save a valid selling price to improve margin.';
      }
      if (d && d.toLowerCase().includes('at least 5 days')) {
        return 'Need ≥5 days of sales history (currently ' + salesHistory.length + '). Record more sales or keep seeding enabled.';
      }
      return d || ('HTTP ' + res.status);
    };

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
        let data = null;
        try { data = await res.json(); } catch (_) { /* ignore */ }
        if (!res.ok) {
          const msg = extractError(data, res);
          setError(msg + ' (endpoint: ' + url + ')');
          setRunning(false);
          return;
        }
        setAnalysis({ ...data, _endpoint: url });
        setRunning(false);
        return;
      } catch (e) {
        networkErrors.push(url + ': ' + (e.message || 'network error'));
      }
    }
    setError('AI service unreachable. Tried endpoints: ' + networkErrors.join(' | '));
    setRunning(false);
  };

  const testConnection = async () => {
    setError('');
    const normalize = (u) => {
      if (!u) return null; const t = u.replace(/\/$/, ''); return /\/analyze$/i.test(t) ? t : t + '/analyze'; };
    const urls = [
      normalize(process.env.REACT_APP_AI_URL),
      'http://127.0.0.1:8010/analyze',
      'http://127.0.0.1:8000/analyze'
    ].filter(Boolean);
    for (const u of urls) {
      try {
        const res = await fetch(u, { method: 'OPTIONS' });
        if (res.ok) { setError('AI reachable at ' + u); return; }
      } catch (e) { /* continue */ }
    }
    setError('AI service not reachable on any known URL.');
  };

  const runAIDemoAll = async () => {
    setError('');
    const patternProducts = products.filter(p => p.patternType);
    if (!patternProducts.length) {
      alert('No AI demo pattern items found. Use Dashboard -> Add AI Demo Items first.');
      return;
    }
    setBulkRunning(true);
    setBulkResults([]);
    const normalize = (u) => {
      if (!u) return null; const t = u.replace(/\/$/, ''); return /\/analyze$/i.test(t) ? t : t + '/analyze'; };
    const endpoints = [
      normalize(process.env.REACT_APP_AI_URL),
      'http://127.0.0.1:8010/analyze',
      'http://127.0.0.1:8000/analyze',
      'http://localhost:8010/analyze',
      'http://localhost:8000/analyze'
    ].filter(Boolean);
    const chosenEndpoint = endpoints[0];
    const results = [];
    for (const p of patternProducts) {
      try {
        const rows = await fetchSalesForProduct(p.id, { days: 90 });
        const daily = aggregateDaily(rows);
        if (daily.length < 5) { results.push({ productId: p.id, name: p.productName || p.name, error: 'Not enough data' }); continue; }
        let sellingPrice = Number(p.sellingPrice || p.price || 0);
        const costPrice = Number(p.price || p.costPrice || sellingPrice);
        if (sellingPrice < costPrice) sellingPrice = costPrice;
        const payload = {
          productId: p.id,
            productName: p.productName || p.name || 'Product',
            costPrice,
            sellingPrice,
            salesHistory: daily.map(d => ({ date: d.date, units: d.units })),
            stockLevel: Number(p.stockLevel || 0),
            assumedLeadTimeDays: leadTimeDays
        };
        const res = await fetch(chosenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        let data = null; try { data = await res.json(); } catch (_) {}
        if (!res.ok) {
          results.push({ productId: p.id, name: payload.productName, error: (data && data.detail) || res.status });
        } else {
          results.push({ productId: p.id, name: payload.productName, pattern: p.patternType, ...data });
        }
      } catch (e) {
        results.push({ productId: p.id, name: p.productName || p.name, error: e.message || 'error' });
      }
    }
    setBulkResults(results);
    setBulkRunning(false);
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
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Lead Time (days)</label>
          <input type="number" min={1} max={60} value={leadTimeDays} onChange={e=>setLeadTimeDays(Number(e.target.value)||7)} className="border rounded px-3 py-2 w-28" />
        </div>
        <button
          onClick={runAnalysis}
          disabled={!selectedProduct || running || !salesHistory.length}
          className={`px-6 h-10 rounded-md text-white text-sm font-medium transition ${running || !selectedProduct ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {running ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
        <button
          onClick={testConnection}
          type="button"
          className="px-4 h-10 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50"
        >Test Connection</button>
        <button
          onClick={runAIDemoAll}
          disabled={bulkRunning}
          type="button"
          className="px-4 h-10 rounded-md text-sm font-medium border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
        >{bulkRunning ? 'Running demo…' : 'Run AI Demo (All Pattern Items)'}</button>
      </div>

      {loading && <div className="text-gray-500">Loading products…</div>}
      {!loading && !products.length && <div className="text-gray-500">No products found. Add inventory items first.</div>}

      {selectedProduct && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Sales Trend</h2>
            {salesHistory.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesHistory.map((row, idx, arr) => {
                  // compute 7-day moving average for trend
                  const windowStart = Math.max(0, idx - 6);
                  const slice = arr.slice(windowStart, idx + 1);
                  const avg = slice.reduce((a,b)=>a+Number(b.units||0),0) / slice.length;
                  return { ...row, ma7: Number(avg.toFixed(2)) };
                })}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="units" stroke="#059669" strokeWidth={2} name="Units" />
                  <Line type="monotone" dataKey="ma7" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" name="7d MA" />
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
                  data={( () => {
                    const stock = Number(selectedProduct.stockLevel || 0);
                    const sold = salesHistory.reduce((a,b)=> a + Number(b.units||0), 0);
                    // Remaining is current stock (we don't know original capacity reliably), so visualize sold vs remaining.
                    const remaining = Math.max(0, stock);
                    // If all zero show placeholder slice so chart renders.
                    if (sold === 0 && remaining === 0) {
                      return [{ name: 'No Data', value: 1, placeholder: true }];
                    }
                    return [
                      { name: 'Sold', value: sold },
                      { name: 'Remaining Stock', value: remaining }
                    ];
                  })()}
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
            {Number(selectedProduct.stockLevel||0) === 0 && salesHistory.reduce((a,b)=> a + Number(b.units||0),0) === 0 && (
              <p className="text-xs text-gray-500 mt-2">No stock or sales data yet – record a sale to populate.</p>
            )}
          </div>

          {analysis && (
            <div className="bg-white shadow rounded-lg p-4 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">AI Forecast & Recommendation</h2>
              <div className="grid lg:grid-cols-3 sm:grid-cols-2 gap-4 text-sm">
                <div><strong>Model:</strong> {analysis.modelUsed}</div>
                <div><strong>Avg Next 7d:</strong> {analysis.forecastAvgNext7}</div>
                <div><strong>Hist Avg:</strong> {analysis.avgHistoricalDemand}</div>
                <div><strong>Unit Margin:</strong> ₹{analysis.unitMargin}</div>
                <div><strong>Est Profit:</strong> ₹{analysis.estimatedProfit}</div>
                {analysis.analytics && <div><strong>Margin %:</strong> {analysis.analytics.marginPercent}% ({analysis.analytics.marginCategory})</div>}
                {analysis.analytics && <div><strong>Pattern:</strong> {analysis.analytics.pattern}</div>}
                {analysis.analytics && <div><strong>Trend Slope:</strong> {analysis.analytics.trendSlope}</div>}
                {analysis.analytics && <div><strong>Volatility:</strong> {analysis.analytics.volatility}</div>}
                {analysis.analytics && <div><strong>Risk Score:</strong> <span className={`px-2 py-0.5 rounded text-white text-xs ${analysis.analytics.riskScore>=70?'bg-red-600':analysis.analytics.riskScore>=40?'bg-amber-500':'bg-emerald-600'}`}>{analysis.analytics.riskScore}</span></div>}
                {analysis.analytics && <div><strong>Stock:</strong> {analysis.analytics.stockLevel}</div>}
                {analysis.analytics && <div><strong>Days Inv Rem:</strong> {analysis.analytics.daysInventoryRemaining ?? '—'}</div>}
                {analysis.analytics && <div><strong>Safety Stock:</strong> {analysis.analytics.safetyStock}</div>}
                {analysis.analytics && <div><strong>Reorder Point:</strong> {analysis.analytics.reorderPoint ?? '—'}</div>}
                {analysis.analytics && <div><strong>Suggested Order:</strong> {analysis.analytics.suggestedOrderQty ?? '—'}</div>}
                {analysis.analytics && <div><strong>Lead Time:</strong> {analysis.analytics.leadTimeDays}d</div>}
                {analysis._endpoint && <div className="col-span-full text-xs text-gray-500"><strong>Endpoint:</strong> {analysis._endpoint}</div>}
              </div>
              <p className="mt-4 font-medium text-emerald-700">{analysis.recommendation}</p>
              {analysis.analytics && (
                <p className="mt-1 text-xs text-gray-500">Action: <span className="font-semibold">{analysis.analytics.action}</span></p>
              )}
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
      {bulkResults.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">AI Demo Summary (Pattern Items)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Product</th>
                  <th className="px-2 py-1 border">Pattern</th>
                  <th className="px-2 py-1 border">Hist Avg</th>
                  <th className="px-2 py-1 border">Forecast Avg 7d</th>
                  <th className="px-2 py-1 border">Margin (₹)</th>
                  <th className="px-2 py-1 border">Risk</th>
                  <th className="px-2 py-1 border">Action</th>
                  <th className="px-2 py-1 border">Recommendation</th>
                  <th className="px-2 py-1 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {bulkResults.map(r => (
                  <tr key={r.productId} className="odd:bg-white even:bg-gray-50">
                    <td className="px-2 py-1 border whitespace-nowrap" title={r.name}>{r.name}</td>
                    <td className="px-2 py-1 border text-gray-600">{r.pattern || '-'}</td>
                    <td className="px-2 py-1 border">{r.avgHistoricalDemand ?? '—'}</td>
                    <td className="px-2 py-1 border">{r.forecastAvgNext7 ?? '—'}</td>
                    <td className="px-2 py-1 border">{r.unitMargin ?? '—'}</td>
                    <td className="px-2 py-1 border">{r.analytics ? (
                      <span className={`px-2 py-0.5 rounded text-white text-xs ${r.analytics.riskScore>=70?'bg-red-600':r.analytics.riskScore>=40?'bg-amber-500':'bg-emerald-600'}`}>{r.analytics.riskScore}</span>
                    ) : '—'}</td>
                    <td className="px-2 py-1 border">{r.analytics?.action || '—'}</td>
                    <td className="px-2 py-1 border text-xs max-w-[220px]">{r.recommendation || '—'}</td>
                    <td className="px-2 py-1 border">{r.error ? <span className="text-red-600">Error</span> : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">Patterns: growth → rising demand, decline → slowdown, stable → steady, weekend/seasonal/spiky show variability. Risk blends pattern, volatility, margin & stock coverage.</p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
