import React, { useState } from 'react';
import { LayoutDashboard, Package, Users, ShoppingCart, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Orders from './components/Orders';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Trigger custom notification alerts
  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setTab={setActiveTab} triggerToast={triggerToast} />;
      case 'products':
        return <Products triggerToast={triggerToast} />;
      case 'customers':
        return <Customers triggerToast={triggerToast} />;
      case 'orders':
        return <Orders triggerToast={triggerToast} />;
      default:
        return <Dashboard setTab={setActiveTab} triggerToast={triggerToast} />;
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Operational Analytics';
      case 'products': return 'Inventory & Catalog';
      case 'customers': return 'Customer Database';
      case 'orders': return 'Sales Orders & Invoicing';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Sidebar Hamburger Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 1001,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: '#fff',
          padding: '0.5rem',
          cursor: 'pointer',
          display: 'none' /* hidden by default, shown in CSS on mobile */
        }}
        className="mobile-toggle"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Package size={28} style={{ color: 'var(--color-accent)' }} />
          <span>ORDER MANAGENT</span>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => { setActiveTab('products'); setSidebarOpen(false); }}
          >
            <Package size={18} />
            <span>Products</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customers'); setSidebarOpen(false); }}
          >
            <Users size={18} />
            <span>Customers</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setSidebarOpen(false); }}
          >
            <ShoppingCart size={18} />
            <span>Orders</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Order Managent OS v1.0.0
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>{getHeaderTitle()}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Real-time inventory and client data management console.
            </p>
          </div>
          <div className="header-time">
            Local Node: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>

        {/* Dynamic Panel Content */}
        {renderContent()}
      </main>

      {/* Toast Notifications Stack */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Embedded Mobile CSS Toggle Fix */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle {
            display: block !important;
          }
          .main-header {
            margin-top: 2.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
