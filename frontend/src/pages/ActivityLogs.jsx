import React, { useState, useEffect } from 'react';
import { Activity, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './ActivityLogs.css';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterShowroom, setFilterShowroom] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchLogs = () => {
    const params = {};
    if (filterUser) params.userId = filterUser;
    if (filterAction) params.action = filterAction;
    if (filterShowroom) params.showroomId = filterShowroom;
    if (filterFrom) params.from = filterFrom;
    if (filterTo) params.to = filterTo;
    api.get('/activity-logs', { params })
      .then((res) => setLogs(res.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filterUser, filterAction, filterShowroom, filterFrom, filterTo]);

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {});
    api.get('/showrooms').then((res) => setShowrooms(res.data)).catch(() => {});
  }, []);

  const onResetConfirm = async () => {
    setConfirmReset(false);
    setResetting(true);
    setError('');
    try {
      await api.delete('/activity-logs');
      fetchLogs();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reset activity logs.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading activity logs...</div>;

  return (
    <div className="activity-logs-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title"><Activity size={28} className="page-title-icon" /> Activity Log</h1>
          <p className="page-subtitle">Track user activity: login, delivery order creation, transactions. Filter by user, date, action.</p>
        </div>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setConfirmReset(true)}
          disabled={resetting || logs.length === 0}
          title="Delete all activity logs"
        >
          <Trash2 size={18} /> Reset activity logs
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onResetConfirm}
        title="Reset activity logs"
        message="Are you sure you want to delete all activity logs? This cannot be undone."
        confirmText="Delete all"
        cancelText="Cancel"
        variant="danger"
      />

      <div className="activity-logs-filters card">
        <Filter size={18} />
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="activity-logs-select">
          <option value="">All users</option>
          {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
        </select>
        <select value={filterShowroom} onChange={(e) => setFilterShowroom(e.target.value)} className="activity-logs-select">
          <option value="">All showrooms</option>
          {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input type="text" value={filterAction} onChange={(e) => setFilterAction(e.target.value)} placeholder="Action filter" className="activity-logs-input" />
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="activity-logs-input" title="From date" />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="activity-logs-input" title="To date" />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Showroom</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="table-empty">No activity logs yet. Actions will appear here.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                    </td>
                    <td>{log.user?.name || '—'} ({log.user?.role || '—'})</td>
                    <td><span className="badge badge-muted">{log.action || '—'}</span></td>
                    <td>{log.entityType ? `${log.entityType}${log.entityId ? ` #${String(log.entityId).slice(-6)}` : ''}` : '—'}</td>
                    <td>{log.showroom?.name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
