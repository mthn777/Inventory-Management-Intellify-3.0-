// Firestore Sales Service
// Each sale document structure suggestion:
// { productId: string, date: 'YYYY-MM-DD', units: number, pricePerUnit: number, createdAt: Timestamp }

import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { COLLECTIONS } from '../constants';

export async function recordSale({ productId, units, pricePerUnit, date }) {
  if (!productId || units == null) throw new Error('productId and units required');
  const saleDateObj = date ? new Date(date) : new Date();
  const saleDate = saleDateObj.toISOString().slice(0,10);
  const numericUnits = Number(units);
  const numericPrice = Number(pricePerUnit) || 0;

  // 1. Add raw sale event
  const saleRef = await addDoc(collection(db, COLLECTIONS.SALES), {
    productId,
    units: numericUnits,
    pricePerUnit: numericPrice,
    date: saleDate,
    createdAt: Timestamp.now()
  });

  // 2. Update daily aggregate doc (id = productId_date) using atomic increment
  try {
    const dailyId = `${productId}_${saleDate}`;
    const dailyRef = doc(db, COLLECTIONS.SALES_DAILY, dailyId);
    await setDoc(dailyRef, {
      productId,
      date: saleDate,
      units: increment(numericUnits),
      lastUnitPrice: numericPrice,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (e) {
    console.warn('Daily aggregate update failed', e);
  }

  // 3. Decrement inventory stock atomically (if inventory doc exists)
  try {
    const invRef = doc(db, COLLECTIONS.INVENTORY, productId);
    await updateDoc(invRef, { stockLevel: increment(-numericUnits), updatedAt: Timestamp.now() });
  } catch (e) {
    console.warn('Inventory stock decrement failed (maybe doc missing?):', e);
  }

  return saleRef;
}

export async function fetchSalesForProduct(productId, { days = 30 } = {}) {
  const q = query(collection(db, COLLECTIONS.SALES), where('productId','==', productId));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  // Filter last N days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  return rows
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a,b) => new Date(a.date) - new Date(b.date));
}

// Real-time subscribe (returns unsubscribe function)
export function subscribeSalesForProduct(productId, { days = 60, onData, onError } = {}) {
  // Avoid orderBy to prevent composite index requirement on first run.
  const q = query(collection(db, COLLECTIONS.SALES), where('productId','==', productId));
  return onSnapshot(q, snap => {
    try {
      const rows = [];
      snap.forEach(d => rows.push(d.data()));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days + 1);
      const filtered = rows.filter(r => {
        const dt = new Date(r.date);
        return !isNaN(dt) && dt >= cutoff;
      }).sort((a,b)=> new Date(a.date) - new Date(b.date));
      onData && onData(filtered);
    } catch (e) {
      onError && onError(e);
    }
  }, err => onError && onError(err));
}

// Utility to aggregate same-day entries into single total
export function aggregateDaily(salesRows) {
  const map = new Map();
  salesRows.forEach(r => {
    const key = r.date;
    const current = map.get(key) || 0;
    map.set(key, current + Number(r.units || 0));
  });
  return Array.from(map.entries())
    .map(([date, units]) => ({ date, units }))
    .sort((a,b)=> new Date(a.date) - new Date(b.date));
}

// Seed demo sales for a product if it has no sales yet to allow analytics visualization
// Generates past `days` days (default 30) excluding future dates. Uses a simple demand curve.
export async function seedSalesForProduct(product, { days = 30, maxUnitsPerDay = 12 } = {}) {
  if (!product || !product.id) throw new Error('Product object with id required');
  // Check existing
  const existing = await fetchSalesForProduct(product.id, { days: 120 });
  if (existing.length) return { seeded: 0, skipped: true };
  const base = Math.max(1, Math.min(8, Math.round((product.stockLevel || 100) / 50))); // simple scaling
  const today = new Date();
  const batchPromises = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Variation with mild weekly seasonality
    const weekday = d.getDay();
    const seasonalBoost = (weekday === 5 || weekday === 6) ? 1.4 : 1; // Fri/Sat boost
    const randomness = 0.6 + Math.random() * 0.8; // 0.6 - 1.4
    const units = Math.max(0, Math.round(base * seasonalBoost * randomness));
    if (units === 0) continue;
    batchPromises.push(recordSale({
      productId: product.id,
      units,
      pricePerUnit: Number(product.sellingPrice || product.price || 0),
      date: d.toISOString().slice(0,10)
    }));
  }
  await Promise.all(batchPromises);
  return { seeded: batchPromises.length, skipped: false };
}

// Fetch all daily aggregates across products within period
export async function fetchDailyAggregates({ days = 30 } = {}) {
  const snap = await getDocs(collection(db, COLLECTIONS.SALES_DAILY));
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  return rows.filter(r => new Date(r.date) >= cutoff);
}

// Fetch all raw sale events (could be heavier) within period
export async function fetchAllSales({ days = 30 } = {}) {
  const snap = await getDocs(collection(db, COLLECTIONS.SALES));
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  return rows.filter(r => new Date(r.date) >= cutoff);
}

// Real-time subscription for all sales across products
export function subscribeAllSales({ days = 30, onData, onError } = {}) {
  const q = collection(db, COLLECTIONS.SALES); // no where filter
  return onSnapshot(q, snap => {
    try {
      const rows = [];
      snap.forEach(d => rows.push(d.data()));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days + 1);
      const filtered = rows.filter(r => new Date(r.date) >= cutoff);
      onData && onData(filtered);
    } catch (e) {
      onError && onError(e);
    }
  }, err => onError && onError(err));
}

export function groupSalesByDateWithRevenue(sales, productsMap) {
  const map = new Map();
  sales.forEach(s => {
    const key = s.date;
    const prod = productsMap.get(s.productId);
    const unitPrice = s.pricePerUnit || (prod ? prod.sellingPrice || prod.price || 0 : 0);
    const existing = map.get(key) || { date: key, revenue: 0, units: 0 };
    existing.revenue += Number(unitPrice) * Number(s.units || 0);
    existing.units += Number(s.units || 0);
    map.set(key, existing);
  });
  return Array.from(map.values()).sort((a,b)=> new Date(a.date)-new Date(b.date));
}

export function rankTopProducts(sales, productsMap, topN=5) {
  const totals = new Map();
  sales.forEach(s => {
    totals.set(s.productId, (totals.get(s.productId)||0) + Number(s.units||0));
  });
  return Array.from(totals.entries())
    .sort((a,b)=> b[1]-a[1])
    .slice(0, topN)
    .map(([productId, units]) => ({ productId, units, name: productsMap.get(productId)?.name || productId }));
}
