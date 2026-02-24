import React, { useState, useEffect } from 'react';
import { FileDown, CheckCircle, Clock, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { agentCommissionsService } from '../api/agentCommissionsService';
import { useAuth } from '../context/AuthContext';
import '../components/ui.css';
import './CarAccountList.css'; // Reusing some list styles

export default function AgentCommissions() {
    const { isAdmin } = useAuth();
    const [list, setList] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(null);

    const fetchList = () => {
        setLoading(true);
        setError('');
        const filters = {};
        if (filterUser) filters.userId = filterUser;
        if (filterStatus) filters.status = filterStatus;
        if (filterDateFrom) filters.dateFrom = filterDateFrom;
        if (filterDateTo) filters.dateTo = filterDateTo;

        agentCommissionsService.getAll(filters)
            .then((res) => setList(res.data))
            .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load commissions'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchList();
    }, [filterUser, filterStatus, filterDateFrom, filterDateTo]);

    useEffect(() => {
        if (!isAdmin) return;
        api.get('/users')
            .then((res) => setUsers(res.data))
            .catch((e) => console.error('Failed to load users:', e));
    }, [isAdmin]);

    const handleExport = async () => {
        setExportLoading(true);
        try {
            const filters = {};
            if (filterUser) filters.userId = filterUser;
            if (filterStatus) filters.status = filterStatus;
            if (filterDateFrom) filters.dateFrom = filterDateFrom;
            if (filterDateTo) filters.dateTo = filterDateTo;

            const res = await agentCommissionsService.export(filters);
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'agent_commissions.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setError('Export failed.');
        } finally {
            setExportLoading(false);
        }
    };

    const handlePay = async (id) => {
        if (!window.confirm('Mark this commission as paid?')) return;
        setPayLoading(id);
        try {
            await agentCommissionsService.markAsPaid(id);
            fetchList();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update status.');
        } finally {
            setPayLoading(null);
        }
    };

    const totalCommission = list.reduce((acc, c) => acc + c.amount, 0);

    return (
        <div className="container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Agent Commissions</h1>
                    <p className="page-subtitle">Track and manage 0.5% auto-commissions for Delivery Orders.</p>
                </div>
                <div className="page-actions">
                    {isAdmin && (
                        <button onClick={handleExport} className="btn btn-outline" disabled={exportLoading}>
                            <FileDown size={18} />
                            {exportLoading ? 'Exporting...' : 'Export Excel'}
                        </button>
                    )}
                </div>
            </div>

            <div className="car-account-list-filters card">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                    {isAdmin && (
                        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="transactions-filter-select">
                            <option value="">All Agents</option>
                            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                    )}
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="transactions-filter-select">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-sm text-gray-500">From:</span>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="transactions-filter-select" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-sm text-gray-500">To:</span>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="transactions-filter-select" />
                    </div>
                    {(filterUser || filterStatus || filterDateFrom || filterDateTo) && (
                        <button
                            onClick={() => {
                                setFilterUser('');
                                setFilterStatus('');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                            }}
                            className="btn btn-ghost btn-sm"
                        >
                            <X size={16} /> Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-sm font-medium text-gray-600">Total Commissions in view:</span>
                    <span className="text-xl font-bold text-primary">Rs. {totalCommission.toLocaleString()}</span>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Agent</th>
                            <th>Receipt No</th>
                            <th>Vehicle</th>
                            <th>Total Amount</th>
                            <th>Commission (0.5%)</th>
                            <th>Status</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={isAdmin ? 8 : 7} className="table-loading">Loading...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={isAdmin ? 8 : 7} className="table-empty">No commissions found.</td></tr>
                        ) : (
                            list.map((item) => (
                                <tr key={item._id}>
                                    <td>{format(new Date(item.date), 'dd/MM/yyyy')}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-gray-400" />
                                            <span className="font-medium">{item.user?.name}</span>
                                        </div>
                                    </td>
                                    <td>{item.carAccount?.receiptNumber || '-'}</td>
                                    <td className="font-medium">
                                        {item.carAccount?.make ? `${item.carAccount.make} ${item.carAccount.model}` : 'N/A'}
                                    </td>
                                    <td>Rs. {item.baseAmount.toLocaleString()}</td>
                                    <td className="text-primary font-bold">Rs. {item.amount.toLocaleString()}</td>
                                    <td>
                                        {item.status === 'paid' ? (
                                            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                                                <CheckCircle size={12} /> PAID
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                                                <Clock size={12} /> PENDING
                                            </span>
                                        )}
                                    </td>
                                    {isAdmin && (
                                        <td>
                                            {item.status === 'pending' && (
                                                <button
                                                    onClick={() => handlePay(item._id)}
                                                    className="btn btn-sm btn-ghost text-success"
                                                    disabled={payLoading === item._id}
                                                    title="Mark as Paid"
                                                >
                                                    {payLoading === item._id ? '...' : <CheckCircle size={18} />}
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
