import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { numberToWords, formatCnic } from '../api/utils';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './Transactions.css';

export default function Transactions() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterShowroom, setFilterShowroom] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [paymentRows, setPaymentRows] = useState([{ method: 'cash', amount: '', bankDetails: '', chequeNo: '', bankName: '', accountTitle: '', date: '' }]);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { purchaserName: '', purchaserCnic: '', purchaserPhone: '', purchaserAddress: '', amount: '', transactionDate: '', notes: '' },
  });

  const watchAmount = watch('amount');
  const totalReceived = paymentRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const balance = (Number(watchAmount) || 0) - totalReceived;

  const addPaymentRow = () => setPaymentRows((r) => [...r, { method: 'cash', amount: '', bankDetails: '', chequeNo: '', bankName: '', accountTitle: '', date: '' }]);
  const removePaymentRow = (i) => setPaymentRows((r) => r.filter((_, j) => j !== i));
  const updatePaymentRow = (i, field, value) => {
    setPaymentRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };

  const fetchTransactions = () => {
    const params = {};
    if (isAdmin && filterShowroom) params.showroomId = filterShowroom;
    api.get('/transactions', { params })
      .then((res) => setTransactions(res.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAdmin, filterShowroom]);

  useEffect(() => {
    if (isAdmin) api.get('/showrooms').then((res) => setShowrooms(res.data)).catch(() => { });
  }, [isAdmin]);

  let filtered = transactions;
  if (filterDateFrom || filterDateTo) {
    filtered = transactions.filter((t) => {
      const d = t.transactionDate ? new Date(t.transactionDate).getTime() : 0;
      if (filterDateFrom && d < new Date(filterDateFrom).getTime()) return false;
      if (filterDateTo && d > new Date(filterDateTo).getTime()) return false;
      return true;
    });
  }

  const openEdit = (row) => {
    setEditing(row);
    const ca = row.carAccount || {};
    setValue('purchaserName', ca.purchaserName ?? row.purchaserName ?? '');
    setValue('purchaserCnic', ca.purchaserCnic ?? row.purchaserCnic ?? '');
    setValue('purchaserPhone', ca.purchaserPhone ?? row.purchaserPhone ?? '');
    setValue('purchaserAddress', ca.purchaserAddress ?? row.purchaserAddress ?? '');
    setValue('amount', row.amount);
    setValue('transactionDate', row.transactionDate ? new Date(row.transactionDate).toISOString().slice(0, 10) : '');
    setValue('notes', ca.notes ?? row.notes ?? '');
    const paymentMethods = ca.paymentMethods ?? row.paymentMethods;
    if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
      setPaymentRows(paymentMethods.map((pm) => ({
        method: pm.method || 'cash',
        amount: pm.amount ?? '',
        bankDetails: pm.bankDetails || '',
        chequeNo: pm.chequeNo || '',
        bankName: pm.bankName || '',
        accountTitle: pm.accountTitle || '',
        date: pm.date ? new Date(pm.date).toISOString().slice(0, 10) : '',
      })));
    } else {
      setPaymentRows([{ method: 'cash', amount: row.amount ?? '', bankDetails: '', chequeNo: '', bankName: '', accountTitle: '', date: row.transactionDate ? new Date(row.transactionDate).toISOString().slice(0, 10) : '' }]);
    }
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    if (!editing) return;
    setSubmitting(true);
    setError('');
    const paymentMethods = paymentRows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        bankDetails: r.bankDetails || undefined,
        chequeNo: r.chequeNo || undefined,
        bankName: r.bankName || undefined,
        accountTitle: r.accountTitle || undefined,
        date: r.date || undefined,
      }));

    try {
      await api.put(`/transactions/${editing._id}`, {
        amount: Number(data.amount),
        transactionDate: data.transactionDate || editing.transactionDate,
      });
      if (editing.carAccount?._id) {
        await api.put(`/car-accounts/${editing.carAccount._id}`, {
          purchaserName: data.purchaserName,
          purchaserCnic: data.purchaserCnic || '',
          purchaserPhone: data.purchaserPhone || '',
          purchaserAddress: data.purchaserAddress || '',
          amount: Number(data.amount),
          transactionDate: data.transactionDate || editing.transactionDate,
          paymentMethods: paymentMethods.length ? paymentMethods : undefined,
          notes: data.notes || '',
        });
      }
      setModalOpen(false);
      fetchTransactions();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteClick = (id) => setConfirmDelete({ open: true, id });

  const onDeleteConfirm = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    setConfirmDelete({ open: false, id: null });
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading) return <div className="page-loading">Loading transactions...</div>;

  return (
    <div className="transactions-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Payment and sale records. Edit payment breakdown here. To create a new sale, use <Link to="/car-account/new">Delivery Order → New Delivery Order</Link>.</p>
        </div>
      </div>

      {isAdmin && showrooms.length > 0 && (
        <div className="transactions-filters card">
          <select value={filterShowroom} onChange={(e) => setFilterShowroom(e.target.value)} className="transactions-filter-select">
            <option value="">All showrooms</option>
            {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="transactions-filter-select" placeholder="From" />
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="transactions-filter-select" placeholder="To" />
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={onDeleteConfirm}
        title="Delete transaction"
        message="Are you sure you want to delete this transaction? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt / Date</th>
                <th>Number Plate</th>
                <th>Chassis</th>
                <th>Engine</th>
                <th>Make</th>
                <th>Model</th>
                <th>Purchaser</th>
                <th>Seller</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="table-empty">No transactions yet.</td></tr>
              ) : (
                filtered.map((t) => {
                  const ca = t.carAccount;
                  const numberPlate = ca?.vehicle?.registrationNo ?? ca?.registrationNo ?? '—';
                  const chassis = t.chassisNo ?? ca?.vehicle?.chassisNo ?? ca?.chassisNo ?? '—';
                  const engine = t.engineNo ?? ca?.vehicle?.engineNo ?? ca?.engineNo ?? '—';
                  const make = t.make ?? ca?.vehicle?.make ?? ca?.make ?? '—';
                  const model = t.model ?? ca?.vehicle?.model ?? ca?.model ?? '—';
                  const purchaser = ca?.purchaserName ?? '—';
                  const seller = ca?.ownerName ?? t.showroom?.ownerName ?? t.showroom?.name ?? '—';
                  return (
                    <tr key={t._id}>
                      <td>
                        <strong>{t.receiptNumber || '—'}</strong>
                        <div className="table-muted">{t.transactionDate ? format(new Date(t.transactionDate), 'dd/MM/yyyy') : '—'}</div>
                      </td>
                      <td>{numberPlate}</td>
                      <td>{chassis}</td>
                      <td>{engine}</td>
                      <td>{make}</td>
                      <td>{model}</td>
                      <td>{purchaser}</td>
                      <td>{seller}</td>
                      <td>PKR {t.amount?.toLocaleString() ?? '0'}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}><Pencil size={14} /></button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(t._id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Transaction</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
              <div className="form-group">
                <label>Purchaser Name *</label>
                <input {...register('purchaserName', { required: true })} />
                {errors.purchaserName && <span className="form-error">Required</span>}
              </div>
              <div className="form-group"><label>Address</label><input {...register('purchaserAddress')} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>CNIC</label>
                  <input
                    {...register('purchaserCnic', {
                      pattern: {
                        value: /^\d{5}-\d{7}-\d{1}$/,
                        message: 'Format: 12345-1234567-1'
                      },
                      onChange: (e) => {
                        e.target.value = formatCnic(e.target.value);
                      }
                    })}
                    placeholder="12345-1234567-1"
                    maxLength={15}
                  />
                  {errors.purchaserCnic && <span className="form-error">{errors.purchaserCnic.message}</span>}
                </div>
                <div className="form-group"><label>Phone</label><input {...register('purchaserPhone')} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (PKR) *</label>
                  <input type="number" step="0.01" min="0" {...register('amount', { required: true })} />
                  {watchAmount > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: '500', fontStyle: 'italic' }}>
                      {numberToWords(watchAmount)}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Amount Received</label>
                  <div className="form-control-static" style={{ color: 'var(--success-color, #10b981)', fontWeight: 'bold' }}>
                    PKR {totalReceived.toLocaleString()}
                  </div>
                </div>
                <div className="form-group">
                  <label>Balance {balance < 0 ? '(Excess)' : '(Due)'}</label>
                  <div className="form-control-static" style={{ color: balance === 0 ? 'var(--text-muted, #6b7280)' : (balance > 0 ? 'var(--danger-color, #ef4444)' : 'var(--success-color, #10b981)'), fontWeight: 'bold' }}>
                    PKR {Math.abs(balance).toLocaleString()}
                  </div>
                </div>
              </div>
              {watchAmount > 0 && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Amount in Words</label>
                  <div className="form-control-static" style={{ fontStyle: 'italic', color: '#4b5563' }}>
                    {numberToWords(watchAmount)}
                  </div>
                </div>
              )}
              <div className="form-group"><label>Date</label><input type="date" {...register('transactionDate')} /></div>
              <div className="form-group">
                <label>Payment breakdown (Cash / Bank / Cheque)</label>
                {paymentRows.map((row, i) => (
                  <div key={i} className="transactions-payment-row">
                    <select value={row.method} onChange={(e) => updatePaymentRow(i, 'method', e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="online_banking">Online Banking</option>
                      <option value="cheque">Cheque</option>
                    </select>
                    <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={(e) => updatePaymentRow(i, 'amount', e.target.value)} />
                    {row.method === 'online_banking' && <input type="text" placeholder="Bank details" value={row.bankDetails} onChange={(e) => updatePaymentRow(i, 'bankDetails', e.target.value)} />}
                    {row.method === 'cheque' && (
                      <>
                        <input type="text" placeholder="Cheque no" value={row.chequeNo} onChange={(e) => updatePaymentRow(i, 'chequeNo', e.target.value)} />
                        <input type="text" placeholder="Bank name" value={row.bankName} onChange={(e) => updatePaymentRow(i, 'bankName', e.target.value)} />
                        <input type="text" placeholder="Account title" value={row.accountTitle} onChange={(e) => updatePaymentRow(i, 'accountTitle', e.target.value)} />
                      </>
                    )}
                    <input type="date" value={row.date} onChange={(e) => updatePaymentRow(i, 'date', e.target.value)} title="Payment Date" />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removePaymentRow(i)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPaymentRow}><Plus size={14} /> Add payment method</button>
              </div>
              <div className="form-group"><label>Notes</label><textarea {...register('notes')} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div >
      )
      }
    </div >
  );
}
