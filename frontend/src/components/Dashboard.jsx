import React, { useEffect, useState } from 'react';
import { Package, Users, ShoppingCart, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import api from '../api';

export default function Dashboard({ setTab, triggerToast }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      triggerToast(err.message || 'Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading overview metrics...</div>;
  }

  if (!summary) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-danger)' }}>Error loading dashboard data.</div>;
  }

  // Calculate SVG Chart dimensions
  const maxStockVal = Math.max(...(summary.low_stock_products || []).map(p => p.quantity), 10);
  const chartHeight = 240;
  const chartWidth = 500;
  const barPadding = 12;
  const lowStockList = summary.low_stock_products || [];

  return (
    <div>
      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="card stat-card" style={{ '--accent-gradient': 'linear-gradient(to bottom, #3b82f6, #00d2ff)' }}>
          <div className="stat-header">
            <span>Total Products</span>
            <Package size={20} className="text-muted" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="stat-value">{summary.total_products}</div>
          <div className="stat-desc">Active in catalog</div>
        </div>

        <div className="card stat-card" style={{ '--accent-gradient': 'linear-gradient(to bottom, #10b981, #059669)' }}>
          <div className="stat-header">
            <span>Total Customers</span>
            <Users size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="stat-value">{summary.total_customers}</div>
          <div className="stat-desc">Registered users</div>
        </div>

        <div className="card stat-card" style={{ '--accent-gradient': 'linear-gradient(to bottom, #a855f7, #7c3aed)' }}>
          <div className="stat-header">
            <span>Total Orders</span>
            <ShoppingCart size={20} style={{ color: '#a855f7' }} />
          </div>
          <div className="stat-value">{summary.total_orders}</div>
          <div className="stat-desc">Processed transactions</div>
        </div>

        <div className="card stat-card" style={{ '--accent-gradient': 'linear-gradient(to bottom, #eab308, #ca8a04)' }}>
          <div className="stat-header">
            <span>Total Sales Value</span>
            <DollarSign size={20} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div className="stat-value">${Number(summary.total_sales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-desc">Gross revenue generated</div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        {/* Low Stock Product Visualization Chart */}
        <div className="card">
          <div className="card-title">
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
            <span>Low Stock Alert Levels</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {lowStockList.length === 0 ? (
              <div style={{ padding: '3rem 0', color: 'var(--text-secondary)', textAlign: 'center' }}>
                <span className="badge success" style={{ marginBottom: '1rem' }}>Perfect Condition</span>
                <p>No products are currently low on stock (&lt; 10 units).</p>
              </div>
            ) : (
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  The following items have stock levels below critical thresholds:
                </p>
                {/* SVG horizontal bar chart */}
                <div style={{ position: 'relative', width: '100%', height: `${lowStockList.length * 48 + 30}px` }}>
                  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#eab308" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    {lowStockList.map((prod, index) => {
                      const percentage = Math.min((prod.quantity / 10) * 100, 100);
                      const yPos = index * 48 + 10;
                      return (
                        <g key={prod.id}>
                          {/* Label */}
                          <text x="0" y={yPos + 16} fill="var(--text-primary)" fontSize="13" fontWeight="500">
                            {prod.name.length > 22 ? `${prod.name.substring(0, 22)}...` : prod.name}
                          </text>
                          {/* SKU */}
                          <text x="0" y={yPos + 30} fill="var(--text-muted)" fontSize="10">
                            {prod.sku}
                          </text>
                          {/* Bar background */}
                          <rect x="180" y={yPos + 8} width="55%" height="14" rx="7" fill="rgba(255,255,255,0.05)" />
                          {/* Active Bar */}
                          <rect 
                            x="180" 
                            y={yPos + 8} 
                            width={`${0.55 * percentage}%`} 
                            height="14" 
                            rx="7" 
                            fill="url(#barGrad)" 
                          />
                          {/* Quantity value badge */}
                          <text x="75%" y={yPos + 20} fill={prod.quantity <= 3 ? 'var(--color-danger)' : 'var(--color-warning)'} fontSize="12" fontWeight="600" textAnchor="start">
                            {prod.quantity} units left
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Low stock list details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card-title">
            <span>Quick Management</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setTab('orders')} style={{ width: '100%' }}>
              <ShoppingCart size={16} /> Place New Order
            </button>
            <button className="btn btn-secondary" onClick={() => setTab('products')} style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Catalog Management</span>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => setTab('customers')} style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Customer Registry</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Low Stock Products</span>
              <span className="badge warning">{summary.low_stock_count} Items</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {lowStockList.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.sku}</div>
                  </div>
                  <span className={`badge ${p.quantity <= 3 ? 'danger' : 'warning'}`}>{p.quantity} left</span>
                </div>
              ))}
              {lowStockList.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No low stock alerts.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
