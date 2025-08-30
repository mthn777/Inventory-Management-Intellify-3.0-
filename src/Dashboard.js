import React, { useState, useEffect, useRef } from 'react';
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
  Calendar,
  TrendingUp,
  DollarSign,
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
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './confige';
import Analytics from './Analytics';
import Products from './Products';
import AddItem from './AddItem';

function Dashboard({ onLogout, userData }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);

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

  // Fetch products from Firebase on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

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
          expiryDate: doc.data().expiryDate,
          brand: doc.data().brand,
          quantity: doc.data().quantity,
          unitOfMeasure: doc.data().unitOfMeasure,
          description: doc.data().description,
          additionalInfo: doc.data().additionalInfo,
          createdAt: doc.data().createdAt
        });
      });
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products: ", error);
      alert("Failed to fetch products!");
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

  // Handle edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteDoc(doc(db, "inventory", product.id));
        setProducts(products.filter(p => p.id !== product.id));
        alert('Product deleted successfully!');
      } catch (error) {
        console.error("Error deleting product: ", error);
        alert("Failed to delete product!");
      }
    }
  };

  // Handle updating product
  const handleUpdateProduct = async () => {
    if (!selectedProduct.name || !selectedProduct.stockLevel || !selectedProduct.expiryDate) {
      alert('Please fill in all required fields');
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
        price: Number(selectedProduct.price),
        additionalInfo: selectedProduct.additionalInfo,
        updatedAt: new Date()
      });

      setProducts(products.map(p =>
        p.id === selectedProduct.id ? selectedProduct : p
      ));

      setShowEditModal(false);
      setSelectedProduct(null);
      alert('Product updated successfully!');
    } catch (error) {
      console.error("Error updating product: ", error);
      alert("Failed to update product!");
    }
  };

  // Handle adding new item
  const handleAddItem = (formData) => {
    if (!formData.productName || !formData.sku || !formData.stockLevel || !formData.expiryDate || !formData.price) {
      alert('Please fill in all required fields');
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
    alert(`Product "${itemToAdd.name}" added successfully! The product is now visible in the products table.`);
  };

  const stats = [
    { title: 'Total Revenue', value: '$45,231', change: '+20.1%', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Total Orders', value: '2,350', change: '+180.1%', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Products Sold', value: '12,234', change: '+19%', icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'Active Products', value: '573', change: '+201', icon: Package, color: 'text-orange-600', bgColor: 'bg-orange-100' }
  ];

  const recentActivities = [
    { user: 'John Doe', action: 'restocked', product: 'Fresh Organic Bananas', time: '2 hours ago', avatar: 'JD' },
    { user: 'Sarah Wilson', action: 'added new product', product: 'Whole Grain Bread', time: '4 hours ago', avatar: 'SW' },
    { user: 'Mike Johnson', action: 'updated inventory', product: 'Organic Milk 2L', time: '6 hours ago', avatar: 'MJ' },
    { user: 'Emily Brown', action: 'marked out of stock', product: 'Fresh Tomatoes', time: '1 day ago', avatar: 'EB' }
  ];

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
                          <div className="text-xs text-gray-500">{product.sku || 'N/A'} | {product.category} | {product.status} | Stock: {product.stockLevel} | ${product.price ? product.price.toFixed(2) : 'N/A'}</div>
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
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

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
                { id: 'calendar', label: 'Calendar', icon: Calendar },
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

              {/* Charts and Activity Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Chart Placeholder */}
                <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>Last 3 months</option>
                      </select>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm sm:text-base">Chart visualization would go here</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">{activity.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-900">
                            <span className="font-medium">{activity.user}</span> {activity.action}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{activity.product}</p>
                          <p className="text-xs text-gray-400">{activity.time}</p>
                        </div>
                      </div>
                    ))}
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
                                SKU: {product.sku || 'N/A'} | Price: ${product.price ? product.price.toFixed(2) : 'N/A'}
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
                                ${product.price ? product.price.toFixed(2) : 'N/A'}
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
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reports & Documents</h3>
              <p className="text-gray-500 text-sm sm:text-base">Generate and view various reports and documents.</p>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar & Events</h3>
              <p className="text-gray-500 text-sm sm:text-base">Schedule and manage your events and meetings.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-8 sm:py-12">
              <Settings className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Settings & Preferences</h3>
              <p className="text-gray-500 text-sm sm:text-base">Configure your account settings and preferences.</p>
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
                  <div className="space-y-4">
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
                      <label className="block text-sm font-medium text-gray-500 mb-1">Price</label>
                      <p className="text-base sm:text-lg font-semibold text-gray-900">${selectedProduct.price ? selectedProduct.price.toFixed(2) : 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Quantity & Unit</label>
                      <p className="text-base text-gray-900">{selectedProduct.quantity || 'N/A'} {selectedProduct.unitOfMeasure || ''}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                      <p className="text-base text-gray-900">{selectedProduct.description || 'No description available'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                      <p className="text-base sm:text-lg font-semibold text-gray-900">{formatDate(selectedProduct.expiryDate)}</p>
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
                        value={selectedProduct.category}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="Fruits">Fruits</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Meat">Meat</option>
                        <option value="Grains">Grains</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Snacks">Snacks</option>
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

                    {/* Status */}
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
  );
}

export default Dashboard; 