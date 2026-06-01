import React, { useEffect, useState } from 'react';
import { Plus, Eye, Trash2, Search, X, Trash } from 'lucide-react';
import api from '../api';

export default function Orders({ triggerToast }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form state
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([]); // Array of { product_id, quantity, name, price, sku }
  const [currentItem, setCurrentItem] = useState({ product_id: '', quantity: 1 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, customersData, productsData] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      triggerToast(err.message || 'Failed to load order system data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    if (customers.length === 0) {
      return triggerToast('You must register at least one customer before creating orders.', 'error');
    }
    if (products.length === 0) {
      return triggerToast('You must add at least one product before creating orders.', 'error');
    }
    setNewOrderCustomer(customers[0].id.toString());
    setOrderItems([]);
    setCurrentItem({ product_id: products[0].id.toString(), quantity: 1 });
    setIsCreateOpen(true);
  };

  const openDetailModal = async (orderId) => {
    try {
      const details = await api.getOrder(orderId);
      setSelectedOrder(details);
      setIsDetailOpen(true);
    } catch (err) {
      triggerToast(err.message || 'Failed to fetch order details', 'error');
    }
  };

  const handleAddItem = () => {
    const pId = parseInt(currentItem.product_id, 10);
    const qty = parseInt(currentItem.quantity, 10);
    
    if (isNaN(pId)) return;
    if (isNaN(qty) || qty <= 0) {
      return triggerToast('Quantity must be greater than 0', 'error');
    }

    const matchedProduct = products.find(p => p.id === pId);
    if (!matchedProduct) return;

    // Check stock level first
    if (matchedProduct.quantity < qty) {
      return triggerToast(`Insufficient stock! Available in stock: ${matchedProduct.quantity}`, 'error');
    }

    // Check if product already added, if so merge quantity
    const existingIndex = orderItems.findIndex(item => item.product_id === pId);
    if (existingIndex > -1) {
      const newQty = orderItems[existingIndex].quantity + qty;
      if (matchedProduct.quantity < newQty) {
        return triggerToast(`Insufficient stock for merged items! Max available: ${matchedProduct.quantity}`, 'error');
      }
      const updated = [...orderItems];
      updated[existingIndex].quantity = newQty;
      setOrderItems(updated);
    } else {
      setOrderItems(prev => [
        ...prev,
        {
          product_id: pId,
          quantity: qty,
          name: matchedProduct.name,
          price: matchedProduct.price,
          sku: matchedProduct.sku
        }
      ]);
    }

    triggerToast('Product added to checkout cart', 'success');
  };

  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate dynamic cart total
  const cartTotal = orderItems.reduce((acc, curr) => {
    return acc + (parseFloat(curr.price) * curr.quantity);
  }, 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      return triggerToast('Please add at least one product to the order', 'error');
    }

    const payload = {
      customer_id: parseInt(newOrderCustomer, 10),
      items: orderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    };

    try {
      await api.createOrder(payload);
      triggerToast('Order placed successfully!', 'success');
      setIsCreateOpen(false);
      fetchData(); // Reload all data to refresh product stock levels
    } catch (err) {
      triggerToast(err.message || 'Failed to place order', 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm(`Are you sure you want to cancel order #${id}?\nCancelling this order will restock all products automatically.`)) {
      try {
        await api.deleteOrder(id);
        triggerToast('Order cancelled and stocks restored.', 'success');
        fetchData();
      } catch (err) {
        triggerToast(err.message || 'Failed to cancel order', 'error');
      }
    }
  };

  // Filter orders based on search (Customer name or order ID)
  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toString() === searchQuery
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
            placeholder="Search by Customer Name or Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Create Order
        </button>
      </div>

      {/* Orders Grid/Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading transactions...</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Order Date</th>
                  <th>Items Ordered</th>
                  <th>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const dateStr = new Date(order.created_at).toLocaleString();
                  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: '600' }}>#{order.id}</td>
                      <td style={{ fontWeight: '500' }}>{order.customer_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{dateStr}</td>
                      <td>{totalItems} items</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetailModal(order.id)} title="View Invoice Breakdown">
                            <Eye size={12} /> View Details
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteOrder(order.id)} title="Cancel Order & Restock">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No orders found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Place New Order</h2>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Customer Selector */}
                <div className="form-group">
                  <label className="form-label">Select Customer</label>
                  <select
                    className="form-select"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    required
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                {/* Add Item Panel */}
                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                    Select Products
                  </span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select
                        className="form-select"
                        value={currentItem.product_id}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, product_id: e.target.value }))}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ${Number(p.price).toFixed(2)} (Stock: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                    </div>

                    <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ height: '38px' }}>
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Order Cart list */}
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Cart Items ({orderItems.length})
                  </span>
                  
                  {orderItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                      Cart is empty. Add products above.
                    </div>
                  ) : (
                    <div className="order-items-list">
                      {orderItems.map((item, index) => (
                        <div key={index} className="order-item-row" style={{ padding: '0.5rem 0', borderBottom: index < orderItems.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block' }}>{item.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {item.sku} | Price: ${Number(item.price).toFixed(2)}</span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                            {item.quantity} x ${Number(item.price).toFixed(2)}
                          </span>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveItem(index)} style={{ padding: '0.25rem' }}>
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Total preview */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>Calculated Subtotal:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-success)' }}>
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={orderItems.length === 0}>
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Invoice Details Modal */}
      {isDetailOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Invoice Breakdown</h2>
              <button className="modal-close" onClick={() => setIsDetailOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div>
              {/* Order summary info */}
              <div className="detail-grid" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                <div className="detail-item">
                  <span className="detail-label">Invoice Reference</span>
                  <span className="detail-value" style={{ fontWeight: '700' }}>#{selectedOrder.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Customer</span>
                  <span className="detail-value">{selectedOrder.customer_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created Date</span>
                  <span className="detail-value">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Invoice Total</span>
                  <span className="detail-value" style={{ color: 'var(--color-success)', fontWeight: '700' }}>
                    ${Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="card" style={{ padding: 0, marginBottom: '1rem' }}>
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Price at Purchase</th>
                      <th>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: '500' }}>{item.product_name}</td>
                        <td><code>{item.sku}</code></td>
                        <td>${Number(item.price_at_order).toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          ${(Number(item.price_at_order) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
