import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Trash2, FileDown, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import api, { getNetworkErrorMessage } from '../api/client';
import { carAccountService } from '../api/carAccountService';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './CarAccountList.css';


const CONTROLLER_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Controllers can only edit/delete within 12 hours of creation. */
function canEditOrDelete(item, isAdmin) {
  if (isAdmin) return true;
  if (!item?.createdAt) return false;
  return Date.now() - new Date(item.createdAt).getTime() < CONTROLLER_EDIT_WINDOW_MS;
}

export default function CarAccountList({ type, basePath }) {
  const { isAdmin, isController } = useAuth();

  const [list, setList] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterShowroom, setFilterShowroom] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfPreviewMeta, setPdfPreviewMeta] = useState(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const fetchList = () => {
    setLoading(true);
    setError('');
    const filters = {};
    if (isAdmin && filterShowroom) filters.showroomId = filterShowroom;
    if (isAdmin && filterCreatedBy) filters.createdBy = filterCreatedBy;
    if (filterDateFrom) filters.dateFrom = filterDateFrom;
    if (filterDateTo) filters.dateTo = filterDateTo;
    if (type) filters.documentTitle = type;

    carAccountService.getAll(filters)
      .then((res) => {
        setList(res.data);
      })
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load list'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [isAdmin, filterShowroom, filterCreatedBy, filterDateFrom, filterDateTo, type]);

  useEffect(() => {
    if (!isAdmin) return;
    setError('');
    api.get('/showrooms')
      .then((res) => setShowrooms(res.data))
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load showrooms'));

    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load users'));
  }, [isAdmin]);

  const handleExport = async () => {
    setExportLoading(true);
    setError('');
    try {
      const filters = {};
      if (isAdmin && filterShowroom) filters.showroomId = filterShowroom;
      if (isAdmin && filterCreatedBy) filters.createdBy = filterCreatedBy;
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;
      if (type) filters.documentTitle = type;

      const res = await carAccountService.export(filters);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = (type || 'Delivery Order').toLowerCase().replace(/ /g, '_') + 's.xlsx';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.message || 'Export failed.');
    } finally {
      setExportLoading(false);
    }
  };


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
    const res = await api.get(`/pdf/${type}/${transactionId}`, {
      responseType: 'blob'
    });
    const blob = res.data;
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


      {
        isAdmin && (
          <div className="car-account-list-filters card">
            {showrooms.length > 0 && (
              <select value={filterShowroom} onChange={(e) => setFilterShowroom(e.target.value)} className="transactions-filter-select">
                <option value="">All showrooms</option>
                {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            )}
            {users.length > 0 && (
              <select value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)} className="transactions-filter-select">
                <option value="">All creators</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            )}
            <div className="flex-grow"></div>
            <button
              onClick={handleExport}
              className="btn btn-outline"
              disabled={exportLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileDown size={18} />
              {exportLoading ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        )
      }

      <div className="car-account-list-filters card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="text-sm font-medium text-gray-600">Date Range:</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="transactions-filter-select" />
          <span className="text-gray-400">to</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="transactions-filter-select" />
          {(filterDateFrom || filterDateTo || (isAdmin && filterCreatedBy) || (isAdmin && filterShowroom)) && (
            <button
              onClick={() => {
                setFilterDateFrom('');
                setFilterDateTo('');
                setFilterCreatedBy('');
                setFilterShowroom('');
              }}
              className="btn btn-ghost btn-sm"
              title="Clear all filters"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {!isAdmin && (
          <button
            onClick={handleExport}
            className="btn btn-outline"
            disabled={exportLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}
          >
            <FileDown size={18} />
            {exportLoading ? 'Exporting...' : 'Export Excel'}
          </button>
        )}
      </div>

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
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No results found.</td></tr>
              ) : (
                list.map((item) => {
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
                        <strong>{(item.receiptNumber || '—').toUpperCase()}</strong>
                        <div className="table-muted">{txDate ? format(new Date(txDate), 'dd/MM/yyyy') : '—'}</div>
                      </td>
                      <td>
                        <span>{(vehicleLabel || '—').toUpperCase()}</span>
                        {vehicleReg && <div className="table-muted">{vehicleReg.toUpperCase()}</div>}
                      </td>
                      <td>{item.purchaserName?.toUpperCase()}</td>
                      <td>{(item.ownerName || item.showroom?.ownerName || item.showroom?.name || '—').toUpperCase()}</td>
                      <td>PKR {(amount ?? 0).toLocaleString()}</td>
                      <td>{item.transaction?.pdfCount || 0}</td>
                      <td>{(item.createdBy?.name || '—').toUpperCase()}</td>
                      <td>

                        <div className="table-actions">
                          <button type="button" className="btn btn-primary btn-sm" title="View PDF" onClick={() => openPdfPreview(txId, 'receipt')} disabled={pdfPreviewLoading !== null}>{pdfPreviewLoading === `${txId}-receipt` ? '...' : <Eye size={14} />}</button>
                          <button type="button" className="btn btn-secondary btn-sm" title="Download PDF" onClick={() => downloadPdf(txId, 'receipt')} disabled={pdfLoading !== null}>{pdfLoading === `${txId}-receipt` ? '...' : <FileDown size={14} />}</button>
                          {!isController && (
                            canEditOrDelete(item, isAdmin) ? (
                              <>
                                <Link to={`${basePath || '/car-account'}/edit/${item._id}`} className="btn btn-secondary btn-sm" title="Edit"><Pencil size={14} /></Link>
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(item._id)} title="Delete"><Trash2 size={14} /></button>
                              </>
                            ) : (
                              <span className="table-muted" title="Edit/delete not allowed after 12 hours">—</span>
                            )
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
