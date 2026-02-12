import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Building2, Car, CarFront, Package, Receipt, FileText, Users, TrendingUp, Activity, ArrowRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import '../components/ui.css';
import './Dashboard.css';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState({ showrooms: [], counts: {}, revenue: {}, recentTransactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api
      .get('/stats/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading dashboard...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const { counts = {}, revenue = {}, recentTransactions = [] } = data;
  const revenueChartData = [
    { name: 'Daily', value: revenue.daily ?? 0 },
    { name: 'Weekly', value: revenue.weekly ?? 0 },
    { name: 'Monthly', value: revenue.monthly ?? 0 },
  ];

  return (
    <div className={`dashboard ${!isAdmin ? 'dashboard--controller' : 'dashboard--admin'}`}>
      {isAdmin ? (
        <>
          <div className="page-header">
            <h1 className="page-title"><LayoutDashboard size={28} className="page-title-icon" /> Dashboard</h1>
            <p className="page-subtitle">Overview of showrooms, revenue, and operations.</p>
          </div>

          <div className="admin-stats">
            <Link to="/car-account" className="admin-stat">
              <TrendingUp size={20} className="admin-stat-icon" />
              <span className="admin-stat-label">Total revenue</span>
              <span className="admin-stat-value">PKR {(counts.totalCommission ?? 0).toLocaleString()}</span>
            </Link>
            <Link to="/car-account" className="admin-stat">
              <Package size={20} className="admin-stat-icon" />
              <span className="admin-stat-label">Cars sold</span>
              <span className="admin-stat-value">{counts.sales ?? 0}</span>
            </Link>
            <Link to="/showrooms" className="admin-stat">
              <Building2 size={20} className="admin-stat-icon" />
              <span className="admin-stat-label">Showrooms</span>
              <span className="admin-stat-value">{counts.showrooms ?? 0}</span>
            </Link>
            <Link to="/vehicles" className="admin-stat">
              <Car size={20} className="admin-stat-icon" />
              <span className="admin-stat-label">Inventory</span>
              <span className="admin-stat-value">{counts.vehicles ?? 0} <span className="admin-stat-meta">({counts.available ?? 0} available)</span></span>
            </Link>
            <Link to="/transactions" className="admin-stat">
              <Receipt size={20} className="admin-stat-icon" />
              <span className="admin-stat-label">Transactions</span>
              <span className="admin-stat-value">{counts.transactions ?? 0}</span>
            </Link>
          </div>

          <div className="admin-actions-bar">
            <Link to="/car-account/new" className="btn btn-primary" target="_blank">
              <FileText size={18} /> New delivery order
            </Link>
            <nav className="admin-links">
              <Link to="/car-account">Delivery orders</Link>
              <Link to="/transactions">Transactions</Link>
              <Link to="/showrooms">Showrooms</Link>
              <Link to="/vehicles">Inventory</Link>
              <Link to="/users">Users</Link>
            </nav>
          </div>

          {(revenue.daily !== undefined || revenue.weekly !== undefined || revenue.monthly !== undefined) && (
            <div className="admin-chart-wrap">
              <div className="admin-card admin-card--chart">
                <h2 className="admin-card-title">Commission</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={revenueChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`PKR ${Number(v).toLocaleString()}`, 'Commission']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
                    <Line type="monotone" dataKey="value" name="Commission" stroke="#fd0a0b" strokeWidth={2} dot={{ fill: '#fd0a0b', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {recentTransactions.length > 0 && (
            <div className="admin-card admin-card--full">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Recent delivery orders</h2>
                <div className="admin-card-actions">
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by receipt, vehicle, or purchaser..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <Link to="/car-account" className="admin-card-link">View all</Link>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Receipt / Date</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Purchaser</th>
                      <th>Amount</th>
                      <th>PDFs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions
                      .filter((t) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        const vehicleLabel = t.carAccount?.vehicle
                          ? `${t.carAccount.vehicle.make || ''} ${t.carAccount.vehicle.model || ''}`.trim()
                          : (t.make || t.model ? `${t.make || ''} ${t.model || ''}`.trim() : '');
                        const purchaserName = t.carAccount?.purchaserName ?? '';
                        const receiptNumber = t.receiptNumber || '';

                        return (
                          receiptNumber.toLowerCase().includes(query) ||
                          vehicleLabel.toLowerCase().includes(query) ||
                          purchaserName.toLowerCase().includes(query)
                        );
                      })
                      .map((t) => {
                        const vehicleLabel = t.carAccount?.vehicle
                          ? `${t.carAccount.vehicle.make || ''} ${t.carAccount.vehicle.model || ''}`.trim()
                          : (t.make || t.model ? `${t.make || ''} ${t.model || ''}`.trim() : '—');
                        const purchaserName = t.carAccount?.purchaserName ?? '—';
                        return (
                          <tr key={t._id}>
                            <td>
                              <strong>{t.receiptNumber || '—'}</strong>
                              <span className="admin-table-muted">{t.transactionDate ? format(new Date(t.transactionDate), 'PP') : ''}</span>
                            </td>
                            <td>{vehicleLabel || '—'}</td>
                            <td><span className={`admin-badge admin-badge--${t.type === 'sale' ? 'success' : 'muted'}`}>{t.type}</span></td>
                            <td>{purchaserName}</td>
                            <td>PKR {t.amount?.toLocaleString() ?? '0'}</td>
                            <td>{t.pdfCount ?? 0}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="ctrl">
          <div className="ctrl-bg" aria-hidden="true">
            <div className="ctrl-bg-gradient" />
            <div className="ctrl-bg-grid" />
            <div className="ctrl-bg-glow ctrl-bg-glow--1" />
            <div className="ctrl-bg-glow ctrl-bg-glow--2" />
          </div>
          <div className="ctrl-inner">
            <header className="ctrl-hero">
              <span className="ctrl-hero-badge">Showroom control</span>
              <h1 className="ctrl-hero-title">Your command center</h1>
              <p className="ctrl-hero-sub">Create contracts, manage inventory, and keep everything in one place.</p>
            </header>
            <div className="ctrl-actions">
              <Link to="/car-account/new" className="ctrl-card ctrl-card--primary ctrl-card--accent-a" target="_blank">
                <span className="ctrl-card-glow" aria-hidden="true" />
                <span className="ctrl-card-icon">
                  <FileText size={32} strokeWidth={1.75} />
                </span>
                <div className="ctrl-card-content">
                  <h2 className="ctrl-card-title">New Delivery Order</h2>
                  <p className="ctrl-card-desc">Create a sale contract with vehicle, seller & purchaser details.</p>
                  <span className="ctrl-card-cta">Create contract <ArrowRight size={18} /></span>
                </div>
              </Link>
              <Link to="/vehicles" className="ctrl-card ctrl-card--primary ctrl-card--accent-b">
                <span className="ctrl-card-glow" aria-hidden="true" />
                <span className="ctrl-card-icon">
                  <Car size={32} strokeWidth={1.75} />
                </span>
                <div className="ctrl-card-content">
                  <h2 className="ctrl-card-title">Inventory</h2>
                  <p className="ctrl-card-desc">Add vehicles, edit details, and manage your showroom stock.</p>
                  <span className="ctrl-card-cta">Manage stock <ArrowRight size={18} /></span>
                </div>
              </Link>
            </div>
            <div className="ctrl-stats">
              <Link to="/car-account" className="ctrl-stat">
                <span className="ctrl-stat-label">Delivery orders</span>
                <span className="ctrl-stat-value">{counts.sales ?? 0}</span>
                <span className="ctrl-stat-meta">Sale contracts</span>
              </Link>
              <Link to="/vehicles" className="ctrl-stat">
                <span className="ctrl-stat-label">Inventory</span>
                <span className="ctrl-stat-value">{counts.vehicles ?? 0}</span>
                <span className="ctrl-stat-meta">{counts.available ?? 0} available</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
