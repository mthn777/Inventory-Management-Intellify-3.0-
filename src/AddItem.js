import React, { useState, useRef } from 'react';
import { X, Plus, ChevronDown, Upload, RotateCcw } from 'lucide-react';


import { collection, addDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
// Removed unused named import { firebase } which doesn't exist in confige. We only need db.
import { db } from './firebaseConfig';



function AddItem({ onClose, onAddItem }) {

  const [formData, setFormData] = useState({
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
    sellingPrice: '',
    additionalInfo: '',
  });

  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  // const handleSubmit = (e) => {
  //   e.preventDefault();

  //   // Validate required fields
  //   if (!formData.productName || !formData.sku || !formData.stockLevel || !formData.expiryDate || !formData.price) {
  //     alert('Please fill in all required fields: Product Name, SKU, Stock Level, Expiry Date, and Price');
  //     return;
  //   }

  //   if (onAddItem) {
  //     onAddItem(formData);
  //     // Don't close modal here - let the parent component handle it after successful addition
  //   }
  // };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.productName || !formData.sku || !formData.stockLevel || !formData.expiryDate || !formData.price) {
      alert('Please fill in all required fields: Product Name, SKU, Stock Level, Expiry Date, and Price (₹)');
      return;
    }

    try {
      // Build QR payload (can be extended). Use doc ID after creation so first create minimal then update.
      const basePayload = {
        productName: formData.productName,
        sku: formData.sku,
        stockLevel: Number(formData.stockLevel),
        expiryDate: formData.expiryDate,
        brand: formData.brand,
        category: formData.category,
        quantity: formData.quantity,
        unitOfMeasure: formData.unitOfMeasure,
        description: formData.description,
        price: Number(formData.price),
        sellingPrice: Number(formData.sellingPrice),
        additionalInfo: formData.additionalInfo,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, "inventory"), basePayload);

      // Generate QR code data URL with product id so scanner can fetch it.
      const qrData = JSON.stringify({ type: 'inventory_item', id: docRef.id, sku: basePayload.sku });
      try {
        const dataUrl = await QRCode.toDataURL(qrData, { margin: 1, scale: 4 });
        // Update document with qrCode field (store small data URL string)
        // Avoid import of updateDoc here to keep minimal; simple workaround: not updating if failure.
        // Lazy import to reduce bundle size if tree-shaking doesn't remove.
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'inventory', docRef.id), { qrCode: dataUrl, qrPayload: qrData });
      } catch (qrErr) {
        console.warn('QR generation failed', qrErr);
      }

      alert("Item added successfully!");

      if (onAddItem) {
        onAddItem({
          ...formData,
          id: docRef.id,
          qrCode: undefined
        });
      }

      // Reset form after success
      setFormData({
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
        sellingPrice: '',
        additionalInfo: '',
      });

      onClose();

    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to add item!");
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Add New Item</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column - Product Details */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Product Details
              </h4>

                             {/* Product Name and SKU Row */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Product name
                   </label>
                   <input
                     type="text"
                     name="productName"
                     value={formData.productName}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Enter product name"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     SKU
                   </label>
                   <input
                     type="text"
                     name="sku"
                     value={formData.sku}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Enter SKU"
                     required
                   />
                 </div>
               </div>

              {/* Stock Level and Expiry Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock level
                  </label>
                  <input
                    type="number"
                    name="stockLevel"
                    value={formData.stockLevel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter stock level"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product description"
                />
              </div>

              {/* Brand and Category Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Meat">Meat</option>
                    <option value="Poultry">Poultry</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Grains">Grains</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Canned Goods">Canned Goods</option>
                    <option value="Frozen Foods">Frozen Foods</option>
                    <option value="Condiments">Condiments</option>
                    <option value="Spices">Spices</option>
                    <option value="Nuts">Nuts</option>
                    <option value="Dried Fruits">Dried Fruits</option>
                    <option value="Organic">Organic</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Quantity and Unit of Measure Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (in which)
                  </label>
                  <input
                    type="text"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    name="unitOfMeasure"
                    value={formData.unitOfMeasure}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., kg, pieces"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Pricing, Additional Information and Actions */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Pricing, Additional Information & Actions
              </h4>

                             {/* Cost Price and Selling Price Row */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Cost Price
                   </label>
                   <input
                     type="number"
                     name="price"
                     value={formData.price}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="0.00"
                     min="0"
                     step="0.01"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Selling Price
                   </label>
                   <input
                     type="number"
                     name="sellingPrice"
                     value={formData.sellingPrice}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="0.00"
                     min="0"
                     step="0.01"
                     required
                   />
                 </div>
               </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional information (Optional)
                </label>
                <input
                  type="text"
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter additional information"
                />
              </div>


              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddItem;