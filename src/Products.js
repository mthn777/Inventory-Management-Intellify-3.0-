import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  X,
  SortAsc,
  SortDesc,
  QrCode
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import AddItem from './AddItem';
import { QRCodeCanvas } from 'qrcode.react';

function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qrModalProduct, setQrModalProduct] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Fruits',
    stockLevel: '',
    status: 'In Stock',
    expiryDate: '',
    price: '',
    cost: '',
    description: '',
    supplier: '',
    sku: '',
    weight: '',
    location: ''
  });

  useEffect(() => {
    const fetchProducts = async () => {
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
            cost: doc.data().cost,
            description: doc.data().description,
            supplier: doc.data().supplier,
            weight: doc.data().weight,
            location: doc.data().location,
              expiryDate: doc.data().expiryDate,
              qrCode: doc.data().qrCode || null
          });
        });
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
        alert("Failed to fetch products!");
      }
    };
    fetchProducts();
  }, []);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'price' || sortBy === 'cost' || sortBy === 'stockLevel') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return 'text-green-600 bg-green-100';
      case 'Low Stock': return 'text-yellow-600 bg-yellow-100';
      case 'Out of Stock': return 'text-red-600 bg-red-100';
      case 'On Order': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle add product
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.stockLevel || !newProduct.expiryDate) {
      alert('Please fill in all required fields');
      return;
    }

    const productToAdd = {
      ...newProduct,
      id: Date.now(),
      stockLevel: parseInt(newProduct.stockLevel),
      price: parseFloat(newProduct.price) || 0,
      cost: parseFloat(newProduct.cost) || 0
    };

    setProducts([...products, productToAdd]);
    setNewProduct({
      name: '', category: 'Fruits', stockLevel: '', status: 'In Stock',
      expiryDate: '', price: '', cost: '', description: '', supplier: '', sku: '', weight: '', location: ''
    });
    setShowAddModal(false);
    alert('Product added successfully!');
  };

  // Handle edit product
  const handleEditProduct = () => {
    if (!selectedProduct.name || !selectedProduct.stockLevel || !selectedProduct.expiryDate) {
      alert('Please fill in all required fields');
      return;
    }

    setProducts(products.map(p => 
      p.id === selectedProduct.id ? selectedProduct : p
    ));
    
    setShowEditModal(false);
    setSelectedProduct(null);
    alert('Product updated successfully!');
  };

  // Handle delete product
  const handleDeleteProduct = (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      setProducts(products.filter(p => p.id !== product.id));
      alert('Product deleted successfully!');
    }
  };

  // Export products
  const exportProducts = () => {
    const csvContent = [
      ['Name', 'Category', 'Status', 'Stock Level', 'Price', 'Cost', 'Expiry Date', 'SKU', 'Supplier'],
      ...filteredProducts.map(product => [
        product.name,
        product.category,
        product.status,
        product.stockLevel,
        product.price,
        product.cost,
        product.expiryDate,
        product.sku,
        product.supplier
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add this handler to refresh products after adding
  const handleAddItem = (added) => {
    setShowAddModal(false);
    if (added) {
      alert('Product added successfully!');
      // Optionally, refetch products here if not using Firestore real-time updates
      // fetchProducts();
    }
  };

  const openQRModal = async (product) => {
    setQrModalProduct(product);
    setShowQRModal(true);
    if (!product.qrCode) {
      await generateQR(product);
    }
  };

  const generateQR = async (product) => {
    if (qrGenerating) return;
    try {
      setQrGenerating(true);
      const payload = JSON.stringify({ type: 'inventory_item', id: product.id, sku: product.sku });
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 6 });
      await updateDoc(doc(db, 'inventory', product.id), { qrCode: dataUrl, qrPayload: payload });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, qrCode: dataUrl } : p));
      setQrModalProduct(prev => prev ? { ...prev, qrCode: dataUrl } : prev);
    } catch (e) {
      console.error('QR generation failed', e);
      alert('Failed to generate QR code');
    } finally {
      setQrGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your products</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportProducts}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Beverages">Beverages</option>
              <option value="Snacks">Snacks</option>
              <option value="Meat">Meat</option>
              <option value="Seafood">Seafood</option>
              <option value="Frozen">Frozen</option>
              <option value="Pantry">Pantry</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Household">Household</option>
              <option value="Condiments">Condiments</option>
              <option value="Grains">Grains</option>
              <option value="Spices">Spices</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Stationery">Stationery</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Cosmetics">Cosmetics</option>
              <option value="Toys">Toys</option>
              <option value="Books">Books</option>
              <option value="Jewelry">Jewelry</option>
              <option value="Nuts">Nuts</option>
              <option value="Automotive">Automotive</option>
              <option value="Sports">Sports</option>
              <option value="Furniture">Furniture</option>
              <option value="Appliances">Appliances</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="On Order">On Order</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
              <option value="stockLevel">Stock Level</option>
              <option value="price">Price</option>
              <option value="expiryDate">Expiry Date</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">All Products</h3>
            <div className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden">
          <div className="p-4 space-y-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
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
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="View Product"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedProduct({...product});
                          setShowEditModal(true);
                        }}
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
                      <span className={`ml-1 font-medium ${
                        product.stockLevel === 0 ? 'text-red-600' : 
                        product.stockLevel < 20 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {product.stockLevel} units
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <span className="ml-1 font-medium text-gray-900">₹{product.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SKU:</span>
                      <span className="ml-1 font-medium text-gray-900">{product.sku}</span>
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
                No products found matching your criteria
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        product.stockLevel === 0 ? 'text-red-600' : 
                        product.stockLevel < 20 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {product.stockLevel} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{product.price}</div>
                      <div className="text-xs text-gray-500">Cost: ₹{product.cost}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(product.expiryDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="View Product"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProduct({...product});
                            setShowEditModal(true);
                          }}
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
                          onClick={() => openQRModal(product)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No products found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal using AddItem.js */}
      {showAddModal && (
        <AddItem
          onClose={() => setShowAddModal(false)}
          onAddItem={handleAddItem}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Edit Product</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleEditProduct(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => openQRModal(product)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={selectedProduct.name}
                      onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      value={selectedProduct.category}
                      onChange={(e) => setSelectedProduct({...selectedProduct, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Fruits">Fruits</option>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Meat">Meat</option>
                      <option value="Seafood">Seafood</option>
                      <option value="Frozen">Frozen</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Personal Care">Personal Care</option>
                      <option value="Household">Household</option>
                      <option value="Condiments">Condiments</option>
                      <option value="Grains">Grains</option>
                      <option value="Spices">Spices</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Cosmetics">Cosmetics</option>
                      <option value="Toys">Toys</option>
                      <option value="Books">Books</option>
                      <option value="Jewelry">Jewelry</option>
                      <option value="Nuts">Nuts</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Sports">Sports</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Appliances">Appliances</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Level *</label>
                    <input
                      type="number"
                      value={selectedProduct.stockLevel}
                      onChange={(e) => setSelectedProduct({...selectedProduct, stockLevel: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                    <select
                      value={selectedProduct.status}
                      onChange={(e) => setSelectedProduct({...selectedProduct, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="On Order">On Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedProduct.price}
                      onChange={(e) => setSelectedProduct({...selectedProduct, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedProduct.cost}
                      onChange={(e) => setSelectedProduct({...selectedProduct, cost: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                    <input
                      type="date"
                      value={selectedProduct.expiryDate}
                      onChange={(e) => setSelectedProduct({...selectedProduct, expiryDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                    <input
                      type="text"
                      value={selectedProduct.sku}
                      onChange={(e) => setSelectedProduct({...selectedProduct, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={selectedProduct.description}
                    onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                    <input
                      type="text"
                      value={selectedProduct.supplier}
                      onChange={(e) => setSelectedProduct({...selectedProduct, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight/Size</label>
                    <input
                      type="text"
                      value={selectedProduct.weight}
                      onChange={(e) => setSelectedProduct({...selectedProduct, weight: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Update Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Product Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Product Name</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                    <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedProduct.status)}`}>
                      {selectedProduct.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Stock Level</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.stockLevel} units</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Price</label>
                    <p className="text-lg font-semibold text-gray-900">₹{selectedProduct.price}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Cost</label>
                    <p className="text-lg font-semibold text-gray-900">₹{selectedProduct.cost}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">SKU</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Supplier</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.supplier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Weight/Size</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.weight}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(selectedProduct.expiryDate)}</p>
                  </div>
                </div>
              </div>
              
              {selectedProduct.description && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                  <p className="text-gray-900">{selectedProduct.description}</p>
                </div>
              )}

              {/* QR Code Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-500 mb-3">Item QR Code</label>
                <div className="flex flex-col items-center gap-3">
                  {selectedProduct.qrCode ? (
                    <>
                      <img src={selectedProduct.qrCode} alt="QR" className="w-40 h-40 object-contain border rounded-md p-2 bg-white" />
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = selectedProduct.qrCode;
                          a.download = `${selectedProduct.name || 'item'}-qr.png`;
                          a.click();
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >Download QR</button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">QR code not available (added before QR feature). Re-save item to generate.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* QR Modal */}
      {showQRModal && qrModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><QrCode className="h-5 w-5"/> QR Code</h3>
              <button onClick={() => { setShowQRModal(false); setQrModalProduct(null); }} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 truncate max-w-[220px]" title={qrModalProduct.name}>{qrModalProduct.name}</p>
                <p className="text-xs text-gray-500">SKU: {qrModalProduct.sku || 'N/A'}</p>
              </div>
              {qrModalProduct.qrCode ? (
                <img src={qrModalProduct.qrCode} alt="QR Code" className="w-56 h-56 object-contain border rounded-lg p-2 bg-white" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center border rounded-lg bg-gray-50">
                  <span className="text-xs text-gray-500">{qrGenerating ? 'Generating...' : 'No QR yet'}</span>
                </div>
              )}
              <div className="flex w-full gap-2">
                {!qrModalProduct.qrCode && (
                  <button
                    onClick={() => generateQR(qrModalProduct)}
                    disabled={qrGenerating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                  >{qrGenerating ? 'Generating...' : 'Generate'}</button>
                )}
                {qrModalProduct.qrCode && (
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = qrModalProduct.qrCode;
                      a.download = `${qrModalProduct.name || 'item'}-qr.png`;
                      a.click();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >Download</button>
                )}
                <button
                  onClick={() => { setShowQRModal(false); setQrModalProduct(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >Close</button>
              </div>
              <p className="text-[10px] text-gray-400 text-center">QR encodes a JSON payload with product id for quick lookup.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
