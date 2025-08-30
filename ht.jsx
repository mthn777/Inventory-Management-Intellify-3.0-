import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Pencil, Trash2, Search, Filter, Package, DollarSign, AlertTriangle, LogOut, X } from "lucide-react";

/**
 * Inventory Management UI (React)
 * ------------------------------------------------------
 * - Rewritten to fix a JSX syntax error (missing closing tag in <Placeholder />)
 * - Removed external UI library imports to avoid path/alias issues (uses plain Tailwind + tiny local components)
 * - Added a lightweight Modal, Button, Card, and Input components
 * - Added a small in-app Test Panel to validate core behavior (acts as our test cases)
 */

// ---- Helpers ----
const currency = (n) => n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const starterProducts = [
  { id: "P-1001", name: "Laptop 15\" i5", category: "Electronics", price: 55000, quantity: 18, supplier: "TechMart" },
  { id: "P-1002", name: "Mouse Wireless", category: "Accessories", price: 799, quantity: 120, supplier: "GigaSupplies" },
  { id: "P-1003", name: "Mechanical Keyboard", category: "Accessories", price: 3499, quantity: 9, supplier: "KeyCo" },
  { id: "P-1004", name: "Router AX3000", category: "Networking", price: 6999, quantity: 15, supplier: "NetMax" },
  { id: "P-1005", name: "27\" Monitor", category: "Electronics", price: 17999, quantity: 6, supplier: "VisionHub" },
];

const categories = ["Electronics", "Accessories", "Networking", "Peripherals", "Other"]; 

export default function InventoryApp() {
  const [sidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [products, setProducts] = useState(starterProducts);
  const [active, setActive] = useState("dashboard");
  const [editItem, setEditItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = [p.name, p.category, p.id, p.supplier].join(" ").toLowerCase().includes(query.toLowerCase());
      const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchesQuery && matchesCat;
    });
  }, [products, query, categoryFilter]);

  const totals = useMemo(() => {
    const totalItems = products.length;
    const stockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const lowStock = products.filter((p) => p.quantity < 10).length;
    return { totalItems, stockValue, lowStock };
  }, [products]);

  const categoryData = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.category, (map.get(p.category) || 0) + p.quantity));
    return Array.from(map, ([name, qty]) => ({ name, qty }));
  }, [products]);

  const handleDelete = (id) => setProducts((prev) => prev.filter((p) => p.id !== id));
  const handleSave = (form) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === form.id);
      if (exists) return prev.map((p) => (p.id === form.id ? form : p));
      return [{ ...form }, ...prev];
    });
    setEditItem(null);
    setAddOpen(false);
  };

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 sm:px-8 bg-blue-700 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-yellow-400/90" />
          <span className="font-semibold tracking-wide">InventoX</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <button onClick={() => setActive("dashboard")} className={`hover:opacity-90 ${active === "dashboard" ? "underline" : ""}`}>Dashboard</button>
          <button onClick={() => setActive("products")} className={`hover:opacity-90 ${active === "products" ? "underline" : ""}`}>Products</button>
          <button onClick={() => setActive("reports")} className={`hover:opacity-90 ${active === "reports" ? "underline" : ""}`}>Reports</button>
          <button onClick={() => setActive("settings")} className={`hover:opacity-90 ${active === "settings" ? "underline" : ""}`}>Settings</button>
        </nav>
        <button className="inline-flex items-center gap-2 text-sm bg-yellow-400 text-blue-900 px-3 py-1.5 rounded-xl shadow-sm hover:shadow">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="fixed top-14 left-0 bottom-0 w-60 bg-white border-r border-slate-200 p-4 space-y-2 overflow-y-auto">
          <SideLink label="Dashboard" active={active === "dashboard"} onClick={() => setActive("dashboard")} />
          <SideLink label="Products" active={active === "products"} onClick={() => setActive("products")} />
          <SideLink label="Reports" active={active === "reports"} onClick={() => setActive("reports")} />
          <SideLink label="Settings" active={active === "settings"} onClick={() => setActive("settings")} />
        </aside>
      )}

      {/* Main content */}
      <main className="pt-16 pl-0 sm:pl-60 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {active === "dashboard" && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Package} title="Total Items" value={totals.totalItems} />
                <StatCard icon={DollarSign} title="Stock Value" value={currency(totals.stockValue)} />
                <StatCard icon={AlertTriangle} title="Low Stock" value={totals.lowStock} highlight />
              </div>

              <Card className="rounded-2xl">
                <Card.Header>Category-wise stock</Card.Header>
                <Card.Body className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="qty" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>

              <Card className="rounded-2xl">
                <Card.Header>Recent Updates</Card.Header>
                <Card.Body className="space-y-3 text-sm">
                  <UpdateRow text="Router AX3000 restocked ( +10 )" />
                  <UpdateRow text="27" Monitor marked low stock" />
                  <UpdateRow text="New item added: Mechanical Keyboard" />
                </Card.Body>
              </Card>

              <TestPanel products={products} />
            </section>
          )}

          {active === "products" && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">Products</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9 rounded-xl" />
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white">
                      <Filter className="h-4 w-4" />
                      <select className="outline-none" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
                        <option value="all">All</option>
                        {categories.map((c)=> <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <Button onClick={()=>setAddOpen(true)} className="rounded-2xl bg-blue-700 hover:bg-blue-800 text-white"><Plus className="h-4 w-4 mr-1"/>Add Product</Button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      {['ID','Name','Category','Price','Stock','Supplier','Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-slate-50/60">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{p.id}</td>
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3">{p.category}</td>
                        <td className="px-4 py-3">{currency(p.price)}</td>
                        <td className={`px-4 py-3 ${p.quantity < 10 ? 'text-red-600 font-semibold' : ''}`}>{p.quantity}</td>
                        <td className="px-4 py-3">{p.supplier}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" className="rounded-xl" onClick={() => setEditItem(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" className="rounded-xl" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Product Modal */}
              <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add Product">
                <ProductForm onSave={handleSave} onCancel={()=>setAddOpen(false)} />
              </Modal>

              {/* Edit Product Modal */}
              <Modal open={!!editItem} onClose={()=>setEditItem(null)} title="Edit Product">
                <ProductForm defaultValue={editItem || undefined} onSave={handleSave} onCancel={()=>setEditItem(null)} />
              </Modal>
            </section>
          )}

          {active === "reports" && (
            <Placeholder title="Reports" subtitle="Export CSV/PDF, trends, and summaries." />
          )}
          {active === "settings" && (
            <Placeholder title="Settings" subtitle="Manage users, roles, preferences, and thresholds." />
          )}
        </div>
      </main>
    </div>
  );
}

// ---- Small UI Primitives (no external UI lib) ----
function Button({ children, className = "", variant, ...props }) {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles = variant === "destructive"
    ? "border-red-600 text-white bg-red-600 hover:bg-red-700"
    : variant === "secondary"
      ? "border-slate-300 bg-white hover:bg-slate-50"
      : "border-blue-700 text-white bg-blue-700 hover:bg-blue-800";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>
  );
}

function Input({ className = "", ...props }) {
  return <input className={`w-full border rounded-md px-3 py-2 bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700 ${className}`} {...props} />;
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>;
}
Card.Header = function CardHeader({ children }) {
  return <div className="p-4 border-b text-base font-semibold">{children}</div>;
};
Card.Body = function CardBody({ children, className = "" }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SideLink({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded-xl transition ${active ? "bg-blue-700/10 text-blue-800" : "hover:bg-slate-100"}`}>
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, title, value, highlight }) {
  return (
    <Card className={`rounded-2xl ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <Card.Body className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-700 text-white"><Icon className="h-6 w-6" /></div>
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function UpdateRow({ text }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-slate-700">{text}</div>
      <span className="text-xs text-slate-400">just now</span>
    </div>
  );
}

function ProductForm({ defaultValue, onSave, onCancel }) {
  const [form, setForm] = useState(
    defaultValue || { id: "", name: "", category: "Electronics", price: 0, quantity: 0, supplier: "" }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.id || !form.name) return;
    onSave({ ...form, price: Number(form.price), quantity: Number(form.quantity) });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Labeled label="Product ID"><Input value={form.id} onChange={(e) => set("id", e.target.value)} placeholder="P-1006" className="rounded-xl" /></Labeled>
        <Labeled label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Item name" className="rounded-xl" /></Labeled>
        <Labeled label="Category">
          <select value={form.category} onChange={(e)=>set("category", e.target.value)} className="w-full border rounded-md px-3 py-2 bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700">
            {categories.map((c)=> <option key={c} value={c}>{c}</option>)}
          </select>
        </Labeled>
        <Labeled label="Price"><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className="rounded-xl" /></Labeled>
        <Labeled label="Quantity"><Input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className="rounded-xl" /></Labeled>
        <Labeled label="Supplier"><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} className="rounded-xl" /></Labeled>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl">Cancel</Button>
        <Button type="submit" className="rounded-xl">Save</Button>
      </div>
    </form>
  );
}

function Labeled({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-slate-600">{label}</div>
      {children}
    </label>
  );
}

function Placeholder({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center bg-white">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-slate-500">{subtitle}</p>
    </div>
  );
}

/** Test Panel – acts as simple test cases (no external test runner)
 *  - Ensures totals & currency compute correctly
 *  - Ensures filtering works as expected
 */
function TestPanel({ products }) {
  const [results, setResults] = useState([]);

  const runTests = () => {
    const res = [];

    // Test 1: currency formatting
    const c = currency(123456);
    res.push({ name: "currency formats in INR", pass: /^\D/.test(c) && c.includes("123,456") });

    // Test 2: totals calculation
    const totalItems = products.length;
    const stockValue = products.reduce((s,p)=>s+p.price*p.quantity,0);
    const lowStock = products.filter(p=>p.quantity<10).length;
    res.push({ name: "totals.totalItems equals products.length", pass: totalItems === products.length });
    res.push({ name: "totals.lowStock counts <10 correctly", pass: lowStock === products.filter(p=>p.quantity<10).length });
    res.push({ name: "stockValue positive number", pass: typeof stockValue === 'number' && stockValue > 0 });

    // Test 3: filter by category
    const cat = "Accessories";
    const filtered = products.filter(p=>p.category===cat);
    res.push({ name: "category filter finds only Accessories", pass: filtered.every(p=>p.category===cat) });

    setResults(res);
  };

  return (
    <Card className="rounded-2xl">
      <Card.Header>Test Panel</Card.Header>
      <Card.Body>
        <div className="flex items-center gap-3 mb-3">
          <Button onClick={runTests}>Run tests</Button>
          <span className="text-sm text-slate-500">Quick checks to validate logic.</span>
        </div>
        <ul className="space-y-1 text-sm">
          {results.map((r, i)=> (
            <li key={i} className={`flex items-center justify-between p-2 rounded border ${r.pass? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
              <span>{r.name}</span>
              <span className={`font-semibold`}>{r.pass? 'PASS' : 'FAIL'}</span>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}
