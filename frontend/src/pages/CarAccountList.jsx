import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Trash2, FileDown, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import api, { getNetworkErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './CarAccountList.css';

const API_BASE = 'https://benito-musicianly-danuta.ngrok-free.dev/api';
const CONTROLLER_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Controllers can only edit/delete within 12 hours of creation. */
function canEditOrDelete(item, isAdmin) {
  if (isAdmin) return true;
  if (!item?.createdAt) return false;
  return Date.now() - new Date(item.createdAt).getTime() < CONTROLLER_EDIT_WINDOW_MS;
}

export default function CarAccountList({ type, basePath }) {
  const { isAdmin } = useAuth();
  const [list, setList] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterShowroom, setFilterShowroom] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [pdfLoading, setPdfLoading] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfPreviewMeta, setPdfPreviewMeta] = useState(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const fetchList = () => {
    setError('');
    const params = {};
    if (isAdmin && filterShowroom) params.showroomId = filterShowroom;
    api.get('/car-accounts', { params })
      .then((res) => {
        let data = res.data;
        if (type) {
          if (type === 'VEHICLE TOKEN RECEIPT') {
            // Show both new Token Receipts and old Sale Receipts
            data = data.filter(item => item.documentTitle === 'VEHICLE TOKEN RECEIPT' || item.documentTitle === 'VEHICLE SALE RECEIPT');
          } else {
            data = data.filter(item => item.documentTitle === type);
          }
        }
        setList(data);
      })
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load delivery orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [isAdmin, filterShowroom, type]);

  useEffect(() => {
    if (!isAdmin) return;
    setError('');
    api.get('/showrooms')
      .then((res) => setShowrooms(res.data))
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load showrooms'));
  }, [isAdmin]);

  let filtered = list;
  if (filterDateFrom || filterDateTo) {
    filtered = list.filter((item) => {
      const d = (item.transaction?.transactionDate || item.transactionDate) ? new Date(item.transaction?.transactionDate || item.transactionDate).getTime() : 0;
      if (filterDateFrom && d < new Date(filterDateFrom).getTime()) return false;
      if (filterDateTo && d > new Date(filterDateTo).getTime()) return false;
      return true;
    });
  }

  // Newest first sorting
  filtered = [...filtered].sort((a, b) => {
    const dateA = new Date(a.transaction?.transactionDate || a.transactionDate || a.createdAt).getTime();
    const dateB = new Date(b.transaction?.transactionDate || b.transactionDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  const onDeleteClick = (id) => setConfirmDelete({ open: true, id });

  const onDeleteConfirm = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    setConfirmDelete({ open: false, id: null });
    try {
      await api.delete(`/car-accounts/${id}`);
      fetchList();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  };

  const fetchPdfBlob = async (transactionId, type) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/pdf/${type}/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });
    if (!res.ok) {
      const errBody = await res.text();
      let msg = res.statusText;
      try { if (errBody) msg = JSON.parse(errBody).message || msg; } catch (_) { }
      throw new Error(msg || 'Failed to load PDF');
    }
    const blob = await res.blob();
    if (!blob.type || !blob.type.includes('pdf')) {
      throw new Error('Server did not return a PDF. Please sign in again and try again.');
    }
    return blob;
  };

  const openPdfPreview = async (transactionId, type) => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewMeta(null);
    setPdfPreviewLoading(`${transactionId}-${type}`);
    setError('');
    try {
      const blob = await fetchPdfBlob(transactionId, type);
      setPdfPreviewUrl(URL.createObjectURL(blob));
      setPdfPreviewMeta({ transactionId, type });
    } catch (e) {
      setError(getNetworkErrorMessage(e) || 'PDF preview failed.');
    } finally {
      setPdfPreviewLoading(null);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewMeta(null);
  };

  const downloadPdf = async (transactionId, type) => {
    setPdfLoading(`${transactionId}-${type}`);
    setError('');
    try {
      const blob = await fetchPdfBlob(transactionId, type);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = type === 'receipt' ? `receipt-${transactionId}.pdf` : `internal-${transactionId}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      fetchList();
    } catch (e) {
      setError(getNetworkErrorMessage(e) || 'PDF download failed.');
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) return <div className="page-loading">Loading delivery orders...</div>;

  return (
    <div className="car-account-list-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title"><FileText size={28} className="page-title-icon" /> {type === 'VEHICLE DELIVERY ORDER' && 'Delivery Orders'}
            {type === 'VEHICLE TOKEN RECEIPT' && 'Token Receipts'}
            {type === 'VEHICLE PURCHASE ORDER' && 'Purchase Orders'}
            {!type && 'Delivery Orders'}</h1>
          <p className="page-subtitle">Sale contracts (vehicle, owner, purchaser). Create and edit here; view or download PDFs from the action buttons. For payment records, use Transactions.</p>
        </div>
        <Link to={`${basePath || '/car-account'}/new`} className="btn btn-primary" target="_blank">
          <FileText size={18} /> New {type ? (type === 'VEHICLE DELIVERY ORDER' ? 'Delivery Order' : type === 'VEHICLE SALE RECEIPT' ? 'Sale Receipt' : 'Purchase Order') : 'Delivery Order'}
        </Link>
      </div>

      {isAdmin && showrooms.length > 0 && (
        <div className="car-account-list-filters card">
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
        title="Delete delivery order"
        message="Are you sure you want to delete this delivery order? The vehicle will be marked available again. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {pdfPreviewUrl && (
        <div className="pdf-preview-overlay" onClick={closePdfPreview}>
          <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <span>PDF Preview</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closePdfPreview} title="Close"><X size={20} /></button>
            </div>
            <iframe src={pdfPreviewUrl} title="PDF Preview" className="pdf-preview-iframe" />
            <div className="pdf-preview-actions">
              <button type="button" className="btn btn-secondary" onClick={() => pdfPreviewMeta && downloadPdf(pdfPreviewMeta.transactionId, pdfPreviewMeta.type)}>Download PDF</button>
              <button type="button" className="btn btn-primary" onClick={closePdfPreview}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt / Date</th>
                <th>Vehicle</th>
                <th>Purchaser</th>
                <th>Owner / Dealer</th>
                <th>Amount</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">No delivery orders yet. Create one with &quot;New Delivery Order&quot;.</td></tr>
              ) : (
                filtered.map((item) => {
                  const txId = item.transaction?._id || item._id;
                  const txDate = item.transaction?.transactionDate || item.transactionDate;
                  const amount = item.transaction?.amount ?? item.amount;
                  const vehicleLabel = item.vehicle
                    ? `${item.vehicle.make || ''} ${item.vehicle.model || ''}`.trim()
                    : (item.make || item.model ? `${item.make || ''} ${item.model || ''}`.trim() : '—');
                  const vehicleReg = item.vehicle?.registrationNo || item.registrationNo;
                  return (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.receiptNumber || '—'}</strong>
                        <div className="table-muted">{txDate ? format(new Date(txDate), 'dd/MM/yyyy') : '—'}</div>
                      </td>
                      <td>
                        <span>{vehicleLabel || '—'}</span>
                        {vehicleReg && <div className="table-muted">{vehicleReg}</div>}
                      </td>
                      <td>{item.purchaserName}</td>
                      <td>{item.ownerName || item.showroom?.ownerName || item.showroom?.name || '—'}</td>
                      <td>PKR {(amount ?? 0).toLocaleString()}</td>
                      <td>{item.transaction?.pdfCount || 0}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-primary btn-sm" title="Preview PDF in browser" onClick={() => openPdfPreview(txId, 'receipt')} disabled={pdfPreviewLoading !== null}>{pdfPreviewLoading === `${txId}-receipt` ? '...' : <Eye size={14} />} View PDF</button>
                          <button type="button" className="btn btn-secondary btn-sm" title="Download PDF" onClick={() => downloadPdf(txId, 'receipt')} disabled={pdfLoading !== null}>{pdfLoading === `${txId}-receipt` ? '...' : <FileDown size={14} />} Download</button>
                          {canEditOrDelete(item, isAdmin) ? (
                            <>
                              <Link to={`${basePath || '/car-account'}/edit/${item._id}`} className="btn btn-secondary btn-sm" title="Edit contract"><Pencil size={14} /> Edit</Link>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(item._id)} title="Delete"><Trash2 size={14} /></button>
                            </>
                          ) : (
                            <span className="table-muted" title="Edit/delete not allowed after 12 hours">—</span>
                          )}
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
    </div>
  );
}
