import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('demand');

  // Sample data - in a real app, this would come from an API
  const [analyticsData, setAnalyticsData] = useState({
    products: [
      {
        id: 1,
        name: 'Fresh Organic Bananas',
        category: 'Fruits',
        demand: 1250,
        supply: 1500,
        price: 2.99,
        cost: 1.50,
        sold: 1200,
        returned: 25,
        profit: 1788,
        loss: 74.75,
        netProfit: 1713.25,
        demandTrend: 'up',
        profitMargin: 47.8
      },
      {
        id: 2,
        name: 'Whole Grain Bread',
        category: 'Bakery',
        demand: 890,
        supply: 800,
        price: 3.49,
        cost: 2.20,
        sold: 800,
        returned: 15,
        profit: 1032,
        loss: 52.35,
        netProfit: 979.65,
        demandTrend: 'up',
        profitMargin: 36.9
      },
      {
        id: 3,
        name: 'Organic Milk 2L',
        category: 'Dairy',
        demand: 650,
        supply: 700,
        price: 4.99,
        cost: 3.50,
        sold: 650,
        returned: 8,
        profit: 968.50,
        loss: 28.00,
        netProfit: 940.50,
        demandTrend: 'stable',
        profitMargin: 29.9
      },
      {
        id: 4,
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        demand: 420,
        supply: 500,
        price: 1.99,
        cost: 1.20,
        sold: 420,
        returned: 12,
        profit: 331.80,
        loss: 14.40,
        netProfit: 317.40,
        demandTrend: 'down',
        profitMargin: 39.7
      },
      {
        id: 5,
        name: 'Premium Coffee Beans',
        category: 'Beverages',
        demand: 1800,
        supply: 1600,
        price: 12.99,
        cost: 8.50,
        sold: 1600,
        returned: 5,
        profit: 7184,
        loss: 64.95,
        netProfit: 7119.05,
        demandTrend: 'up',
        profitMargin: 34.6
      },
      {
        id: 6,
        name: 'Organic Eggs (12pk)',
        category: 'Dairy',
        demand: 750,
        supply: 800,
        price: 5.99,
        cost: 4.20,
        sold: 750,
        returned: 3,
        profit: 1342.50,
        loss: 12.60,
        netProfit: 1329.90,
        demandTrend: 'up',
        profitMargin: 29.9
      }
    ],
    summary: {
      totalRevenue: 12547.80,
      totalCost: 8750.00,
      totalProfit: 3797.80,
      totalLoss: 247.05,
      netProfit: 3550.75,
      profitMargin: 28.3,
      totalDemand: 5760,
      totalSupply: 5900,
      totalSold: 5420,
      totalReturned: 68
    }
  });

  // Filter and sort products
  const filteredProducts = analyticsData.products
    .filter(product => selectedCategory === 'all' || product.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'demand':
          return b.demand - a.demand;
        case 'profit':
          return b.netProfit - a.netProfit;
        case 'margin':
          return b.profitMargin - a.profitMargin;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.demand - a.demand;
      }
    });

  // Calculate demand satisfaction rate
  const getDemandSatisfaction = (demand, supply) => {
    const rate = (supply / demand) * 100;
    if (rate >= 100) return { rate: 100, status: 'Fully Satisfied', color: 'text-green-600' };
    if (rate >= 80) return { rate: rate.toFixed(1), status: 'Well Satisfied', color: 'text-blue-600' };
    if (rate >= 60) return { rate: rate.toFixed(1), status: 'Moderately Satisfied', color: 'text-yellow-600' };
    return { rate: rate.toFixed(1), status: 'Poorly Satisfied', color: 'text-red-600' };
  };

  // Get trend icon and color
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return { icon: ArrowUp, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'down':
        return { icon: ArrowDown, color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
  };

  // Get profit/loss status
  const getProfitStatus = (profit, loss) => {
    const netProfit = profit - loss;
    if (netProfit > 0) return { status: 'Profitable', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (netProfit < 0) return { status: 'Loss Making', color: 'text-red-600', bgColor: 'bg-red-100' };
    return { status: 'Break Even', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  };

  // Export data
  const exportData = () => {
    const csvContent = [
      ['Product Name', 'Category', 'Demand', 'Supply', 'Price', 'Cost', 'Sold', 'Returned', 'Profit', 'Loss', 'Net Profit', 'Profit Margin (%)'],
      ...filteredProducts.map(product => [
        product.name,
        product.category,
        product.demand,
        product.supply,
        product.price,
        product.cost,
        product.sold,
        product.returned,
        product.profit,
        product.loss,
        product.netProfit,
        product.profitMargin
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedPeriod}days.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Product demand analysis and profit/loss insights</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Beverages">Beverages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="demand">Highest Demand</option>
              <option value="profit">Highest Profit</option>
              <option value="margin">Best Margin</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.summary.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">+{analyticsData.summary.profitMargin}%</span>
            <span className="text-sm text-gray-500 ml-2">profit margin</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.summary.netProfit.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-blue-600">${analyticsData.summary.totalProfit.toLocaleString()}</span>
            <span className="text-sm text-gray-500 ml-2">gross profit</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Demand</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalDemand.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-purple-600">{analyticsData.summary.totalSold.toLocaleString()}</span>
            <span className="text-sm text-gray-500 ml-2">units sold</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Loss</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.summary.totalLoss.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-red-600">{analyticsData.summary.totalReturned}</span>
            <span className="text-sm text-gray-500 ml-2">returns</span>
          </div>
        </div>
      </div>

      {/* Products Analytics Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Product Demand & Profit Analysis</h3>
            <div className="text-sm text-gray-500">
              Showing {filteredProducts.length} products
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden">
          <div className="p-4 space-y-4">
            {filteredProducts.map((product) => {
              const demandSatisfaction = getDemandSatisfaction(product.demand, product.supply);
              const trendInfo = getTrendIcon(product.demandTrend);
              const profitStatus = getProfitStatus(product.profit, product.loss);
              
              return (
                <div key={product.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {product.category}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${profitStatus.bgColor} ${profitStatus.color}`}>
                          {profitStatus.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <div className={`p-1 rounded-full ${trendInfo.bgColor}`}>
                        <trendInfo.icon className={`h-4 w-4 ${trendInfo.color}`} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Demand:</span>
                      <span className="ml-1 font-medium text-gray-900">{product.demand}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Supply:</span>
                      <span className="ml-1 font-medium text-gray-900">{product.supply}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Satisfaction:</span>
                      <span className={`ml-1 font-medium ${demandSatisfaction.color}`}>
                        {demandSatisfaction.rate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Margin:</span>
                      <span className="ml-1 font-medium text-gray-900">{product.profitMargin}%</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Net Profit:</span>
                      <span className={`font-medium ${product.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${product.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
          </tr>
        </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const demandSatisfaction = getDemandSatisfaction(product.demand, product.supply);
                const trendInfo = getTrendIcon(product.demandTrend);
                const profitStatus = getProfitStatus(product.profit, product.loss);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.demand}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.supply}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${demandSatisfaction.color}`}>
                          {demandSatisfaction.rate}%
                        </span>
                        <span className="text-xs text-gray-500 ml-1">({demandSatisfaction.status})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${product.price}</div>
                      <div className="text-xs text-gray-500">Cost: ${product.cost}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">${product.profit.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-red-600">${product.loss.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${product.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${product.netProfit.toFixed(2)}
                        </span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${profitStatus.bgColor} ${profitStatus.color}`}>
                          {profitStatus.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.profitMargin}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full ${trendInfo.bgColor}`}>
                        <trendInfo.icon className={`h-4 w-4 ${trendInfo.color}`} />
                        <span className={`ml-1 text-xs font-medium ${trendInfo.color}`}>
                          {product.demandTrend === 'up' ? 'Rising' : product.demandTrend === 'down' ? 'Falling' : 'Stable'}
                        </span>
                      </div>
                    </td>
            </tr>
                );
              })}
        </tbody>
      </table>
        </div>
      </div>

      {/* Insights Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
          <div className="space-y-3">
            {filteredProducts
              .sort((a, b) => b.netProfit - a.netProfit)
              .slice(0, 3)
              .map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">${product.netProfit.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{product.profitMargin}% margin</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Demand Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Highest Demand</span>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {filteredProducts.sort((a, b) => b.demand - a.demand)[0]?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {filteredProducts.sort((a, b) => b.demand - a.demand)[0]?.demand} units
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Best Profit Margin</span>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {filteredProducts.sort((a, b) => b.profitMargin - a.profitMargin)[0]?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {filteredProducts.sort((a, b) => b.profitMargin - a.profitMargin)[0]?.profitMargin}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Supply Gap</span>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {filteredProducts.filter(p => p.demand > p.supply).length} products
                </div>
                <div className="text-sm text-gray-500">under-supplied</div>
              </div>
            </div>
          </div>
        </div>
      </div>

             {/* Chart Visualization */}
       <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand vs Supply Analysis</h3>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Demand vs Supply Chart */}
           <div className="space-y-4">
             <h4 className="font-medium text-gray-700">Product Demand vs Supply</h4>
             <div className="space-y-3">
               {filteredProducts.slice(0, 5).map((product) => {
                 const demandPercentage = (product.demand / Math.max(...filteredProducts.map(p => p.demand))) * 100;
                 const supplyPercentage = (product.supply / Math.max(...filteredProducts.map(p => p.demand))) * 100;
                 
                 return (
                   <div key={product.id} className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="font-medium text-gray-700">{product.name}</span>
                       <span className="text-gray-500">D: {product.demand} | S: {product.supply}</span>
                     </div>
                     <div className="flex space-x-2">
                       <div className="flex-1 bg-gray-200 rounded-full h-3">
                         <div 
                           className="bg-blue-500 h-3 rounded-full" 
                           style={{ width: `${demandPercentage}%` }}
                         ></div>
                       </div>
                       <div className="flex-1 bg-gray-200 rounded-full h-3">
                         <div 
                           className="bg-green-500 h-3 rounded-full" 
                           style={{ width: `${supplyPercentage}%` }}
                         ></div>
                       </div>
                     </div>
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>Demand</span>
                       <span>Supply</span>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>

           {/* Profit Margin Chart */}
           <div className="space-y-4">
             <h4 className="font-medium text-gray-700">Profit Margin Distribution</h4>
             <div className="space-y-3">
               {filteredProducts
                 .sort((a, b) => b.profitMargin - a.profitMargin)
                 .slice(0, 5)
                 .map((product) => (
                   <div key={product.id} className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="font-medium text-gray-700">{product.name}</span>
                       <span className="text-gray-500">{product.profitMargin}%</span>
                     </div>
                     <div className="bg-gray-200 rounded-full h-3">
                       <div 
                         className={`h-3 rounded-full ${
                           product.profitMargin >= 40 ? 'bg-green-500' : 
                           product.profitMargin >= 30 ? 'bg-blue-500' : 
                           product.profitMargin >= 20 ? 'bg-yellow-500' : 'bg-red-500'
                         }`}
                         style={{ width: `${product.profitMargin}%` }}
                       ></div>
                     </div>
                   </div>
                 ))}
             </div>
           </div>
         </div>
       </div>

       {/* Recommendations */}
       <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredProducts
             .filter(product => product.demand > product.supply)
             .slice(0, 3)
             .map((product) => (
               <div key={product.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                 <h4 className="font-medium text-blue-900 mb-2">Increase Supply</h4>
                 <p className="text-sm text-blue-700 mb-2">{product.name}</p>
                 <div className="text-xs text-blue-600">
                   Demand: {product.demand} | Supply: {product.supply} | Gap: {product.demand - product.supply}
                 </div>
               </div>
             ))}
           
           {filteredProducts
             .filter(product => product.profitMargin < 30)
             .slice(0, 3)
             .map((product) => (
               <div key={product.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                 <h4 className="font-medium text-yellow-900 mb-2">Review Pricing</h4>
                 <p className="text-sm text-yellow-700 mb-2">{product.name}</p>
                 <div className="text-xs text-yellow-600">
                   Current Margin: {product.profitMargin}% | Target: 30%+
                 </div>
               </div>
             ))}
           
           {filteredProducts
             .filter(product => product.demandTrend === 'down')
             .slice(0, 3)
             .map((product) => (
               <div key={product.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                 <h4 className="font-medium text-red-900 mb-2">Demand Declining</h4>
                 <p className="text-sm text-red-700 mb-2">{product.name}</p>
                 <div className="text-xs text-red-600">
                   Consider promotions or product updates
                 </div>
               </div>
             ))}
         </div>
       </div>
    </div>
  );
}

export default Analytics;
