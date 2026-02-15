import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Car, Receipt, FileText, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon"><Car size={22} /></span>
          <span>Showroom</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/delivery-orders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <FileText size={18} /> Delivery Orders
          </NavLink>
          <NavLink to="/token-receipts" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <FileText size={18} /> Token Receipt
          </NavLink>
          <NavLink to="/purchase-orders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <FileText size={18} /> Purchase Orders
          </NavLink>
          {isAdmin && (
            <NavLink to="/transactions" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <Receipt size={18} /> Transactions
            </NavLink>
          )}
          <NavLink to="/vehicles" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Car size={18} /> Inventory
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/showrooms" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <Building2 size={18} /> Showrooms
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <Users size={18} /> Users
              </NavLink>
              <NavLink to="/activity-logs" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <Activity size={18} /> Activity Log
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role === 'admin' ? 'Admin' : user?.showroom?.name || 'Controller'}</span>
          </div>
          <button type="button" onClick={handleLogout} className="btn-logout">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
