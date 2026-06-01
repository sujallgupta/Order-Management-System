import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import api from '../api';

export default function Products({ triggerToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentProductId, setCurrentProductId] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: ''
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      triggerToast(err.message || 'Failed to load products list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', sku: '', price: '', quantity: '0' });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setModalMode('edit');
    setCurrentProductId(prod.id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      price: prod.price.toString(),
      quantity: prod.quantity.toString()
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Front-end validation
    if (!formData.name.trim()) {
      return triggerToast('Product name is required', 'error');
    }
    if (!formData.sku.trim()) {
      return triggerToast('Product SKU/code is required', 'error');
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return triggerToast('Price must be a positive number', 'error');
    }
    const quantityNum = parseInt(formData.quantity, 10);
    if (isNaN(quantityNum) || quantityNum < 0) {
      return triggerToast('Quantity in stock cannot be negative', 'error');
    }

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      price: priceNum,
      quantity: quantityNum
    };

    try {
      if (modalMode === 'add') {
        await api.createProduct(payload);
        triggerToast('Product added successfully!', 'success');
      } else {
        await api.updateProduct(currentProductId, payload);
        triggerToast('Product updated successfully!', 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the product "${name}"?`)) {
      try {
        await api.deleteProduct(id);
        triggerToast('Product deleted successfully', 'success');
        fetchProducts();
      } catch (err) {
        triggerToast(err.message || 'Failed to delete product', 'error');
      }
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Action Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by Name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Catalog Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading catalog...</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU / Code</th>
                  <th>Price</th>
                  <th>Stock Quantity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => {
                  let statusBadge = <span className="badge success">In Stock</span>;
                  if (prod.quantity === 0) {
                    statusBadge = <span className="badge danger">Out of Stock</span>;
                  } else if (prod.quantity < 10) {
                    statusBadge = <span className="badge warning">Low Stock</span>;
                  }
                  
                  return (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: '500' }}>{prod.name}</td>
                      <td>
                        <code style={{ background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {prod.sku}
                        </code>
                      </td>
                      <td>${Number(prod.price).toFixed(2)}</td>
                      <td>{prod.quantity} units</td>
                      <td>{statusBadge}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(prod)} title="Edit Details">
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(prod.id, prod.name)} title="Delete Product">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No products found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'Add New Product' : 'Edit Product Details'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Mechanical Keyboard"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Unique Code</label>
                  <input
                    type="text"
                    name="sku"
                    className="form-input"
                    placeholder="e.g. SKU-KEY-004"
                    value={formData.sku}
                    onChange={handleInputChange}
                    disabled={modalMode === 'edit'} // SKU cannot be edited to preserve identity easily
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Unit Price ($)</label>
                    <input
                      type="number"
                      name="price"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      placeholder="99.99"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Add Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
