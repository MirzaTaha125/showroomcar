import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Trash2, FileDown, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { tokenReceiptService } from '../api/tokenReceiptService';
import api, { getNetworkErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './CarAccountList.css'; // Reuse styles

export default function TokenReceipts() {
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
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    const fetchList = () => {
        setError('');
        tokenReceiptService.getAll(isAdmin ? filterShowroom : undefined)
            .then((res) => setList(res.data))
            .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load token receipts'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchList();
    }, [isAdmin, filterShowroom]);

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
            const d = new Date(item.createdAt).getTime();
            if (filterDateFrom && d < new Date(filterDateFrom).getTime()) return false;
            if (filterDateTo && d > new Date(filterDateTo).getTime()) return false;
            return true;
        });
    }

    const onDeleteClick = (id) => setConfirmDelete({ open: true, id });

    const onDeleteConfirm = async () => {
        const id = confirmDelete.id;
        if (!id) return;
        setConfirmDelete({ open: false, id: null });
        try {
            await tokenReceiptService.delete(id);
            fetchList();
        } catch (e) {
            setError(e.response?.data?.message || 'Delete failed.');
        }
    };

    const openPdfPreview = async (id) => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
        setPdfPreviewMeta(null);
        setError('');
        try {
            const res = await api.get(`/pdf/token-receipt/${id}`, { responseType: 'blob' });
            const blob = res.data;
            if (!blob.type || !blob.type.includes('pdf')) {
                throw new Error('Server did not return a PDF.');
            }
            setPdfPreviewUrl(URL.createObjectURL(blob));
            setPdfPreviewMeta({ id });
        } catch (e) {
            setError(getNetworkErrorMessage(e) || 'PDF preview failed.');
        }
    };

    const closePdfPreview = () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
        setPdfPreviewMeta(null);
    };

    const downloadPdf = async (id) => {
        setPdfLoading(id);
        setError('');
        try {
            const res = await api.get(`/pdf/token-receipt/${id}`, { responseType: 'blob' });
            const blob = res.data;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `token-receipt-${id}.pdf`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            setError(getNetworkErrorMessage(e) || 'PDF download failed.');
        } finally {
            setPdfLoading(null);
        }
    };

    if (loading) return <div className="page-loading">Loading token receipts...</div>;

    return (
        <div className="car-account-list-page">
            <div className="page-header card-header">
                <div>
                    <h1 className="page-title"><FileText size={28} className="page-title-icon" /> Token Receipts</h1>
                    <p className="page-subtitle">Manage token receipts for vehicle sales.</p>
                </div>
                <Link to="/token-receipts/new" className="btn btn-primary">
                    <FileText size={18} /> New Token Receipt
                </Link>
            </div>

            {isAdmin && showrooms.length > 0 && (
                <div className="car-account-list-filters card">
                    <select value={filterShowroom} onChange={(e) => setFilterShowroom(e.target.value)} className="transactions-filter-select">
                        <option value="">All showrooms</option>
                        {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="transactions-filter-select" />
                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="transactions-filter-select" />
                </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <ConfirmDialog
                isOpen={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                onConfirm={onDeleteConfirm}
                title="Delete Token Receipt"
                message="Are you sure you want to delete this token receipt? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            {pdfPreviewUrl && (
                <div className="pdf-preview-overlay" onClick={closePdfPreview}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pdf-preview-header">
                            <span>PDF Preview</span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={closePdfPreview}><X size={20} /></button>
                        </div>
                        <iframe src={pdfPreviewUrl} title="PDF Preview" className="pdf-preview-iframe" />
                        <div className="pdf-preview-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => pdfPreviewMeta && downloadPdf(pdfPreviewMeta.id)}>Download PDF</button>
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
                                <th>Date</th>
                                <th>Vehicle</th>
                                <th>Received From</th>
                                <th>Amount</th>
                                <th>Purchaser</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="table-empty">No token receipts found.</td></tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item._id}>
                                        <td>{format(new Date(item.createdAt), 'dd/MM/yyyy')}</td>
                                        <td>
                                            <strong>{item.make} {item.model}</strong>
                                            <div className="table-muted">{item.onBehalfOfSellingCar}</div>
                                        </td>
                                        <td>{item.fromMrMrs}</td>
                                        <td>PKR {item.amountReceived.toLocaleString()}</td>
                                        <td>{item.purchaserName}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button type="button" className="btn btn-primary btn-sm" onClick={() => openPdfPreview(item._id)}><Eye size={14} /> View</button>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadPdf(item._id)} disabled={pdfLoading === item._id}>{pdfLoading === item._id ? '...' : <FileDown size={14} />} Download</button>
                                                <Link to={`/token-receipts/edit/${item._id}`} className="btn btn-secondary btn-sm"><Pencil size={14} /> Edit</Link>
                                                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(item._id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
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
