import React, { useState, useEffect, useRef } from 'react';
import { QrCode, ScanLine } from 'lucide-react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import {
  Menu,
  X,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Home,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Banknote,
  Package,
  Activity,
  ChevronDown,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { recordSale, fetchAllSales, subscribeAllSales, groupSalesByDateWithRevenue, rankTopProducts } from './Services/salesService';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, getDocs, deleteDoc, doc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from './firebaseConfig';
import Analytics from './Analytics';
import Products from './Products';
import AddItem from './AddItem';

function Dashboard({ onLogout, userData }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  // Products (must be declared before handlers referencing it)
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search handlers
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() === '') {
      setSearchResult(null);
      return;
    }
    const found = products.find(
      (product) => product.name.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setSearchResult(found || null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResult) {
      handleViewProduct(searchResult);
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile-first approach
  const [activeTab, setActiveTab] = useState('overview');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellData, setSellData] = useState({ units: '', pricePerUnit: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);
  // Low stock alert threshold & alert tracking (declare early so effects can use)
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [stockAlerts, setStockAlerts] = useState([]); // { id, productId, name, level, type, ts }
  const lastAlertRef = useRef({});
  const lastEmailRef = useRef({});
  const [showNotifications, setShowNotifications] = useState(false);
  // General (non-stock) notifications
  const [uiNotifications, setUiNotifications] = useState([]); // {id, message, level, ts}

  const pushNote = (message, level='info') => {
    setUiNotifications(n => [{ id: Date.now() + '_' + Math.random().toString(36).slice(2), message, level, ts: Date.now() }, ...n].slice(0, 12));
  };

  // Form state for adding new item
  const [newItem, setNewItem] = useState({
    productName: '',
    sku: '',
    stockLevel: '',
    expiryDate: '',
    brand: '',
    category: '',
    quantity: '',
    unitOfMeasure: '',
    description: '',
    price: '',
    additionalInfo: '',
    image: null
  });

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Fetch products & set up realtime low-stock alerts
  useEffect(() => {
    fetchProducts();
    const invRef = collection(db, 'inventory');
    const unsub = onSnapshot(invRef, (snap) => {
      const updated = [];
      snap.forEach(d => {
        const data = d.data();
        updated.push({ id: d.id, name: data.productName, stockLevel: data.stockLevel });
      });
      updated.forEach(p => {
        const level = Number(p.stockLevel || 0);
        if (level <= lowStockThreshold) {
          const key = p.id;
          const prev = lastAlertRef.current[key];
          if (!prev || prev.level !== level) {
            // Avoid spamming: only one alert per new level; also throttle to 15s
            if (!prev || (Date.now() - prev.time) > 15000) {
              const type = level === 0 ? 'out' : 'low';
              const alertObj = { id: key + '_' + level + '_' + Date.now(), productId: p.id, name: p.name, level, type, ts: Date.now() };
              setStockAlerts(a => [alertObj, ...a].slice(0, 6));
              lastAlertRef.current[key] = { level, time: Date.now() };
              sendLowStockEmail(alertObj);
            }
          }
        }
      });
    }, (err) => console.warn('Realtime inventory error', err));
  return () => unsub();
  }, [lowStockThreshold]);

  // Function to fetch products from Firebase
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"));
      const productsData = [];
      querySnapshot.forEach((doc) => {
        productsData.push({
          id: doc.id,
          name: doc.data().productName,
          sku: doc.data().sku,
          status: doc.data().stockLevel > 20 ? 'In Stock' : doc.data().stockLevel > 0 ? 'Low Stock' : 'Out of Stock',
          stockLevel: doc.data().stockLevel,
          category: doc.data().category,
          price: doc.data().price,
          sellingPrice: doc.data().sellingPrice,
          expiryDate: doc.data().expiryDate,
          brand: doc.data().brand,
          quantity: doc.data().quantity,
          unitOfMeasure: doc.data().unitOfMeasure,
          description: doc.data().description,
          additionalInfo: doc.data().additionalInfo,
          createdAt: doc.data().createdAt
          , qrCode: doc.data().qrCode || null
        });
      });
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products: ", error);
  pushNote('Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle view product
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const handleScanResult = (result, error) => {
    if (!!result) {
      try {
        const text = result?.text || '';
        const payload = JSON.parse(text);
        if (payload.type === 'inventory_item' && payload.id) {
          const found = products.find(p => p.id === payload.id);
          if (found) {
            setShowQRScanner(false);
            handleViewProduct(found);
          } else {
            pushNote('Item not found for scanned code','warn');
          }
        } else {
          pushNote('Invalid QR code','warn');
        }
      } catch (e) {
        pushNote('Failed to parse QR','error');
      }
    }
    if (error) {
      // non-fatal; log silently
      // console.log(error);
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const openSellModal = (product) => {
    setSelectedProduct(product);
    setSellData({ units: '', pricePerUnit: product.sellingPrice || product.price || '' });
    setShowSellModal(true);
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const units = Number(sellData.units);
    const pricePerUnit = Number(sellData.pricePerUnit || 0);
    if (!units || units <= 0) {
  pushNote('Enter valid units', 'warn');
      return;
    }
    if (units > selectedProduct.stockLevel) {
  pushNote('Cannot sell more than stock level', 'warn');
      return;
    }
    try {
      await recordSale({ productId: selectedProduct.id, units, pricePerUnit });
      // Update local state
      setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, stockLevel: p.stockLevel - units, status: (p.stockLevel - units) > 20 ? 'In Stock' : (p.stockLevel - units) > 0 ? 'Low Stock' : 'Out of Stock' } : p));
  setShowSellModal(false);
    } catch (err) {
      console.error(err);
  pushNote('Failed to record sale', 'error');
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteDoc(doc(db, "inventory", product.id));
        setProducts(products.filter(p => p.id !== product.id));
  pushNote('Product deleted', 'success');
      } catch (error) {
        console.error("Error deleting product: ", error);
  pushNote('Failed to delete product', 'error');
      }
    }
  };

  // Handle updating product
  const handleUpdateProduct = async () => {
    if (!selectedProduct.name || selectedProduct.stockLevel === '' || selectedProduct.stockLevel == null || !selectedProduct.expiryDate) {
  pushNote('Fill all required fields', 'warn');
      return;
    }

    const priceNum = Number(selectedProduct.price);
    const sellNum = selectedProduct.sellingPrice === '' || selectedProduct.sellingPrice == null ? priceNum : Number(selectedProduct.sellingPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      pushNote('Price must be a valid non-negative number', 'warn');
      return;
    }
    if (Number.isNaN(sellNum) || sellNum < 0) {
      pushNote('Selling Price must be a valid non-negative number', 'warn');
      return;
    }

    try {
      const docRef = doc(db, "inventory", selectedProduct.id);
      await updateDoc(docRef, {
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        stockLevel: Number(selectedProduct.stockLevel),
        expiryDate: selectedProduct.expiryDate,
        brand: selectedProduct.brand,
        category: selectedProduct.category,
        quantity: selectedProduct.quantity,
        unitOfMeasure: selectedProduct.unitOfMeasure,
        description: selectedProduct.description,
        price: priceNum,
        sellingPrice: sellNum,
        additionalInfo: selectedProduct.additionalInfo,
        updatedAt: new Date()
      });

      setProducts(products.map(p =>
        p.id === selectedProduct.id ? selectedProduct : p
      ));

      setShowEditModal(false);
      setSelectedProduct(null);
  pushNote('Product updated', 'success');
    } catch (error) {
      console.error("Error updating product: ", error);
  pushNote('Failed to update product', 'error');
    }
  };

  // Handle adding new item
  const handleAddItem = (formData) => {
    if (!formData.productName || !formData.sku || !formData.stockLevel || !formData.expiryDate || !formData.price) {
  pushNote('Fill all required fields', 'warn');
      return;
    }

    const itemToAdd = {
      name: formData.productName,
      sku: formData.sku,
      stockLevel: parseInt(formData.stockLevel),
      expiryDate: formData.expiryDate,
      brand: formData.brand,
      category: formData.category,
      quantity: formData.quantity,
      unitOfMeasure: formData.unitOfMeasure,
      description: formData.description,
      price: parseFloat(formData.price),
      additionalInfo: formData.additionalInfo,
      image: formData.image,
      status: formData.stockLevel > 20 ? 'In Stock' : formData.stockLevel > 0 ? 'Low Stock' : 'Out of Stock',
      id: formData.id || Date.now() // Use Firebase ID if available
    };

    // Add to products array
    setProducts([...products, itemToAdd]);

    // Clear search term so new product is visible
    setSearchTerm('');

    // Reset form and close modal
    setNewItem({
      productName: '',
      sku: '',
      stockLevel: '',
      expiryDate: '',
      brand: '',
      category: '',
      quantity: '',
      unitOfMeasure: '',
      description: '',
      price: '',
      additionalInfo: '',
      image: null
    });
    setShowAddItemModal(false);

    // Show success message
  pushNote(`Product "${itemToAdd.name}" added`, 'success');
  };

  const [stats, setStats] = useState([
    { key: 'revenue', title: 'Total Revenue', value: '₹0', change: '', icon: Banknote, color: 'text-green-600', bgColor: 'bg-green-100' },
    { key: 'orders', title: 'Total Orders', value: '0', change: '', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { key: 'sold', title: 'Products Sold', value: '0', change: '', icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { key: 'active', title: 'Active Products', value: '0', change: '', icon: Package, color: 'text-orange-600', bgColor: 'bg-orange-100' }
  ]);
  const [salesRangeDays, setSalesRangeDays] = useState(30);
  const [allSales, setAllSales] = useState([]); // real-time sales slice
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  // Reports configuration
  const [reportLeadTime, setReportLeadTime] = useState(7); // days
  const [reportTargetDays, setReportTargetDays] = useState(30);
  // email alert sender (throttled per product+level 5 min)
  const sendLowStockEmail = (alertObj) => {
    const key = alertObj.productId + '_' + alertObj.level;
    const prev = lastEmailRef.current[key];
    if (prev && (Date.now() - prev) < 5 * 60 * 1000) return; // 5 min throttle
    lastEmailRef.current[key] = Date.now();
    const base = (process.env.REACT_APP_AI_URL || 'http://localhost:8000').replace(/\/$/, '');
  fetch(base + '/low_stock_alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: alertObj.productId,
        productName: alertObj.name,
        stockLevel: alertObj.level,
    threshold: lowStockThreshold,
    toEmail: userData?.email || null
      })
    }).catch(e => console.warn('Low stock email send failed', e));
  };

  // Real-time subscription to all sales
  useEffect(() => {
    const unsub = subscribeAllSales({ days: salesRangeDays, onData: setAllSales });
    return () => unsub && unsub();
  }, [salesRangeDays]);

  // Recompute stats & derived datasets when products or allSales changes
  useEffect(() => {
    const productsMap = new Map(products.map(p => [p.id, p]));
    let revenue = 0; let totalUnits = 0; let orders = 0;
    allSales.forEach(s => {
      const prod = productsMap.get(s.productId);
      const price = s.pricePerUnit || (prod ? prod.sellingPrice || prod.price || 0 : 0);
      revenue += Number(price) * Number(s.units || 0);
      totalUnits += Number(s.units || 0);
      orders += 1;
    });
    const activeProducts = products.length;
    const fmt = (n) => n.toLocaleString();
    setStats(prev => prev.map(card => {
      if (card.key === 'revenue') return { ...card, value: '₹' + revenue.toFixed(2) };
      if (card.key === 'orders') return { ...card, value: fmt(orders) };
      if (card.key === 'sold') return { ...card, value: fmt(totalUnits) };
      if (card.key === 'active') return { ...card, value: fmt(activeProducts) };
      return card;
    }));
    setRevenueSeries(groupSalesByDateWithRevenue(allSales, productsMap));
    setTopProducts(rankTopProducts(allSales, productsMap, 5));
  }, [allSales, products]);

  // One-time electronics dataset seeding for richer demo / AI training
  // Disabled automatic demo seeding to prevent unwanted items appearing after reload.
  // If demo data is needed, use the explicit "Seed Electronics Demo" button in the maintenance actions below.
  // (Original auto-seed code removed per user request.)

  // Reset (purge) all sales data so revenue/statistics start fresh
  const [resetting, setResetting] = useState(false);
  const handleResetData = async () => {
    if (resetting) return;
    if (!resetArm) {
      setResetArm(true);
      pushNote('Tap Reset Sales Data again within 8s to confirm purge', 'warn');
      setTimeout(()=> setResetArm(false), 8000);
      return;
    }
    setResetting(true);
    try {
      const svc = await import('./Services/salesService');
      await svc.purgeAllSalesData();
      setAllSales([]);
      setRevenueSeries([]);
      setTopProducts([]);
      setStats(prev => prev.map(c => c.key === 'revenue' ? { ...c, value: '₹0', change: '' } : c));
      pushNote('Sales data cleared', 'success');
    } catch (e) {
      console.error('Reset failed', e);
      pushNote('Reset failed: ' + (e.message || 'unknown'), 'error');
    } finally {
      setResetting(false);
      setResetArm(false);
    }
  };

  const [reseeding, setReseeding] = useState(false);
  const [resetArm, setResetArm] = useState(false);
  const [diversifyArm, setDiversifyArm] = useState(false);
  const [seedElectronicsArm, setSeedElectronicsArm] = useState(false);
  const [seedingElectronics, setSeedingElectronics] = useState(false);
  const [removeDemoArm, setRemoveDemoArm] = useState(false);
  const [removingDemo, setRemovingDemo] = useState(false);
  const handleDiversifiedReseed = async () => {
    if (reseeding) return;
    if (!diversifyArm) {
      setDiversifyArm(true);
      pushNote('Tap Diversified Reseed again within 8s to confirm purge & reseed', 'warn');
      setTimeout(()=> setDiversifyArm(false), 8000);
      return;
    }
    setReseeding(true);
    try {
      const svc = await import('./Services/salesService');
      await svc.purgeAllSalesData();
      const res = await svc.diversifySalesHistory({ days: 70, maxUnits: 60 });
      console.log('Diversified reseed result', res);
      pushNote('Diversified sales history generated', 'success');
    } catch (e) {
      console.error('Diversified reseed failed', e);
      pushNote('Diversified reseed failed: ' + (e.message || 'unknown'), 'error');
    } finally {
      setReseeding(false);
    }
  };

  const recentActivities = [
    { user: 'John Doe', action: 'restocked', product: 'Fresh Organic Bananas', time: '2 hours ago', avatar: 'JD' },
    { user: 'Sarah Wilson', action: 'added new product', product: 'Whole Grain Bread', time: '4 hours ago', avatar: 'SW' },
    { user: 'Mike Johnson', action: 'updated inventory', product: 'Organic Milk 2L', time: '6 hours ago', avatar: 'MJ' },
    { user: 'Emily Brown', action: 'marked out of stock', product: 'Fresh Tomatoes', time: '1 day ago', avatar: 'EB' }
  ];


  const generateReport = async () => {
    try {
      const productsMap = new Map(products.map(p => [p.id, p]));
      const header = ['productName','date','units','pricePerUnit','estRevenue'];
      const esc = (v) => {
        if (v == null) return '';
        const str = String(v);
        return /[",\n]/.test(str) ? '"' + str.replace(/"/g,'""') + '"' : str;
      };
      const rows = allSales.map(s => {
        const prod = productsMap.get(s.productId);
        const unitPrice = s.pricePerUnit || (prod ? prod.sellingPrice || prod.price || 0 : 0);
        return [prod?.name || '(Unknown)', s.date, s.units, unitPrice, (unitPrice * Number(s.units||0)).toFixed(2)];
      });
      const csv = [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_report_live_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
  pushNote('Failed to generate report', 'error');
      console.error(e);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return 'text-green-600 bg-green-100';
      case 'Low Stock': return 'text-yellow-600 bg-yellow-100';
      case 'Out of Stock': return 'text-red-600 bg-red-100';
      case 'On Order': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
  {/* Floating low stock alerts removed per user request; alerts now only visible inside notifications dropdown */}
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center ml-4 lg:ml-0">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="ml-3 text-lg sm:text-xl font-bold text-gray-900">TechCraft</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search - Hidden on very small screens */}
              <div className="relative hidden sm:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {/* Show search results below input */}
                {searchTerm && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            handleViewProduct(product);
                            setSearchTerm('');
                          }}
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku || 'N/A'} | {product.category} | {product.status} | Stock: {product.stockLevel} | ₹{product.price ? product.price.toFixed(2) : 'N/A'}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 text-sm">
                        No products found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications */}
              {/* QR Scan */}
              <div>
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Scan Item QR"
                >
                  <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(v => !v)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  {(stockAlerts.length + uiNotifications.length) > 0 && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                      <span className="text-sm font-semibold text-gray-700">Notifications</span>
                      <button onClick={() => { setStockAlerts([]); setUiNotifications([]); }} className="text-xs text-blue-600 hover:underline">Clear All</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                      {(stockAlerts.length + uiNotifications.length) === 0 && (
                        <div className="p-4 text-xs text-gray-500">No notifications.</div>
                      )}
                      {uiNotifications.map(n => (
                        <div key={n.id} className="p-3 text-xs flex items-start gap-2 hover:bg-gray-50">
                          <span className={`mt-0.5 h-2 w-2 rounded-full ${n.level==='error' ? 'bg-red-600' : n.level==='warn' ? 'bg-amber-500' : n.level==='success' ? 'bg-emerald-600' : 'bg-blue-500'}`}></span>
                          <div className="flex-1">
                            <div className="text-gray-800 break-words">{n.message}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(n.ts).toLocaleTimeString()}</div>
                          </div>
                          <button onClick={() => setUiNotifications(lst => lst.filter(x => x.id !== n.id))} className="text-gray-300 hover:text-gray-500">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {stockAlerts.map(a => (
                        <div key={a.id} className="p-3 text-xs flex items-start gap-2 hover:bg-gray-50">
                          <span className={`mt-0.5 h-2 w-2 rounded-full ${a.type === 'out' ? 'bg-red-600' : 'bg-amber-500'}`}></span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 truncate">{a.name}</div>
                            <div className="text-gray-600">{a.type === 'out' ? 'Out of stock' : 'Low stock'} (Level: {a.level})</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(a.ts).toLocaleTimeString()}</div>
                          </div>
                          <button onClick={() => setStockAlerts(lst => lst.filter(x => x.id !== a.id))} className="text-gray-300 hover:text-gray-500">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 sm:space-x-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:bg-gray-100 px-2 py-1 transition-all duration-200"
                >
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-medium text-xs sm:text-sm">{userData?.firstName?.[0] || 'U'}</span>
                  </div>
                  <span className="hidden sm:block text-gray-700 font-medium">
                    {userData?.firstName || 'User'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Logout dropdown - only show when clicked */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-10 border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={onLogout}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-0 lg:top-16 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${showAddItemModal ? 'lg:hidden' : ''}`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
            <span className="text-lg font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4">
            <nav className="space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: Home },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'products', label: 'Products', icon: Package },
                { id: 'team', label: 'Team', icon: Users },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 p-4 sm:p-6 min-w-0 ml-0 lg:ml-64 ${showAddItemModal ? 'lg:ml-0' : ''}`}>
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
                <h1 className="text-xl sm:text-2xl font-bold mb-2">
                  Welcome back, {userData?.firstName || 'User'}! 👋
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">Here's what's happening with your products today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor} flex-shrink-0`}>
                        <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4 flex items-center">
                      <span className="text-xs sm:text-sm font-medium text-green-600">{stat.change}</span>
                      <span className="text-xs sm:text-sm text-gray-500 ml-2 hidden sm:inline">from last month</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Maintenance Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleResetData}
                  disabled={resetting}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                  title="Delete all sales history (keeps products)"
                >{resetting ? 'Resetting…' : 'Reset Sales Data'}</button>
                <button
                  onClick={handleDiversifiedReseed}
                  disabled={reseeding}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                  title="Purge & generate diverse synthetic history for better AI variation"
                >{reseeding ? 'Generating…' : 'Diversified Reseed'}</button>
                <button
                  onClick={async () => {
                    if (seedingElectronics) return;
                    if (!seedElectronicsArm) {
                      setSeedElectronicsArm(true);
                      pushNote('Tap Seed Electronics Demo again within 8s to confirm seeding', 'warn');
                      setTimeout(()=> setSeedElectronicsArm(false), 8000);
                      return;
                    }
                    setSeedingElectronics(true);
                    try {
                      const svc = await import('./Services/salesService');
                      const res = await svc.seedElectronicsInventoryAndSales({ days: 90 });
                      pushNote(`Electronics demo seeded. Created: ${res.created}`, 'success');
                    } catch (e) { pushNote('Electronics seed failed: ' + (e.message||'unknown'), 'error'); }
                    finally { setSeedingElectronics(false); setSeedElectronicsArm(false); }
                  }}
                  disabled={seedingElectronics}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                  title="Seed electronics demo catalog (manual trigger)"
                >{seedingElectronics ? 'Seeding…' : 'Seed Electronics Demo'}</button>
                <button
                  onClick={async () => {
                    if (removingDemo) return;
                    if (!removeDemoArm) {
                      setRemoveDemoArm(true);
                      pushNote('Tap Remove Demo Items again within 8s to confirm deletion', 'warn');
                      setTimeout(()=> setRemoveDemoArm(false), 8000);
                      return;
                    }
                    setRemovingDemo(true);
                    try {
                      const svc = await import('./Services/salesService');
                      const res = await svc.purgeDemoInventory();
                      pushNote(`Removed demo items: ${res.deleted}`, 'success');
                    } catch (e) { pushNote('Remove demo items failed: ' + (e.message||'unknown'), 'error'); }
                    finally { setRemovingDemo(false); setRemoveDemoArm(false); }
                  }}
                  disabled={removingDemo}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
                  title="Delete previously seeded demo inventory items"
                >{removingDemo ? 'Removing…' : 'Remove Demo Items'}</button>
                <button
                  onClick={async () => {
                    try {
                      const svc = await import('./Services/salesService');
                      const res = await svc.addAIDemoItemsAndSales({ days: 70 });
                      pushNote(`AI demo items processed. New: ${res.created}, sales: ${res.salesInserted}`, 'success');
                    } catch (e) { pushNote('AI demo seeding failed: ' + (e.message||'unknown'), 'error'); }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  title="Add curated items with distinct demand patterns for varied AI suggestions"
                >Add AI Demo Items</button>
              </div>

              {/* Charts and Activity Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1" value={salesRangeDays} onChange={e => setSalesRangeDays(Number(e.target.value))}>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 3 months</option>
                      </select>
                      <button className="p-1 hover:bg-gray-100 rounded" onClick={generateReport} title="Download CSV report">
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="h-48 sm:h-64">
                    {revenueSeries.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueSeries.map(r => ({ ...r, revenue: Number(r.revenue.toFixed(2)) }))}>
                          <CartesianGrid stroke="#eee" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} name="Revenue" />
                          <Line type="monotone" dataKey="units" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 4" name="Units" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales in range.</div>
                    )}
                  </div>
                </div>
                {/* Top Products & Low Stock */}
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products (Units Sold)</h3>
                    {topProducts.length ? (
                      <div className="space-y-3">
                        {topProducts.map(tp => (
                          <div key={tp.productId} className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[140px]" title={tp.name}>{tp.name}</span>
                            <span className="font-semibold text-gray-800">{tp.units}</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-sm text-gray-500">No sales yet.</div>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-900">Low Stock Alerts</h4>
                      <select
                        value={lowStockThreshold}
                        onChange={e => setLowStockThreshold(Number(e.target.value))}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                        title="Threshold"
                      >
                        <option value={5}>≤5</option>
                        <option value={10}>≤10</option>
                        <option value={20}>≤20</option>
                      </select>
                    </div>
                    {products.filter(p => (p.stockLevel ?? 0) <= lowStockThreshold).length ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {products
                          .filter(p => (p.stockLevel ?? 0) <= lowStockThreshold)
                          .sort((a,b)=>(a.stockLevel??0)-(b.stockLevel??0))
                          .map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded border bg-white">
                              <span className="truncate max-w-[120px]" title={p.name}>{p.name}</span>
                              <span className={`font-semibold ${ (p.stockLevel??0)===0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stockLevel ?? 0}</span>
                            </div>
                          ))}
                      </div>
                    ) : <div className="text-xs text-gray-500">All stocks above threshold.</div>}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Active Products</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {isLoading ? 'Loading products...' : searchTerm ? `Showing ${filteredProducts.length} of ${products.length} products` : `Total: ${products.length} products`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchProducts}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : 'Refresh'}
                      </button>
                      <button
                        onClick={() => setShowAddItemModal(true)}
                        className="h-12 w-12 px-3 sm:px-4 py-2 rounded-full transition-all flex items-center justify-center text-sm sm:text-base shadow-lg fixed bottom-6 right-6 z-30 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                      >
                        <Plus className="h-5 w-5 " />
                        <span className="sm:hidden">Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="block lg:hidden">
                  <div className="p-4 space-y-4">
                    {isLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading products...</span>
                      </div>
                    ) : (searchTerm ? filteredProducts : products).length > 0 ? (
                      (searchTerm ? filteredProducts : products).map((product, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                                  {product.status}
                                </span>
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {product.category}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                SKU: {product.sku || 'N/A'} | Price: ₹{product.price ? product.price.toFixed(2) : 'N/A'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                onClick={() => handleViewProduct(product)}
                                className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                title="View Product"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors"
                                title="Edit Product"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Stock:</span>
                              <span className={`ml-1 font-medium ${product.stockLevel === 0 ? 'text-red-600' :
                                  product.stockLevel < 20 ? 'text-yellow-600' :
                                    'text-green-600'
                                }`}>
                                {product.stockLevel} units
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expires:</span>
                              <span className="ml-1 font-medium text-gray-900">{formatDate(product.expiryDate)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm ? `No products found matching "${searchTerm}"` : 'No products available'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="ml-3 text-gray-600">Loading products...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (searchTerm ? filteredProducts : products).length > 0 ? (
                        (searchTerm ? filteredProducts : products).map((product, index) => (
                          <tr key={product.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{product.sku || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className={`text-sm font-medium ${product.stockLevel === 0 ? 'text-red-600' :
                                    product.stockLevel < 20 ? 'text-yellow-600' :
                                      'text-green-600'
                                  }`}>
                                  {product.stockLevel} units
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ₹{product.price ? product.price.toFixed(2) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(product.expiryDate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewProduct(product)}
                                  className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                  title="View Product"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors"
                                  title="Edit Product"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product)}
                                  className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openSellModal(product)}
                                  className="text-emerald-600 hover:text-emerald-900 p-1 hover:bg-emerald-50 rounded transition-colors"
                                  title="Record Sale"
                                >
                                  ₹<span className="sr-only">Sell</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                            {searchTerm ? `No products found matching "${searchTerm}"` : 'No products available'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <Analytics />
          )}

          {activeTab === 'products' && (
            <Products />
          )}

          {activeTab === 'team' && (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Management</h3>
              <p className="text-gray-500 text-sm sm:text-base">Manage your team members and their roles.</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><FileText className="h-6 w-6" /></div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Inventory & Sales Report</h3>
                    <p className="text-sm text-gray-500">Real-time snapshot (last {salesRangeDays} days sales window)</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lead Time (days)</label>
                    <input type="number" min={1} max={60} value={reportLeadTime} onChange={e=>setReportLeadTime(Number(e.target.value)||7)} className="w-24 px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Target Coverage (days)</label>
                    <input type="number" min={7} max={120} value={reportTargetDays} onChange={e=>setReportTargetDays(Number(e.target.value)||30)} className="w-28 px-2 py-1 border rounded" />
                  </div>
                  <button onClick={generateReport} className="h-9 px-4 rounded-md bg-white border text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
                    <Download className="w-4 h-4" /> CSV Sales
                  </button>
                  <button
                    onClick={() => {
                      // Export reorder recommendations
                      try {
                        const recs = window.__latestReorderRecs || [];
                        const header = ['Product','AvgDaily','Stock','ReorderPoint','SuggestedOrder','DaysCover','LeadTime','TargetDays'];
                        const esc = v => v==null?'' : /[",\n]/.test(String(v)) ? '"'+String(v).replace(/"/g,'""')+'"' : v;
                        const rows = recs.map(r => [r.name,r.avgDaily,r.stockLevel,r.reorderPoint,r.suggestedOrderQty,r.daysCover,r.leadTime,r.targetDays]);
                        const csv = [header.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\n');
                        const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='reorder_recommendations_'+Date.now()+'.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                        pushNote('Reorder recommendations exported','success');
                      } catch(e){ console.error(e); pushNote('Export failed','error'); }
                    }}
                    className="h-9 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >Export Reorders</button>
                </div>
              </div>

              {(() => {
                // Compute executive & inventory metrics
                const productsMap = new Map(products.map(p=>[p.id,p]));
                let totalRevenue = 0, totalUnits = 0, costSold = 0, profit = 0, marginUnits = 0;
                allSales.forEach(s => {
                  const prod = productsMap.get(s.productId);
                  const cost = prod ? (prod.price||0) : 0;
                  const sell = s.pricePerUnit || (prod ? (prod.sellingPrice||prod.price||0):0);
                  const units = Number(s.units||0);
                  totalUnits += units; totalRevenue += sell*units; costSold += cost*units; profit += (sell-cost)*units; if (sell>0) marginUnits += (sell-cost)/sell * units;
                });
                const avgMarginPct = totalUnits ? (marginUnits/totalUnits*100) : 0;
                const stockValuation = products.reduce((a,p)=> a + (Number(p.stockLevel||0) * Number(p.price||0)), 0);
                const inventoryTurnover = stockValuation ? (costSold / stockValuation) : 0;
                const dailyCost = salesRangeDays ? costSold / salesRangeDays : 0;
                const daysOfInventory = dailyCost ? (stockValuation / dailyCost) : null;
                return (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                    {[{title:'Revenue',value:'₹'+totalRevenue.toFixed(2)},{title:'Gross Profit',value:'₹'+profit.toFixed(2)},{title:'Avg Margin %',value:avgMarginPct.toFixed(1)+'%'},{title:'Units Sold',value:totalUnits},{title:'Stock Valuation',value:'₹'+stockValuation.toFixed(2)},{title:'Inv Turnover',value:inventoryTurnover.toFixed(2)},{title:'Days Inventory',value: daysOfInventory? daysOfInventory.toFixed(1):'—'},{title:'Active SKUs',value:products.length}].map((c,i)=>(
                      <div key={i} className="bg-white rounded-lg border p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 tracking-wide">{c.title}</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">{c.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                // Demand calculations per product for recommendations
                const dayMap = new Map(); // productId -> { dates: {date: units}, totalUnits }
                allSales.forEach(s => {
                  if (!dayMap.has(s.productId)) dayMap.set(s.productId,{days:{}, total:0});
                  const rec = dayMap.get(s.productId);
                  rec.days[s.date] = (rec.days[s.date]||0) + Number(s.units||0);
                  rec.total += Number(s.units||0);
                });
                const lowList = []; const overList = [];
                const recommendations = [];
                const target = reportTargetDays;
                products.forEach(p => {
                  const rec = dayMap.get(p.id);
                  const days = rec? Object.values(rec.days):[];
                  const nDays = salesRangeDays || 1;
                  const avgDaily = rec? (rec.total / nDays):0;
                  const mean = avgDaily;
                  let variance = 0; if (days.length){ const m = days.reduce((a,b)=>a+b,0)/days.length; variance = days.reduce((a,b)=> a + Math.pow(b-m,2),0)/days.length; }
                  const stdDaily = Math.sqrt(variance);
                  const lead = reportLeadTime;
                  const safety = +(1.65 * stdDaily * Math.sqrt(lead)).toFixed(2);
                  const reorderPoint = +(avgDaily * lead + safety).toFixed(2);
                  const stock = Number(p.stockLevel||0);
                  const daysCover = avgDaily? +(stock / avgDaily).toFixed(1) : (stock>0? '∞':'0');
                  if (stock <= lowStockThreshold) lowList.push({name:p.name, stock});
                  if (typeof daysCover==='number' && daysCover > target*2) overList.push({name:p.name, stock, daysCover});
                  if (avgDaily>0){
                    const suggestedOrderQty = stock < reorderPoint ? Math.max(0, Math.ceil(target*avgDaily - stock)) : 0;
                    recommendations.push({
                      id:p.id,
                      name:p.name,
                      avgDaily:+avgDaily.toFixed(2),
                      stockLevel:stock,
                      reorderPoint,
                      safetyStock:safety,
                      suggestedOrderQty,
                      daysCover,
                      leadTime:lead,
                      targetDays:target
                    });
                  }
                });
                // store latest recommendations globally for export button access
                window.__latestReorderRecs = recommendations;
                return (
                  <div className="space-y-10">
                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Low Stock (≤ {lowStockThreshold})</h4>
                      {lowList.length? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {lowList.sort((a,b)=>a.stock-b.stock).map(l => (
                            <div key={l.name} className="border rounded-md p-3 bg-white flex items-center justify-between text-sm">
                              <span className="truncate" title={l.name}>{l.name}</span>
                              <span className={`font-semibold ${l.stock===0?'text-red-600':'text-amber-600'}`}>{l.stock}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-gray-500">No items currently below threshold.</p>}
                    </section>
                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Overstock (days cover &gt; {target*2})</h4>
                      {overList.length? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border bg-white">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-1 border">Product</th><th className="px-2 py-1 border">Stock</th><th className="px-2 py-1 border">Days Cover</th>
                              </tr>
                            </thead>
                            <tbody>
                              {overList.sort((a,b)=> b.daysCover - a.daysCover).map(o => (
                                <tr key={o.name} className="odd:bg-white even:bg-gray-50">
                                  <td className="px-2 py-1 border truncate max-w-[160px]" title={o.name}>{o.name}</td>
                                  <td className="px-2 py-1 border">{o.stock}</td>
                                  <td className="px-2 py-1 border">{o.daysCover}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-gray-500">No significant overstock detected.</p>}
                    </section>
                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Reorder Recommendations</h4>
                      {recommendations.length? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[11px] border bg-white">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-1 border">Product</th>
                                <th className="px-2 py-1 border">Avg Daily</th>
                                <th className="px-2 py-1 border">Stock</th>
                                <th className="px-2 py-1 border">Days Cover</th>
                                <th className="px-2 py-1 border">Safety</th>
                                <th className="px-2 py-1 border">Reorder Pt</th>
                                <th className="px-2 py-1 border">Suggest Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recommendations.sort((a,b)=> (b.suggestedOrderQty||0)-(a.suggestedOrderQty||0)).map(r => (
                                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                                  <td className="px-2 py-1 border truncate max-w-[160px]" title={r.name}>{r.name}</td>
                                  <td className="px-2 py-1 border">{r.avgDaily}</td>
                                  <td className={`px-2 py-1 border ${r.stockLevel < r.reorderPoint? 'text-amber-600 font-semibold':''}`}>{r.stockLevel}</td>
                                  <td className="px-2 py-1 border">{r.daysCover}</td>
                                  <td className="px-2 py-1 border">{r.safetyStock}</td>
                                  <td className="px-2 py-1 border">{r.reorderPoint}</td>
                                  <td className={`px-2 py-1 border ${r.suggestedOrderQty>0?'text-emerald-700 font-semibold':'text-gray-400'}`}>{r.suggestedOrderQty||0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="text-[10px] text-gray-500 mt-2">Formula: Reorder Point = AvgDaily * LeadTime + 1.65 * StdDaily * √LeadTime. Suggested Qty aims for target {target} days cover.</p>
                        </div>
                      ) : <p className="text-sm text-gray-500">No demand data yet to generate recommendations.</p>}
                    </section>
                  </div>
                );
              })()}
            </div>
          )}


          {activeTab === 'settings' && (
            <div className="text-center py-8 sm:py-12">
              <Settings className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Settings & Preferences</h3>
              <p className="text-gray-500 text-sm sm:text-base">Configure your account settings and preferences.</p>
            </div>
          )}

          {/* QR Scanner Modal */}
          {showQRScanner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2"><ScanLine className="h-5 w-5"/> Scan Item QR</h4>
                  <button onClick={() => setShowQRScanner(false)} className="p-2 rounded hover:bg-gray-100"><X className="h-5 w-5"/></button>
                </div>
                <div className="p-4 space-y-4">
                  <QrScanner
                    onDecode={(result) => result && handleScanResult({ text: result }, null)}
                    onError={(err) => handleScanResult(null, err)}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%' }}
                    videoStyle={{ width: '100%', borderRadius: '0.75rem' }}
                  />
                  <p className="text-xs text-gray-500">Point the camera at an item QR code. It will open the product automatically once recognized.</p>
                </div>
              </div>
            </div>
          )}

          {/* Add Item Modal */}
          {showAddItemModal && (
            <AddItem
              onClose={() => setShowAddItemModal(false)}
              onAddItem={handleAddItem}
            />
          )}

          {/* View Product Modal */}
          {showViewModal && selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white rounded-t-xl sm:rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-semibold">Product Details</h3>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                                 {/* Modal Body */}
                 <div className="p-4 sm:p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Left Column - Basic Information */}
                     <div className="space-y-4">
                       <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">
                         Basic Information
                       </h4>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Product Name</label>
                         <p className="text-base sm:text-lg font-semibold text-gray-900">{selectedProduct.name}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">SKU</label>
                         <p className="text-base text-gray-900">{selectedProduct.sku || 'N/A'}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                         <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                           {selectedProduct.category}
                         </span>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Brand</label>
                         <p className="text-base text-gray-900">{selectedProduct.brand || 'N/A'}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                         <p className="text-base text-gray-900">{selectedProduct.description || 'No description available'}</p>
                       </div>
                     </div>

                     {/* Right Column - Inventory & Pricing */}
                     <div className="space-y-4">
                       <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">
                         Inventory & Pricing
                       </h4>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Stock Level</label>
                         <p className="text-base sm:text-lg font-semibold text-gray-900">{selectedProduct.stockLevel} units</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                         <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedProduct.status)}`}>
                           {selectedProduct.status}
                         </span>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Cost Price</label>
                         <p className="text-base sm:text-lg font-semibold text-gray-900">₹{selectedProduct.price ? selectedProduct.price.toFixed(2) : 'N/A'}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Selling Price</label>
                         <p className="text-base sm:text-lg font-semibold text-gray-900">₹{selectedProduct.sellingPrice ? selectedProduct.sellingPrice.toFixed(2) : 'N/A'}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Quantity & Unit</label>
                         <p className="text-base text-gray-900">{selectedProduct.quantity || 'N/A'} {selectedProduct.unitOfMeasure || ''}</p>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                         <p className="text-base sm:text-lg font-semibold text-gray-900">{formatDate(selectedProduct.expiryDate)}</p>
                       </div>
                     </div>
                   </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {showEditModal && selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 sm:p-6 text-white rounded-t-xl sm:rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-semibold">Edit Product</h3>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6">
                  <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(); }} className="space-y-4">
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={selectedProduct.name}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SKU *
                      </label>
                      <input
                        type="text"
                        value={selectedProduct.sku || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={selectedProduct.category || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      >
                        {/* Ensure current category appears even if not in default set */}
                        {selectedProduct.category && !['Fruits','Vegetables','Dairy','Bakery','Meat','Grains','Beverages','Snacks','Electronics','Accessories','Audio','Computers','Wearables','Tablets','Networking','Gaming'].includes(selectedProduct.category) && (
                          <option value={selectedProduct.category}>{selectedProduct.category}</option>
                        )}
                        <option value="Fruits">Fruits</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Meat">Meat</option>
                        <option value="Grains">Grains</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Audio">Audio</option>
                        <option value="Computers">Computers</option>
                        <option value="Wearables">Wearables</option>
                        <option value="Tablets">Tablets</option>
                        <option value="Networking">Networking</option>
                        <option value="Gaming">Gaming</option>
                      </select>
                    </div>

                    {/* Brand */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={selectedProduct.brand || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Stock Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Level *
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.stockLevel}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, stockLevel: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        min="0"
                        required
                      />
                    </div>

                    {/* Stats Grid + Reset */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        value={selectedProduct.status}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                        <option value="On Order">On Order</option>
                      </select>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.price || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price (leave blank = same as Price)
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.sellingPrice ?? ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, sellingPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={selectedProduct.expiryDate}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-sm"
                      >
                        Update Product
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  {showSellModal && selectedProduct && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white rounded-t-xl flex justify-between items-center">
            <h3 className="text-lg font-semibold">Record Sale - {selectedProduct.name}</h3>
            <button onClick={() => setShowSellModal(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleRecordSale} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units Sold</label>
              <input
                type="number"
                min="1"
                max={selectedProduct.stockLevel}
                value={sellData.units}
                onChange={e => setSellData({ ...sellData, units: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Available: {selectedProduct.stockLevel} units</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Unit (optional)</label>
              <input
                type="number"
                step="0.01"
                value={sellData.pricePerUnit}
                onChange={e => setSellData({ ...sellData, pricePerUnit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700">Save</button>
              <button type="button" onClick={() => setShowSellModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

export default Dashboard; 