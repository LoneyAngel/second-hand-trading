import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, ReactNode } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Users from './pages/Users';
import Orders from './pages/Orders';
import './App.css';

const menuItems = [
  { key: '/dashboard', label: '数据概览', icon: '📊' },
  { key: '/products', label: '商品管理', icon: '📦' },
  { key: '/users', label: '用户管理', icon: '👥' },
  { key: '/orders', label: '订单管理', icon: '📋' },
];

function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🔄</span>
          {!collapsed && <span className="logo-text">管理后台</span>}
        </div>
        <nav className="menu">
          {menuItems.map((item) => (
            <div
              key={item.key}
              className={`menu-item ${location.pathname === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <span className="menu-icon">{item.icon}</span>
              {!collapsed && <span className="menu-label">{item.label}</span>}
            </div>
          ))}
        </nav>
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </aside>

      <div className="main">
        <header className="header">
          <div className="header-title">
            {menuItems.find((m) => m.key === location.pathname)?.label || '管理后台'}
          </div>
          <div className="header-right">
            <span className="admin-name">{adminUser?.nickname || '管理员'}</span>
            <button className="logout-btn" onClick={handleLogout}>
              退出
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Layout>
                <Products />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Layout>
                <Orders />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
