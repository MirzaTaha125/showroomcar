import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { tokenReceiptService } from '../api/tokenReceiptService';
import { useAuth } from '../context/AuthContext';
import { numberToWords, formatCnic } from '../api/utils';
import '../components/ui.css';
import './CarAccount.css'; // Reuse styles

export default function TokenReceiptForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const { isAdmin, user } = useAuth();
    const [showrooms, setShowrooms] = useState([]);
    const [loading, setLoading] = useState(isEditMode);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            amountReceived: '',
            fromMrMrs: '',
            fatherName: '',
            onBehalfOfSellingCar: '',
            make: '',
            model: '',
            registrationNo: '',
            yearOfManufacture: '',
            colour: '',
            totalPrice: '',
            remainingBalance: '',
            note: '',
            purchaserName: '',
            purchaserCnic: '',
            purchaserMobile: '',
            sellerName: '',
            sellerCnic: '',
            sellerMobile: '',
            showroom: '',
        },
    });

    const watchAmountReceived = watch('amountReceived');
    const watchTotalPrice = watch('totalPrice');

    useEffect(() => {
        if (isAdmin) {
            api.get('/showrooms').then((res) => setShowrooms(res.data)).catch(() => { });
        } else if (user?.showroom) {
            setShowrooms([user.showroom]);
            setValue('showroom', user.showroom._id);
        }
    }, [isAdmin, user, setValue]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        tokenReceiptService.getById(id)
            .then((res) => {
                const data = res.data;
                Object.keys(data).forEach(key => {
                    if (key === 'showroom') setValue('showroom', data.showroom?._id || data.showroom);
                    else setValue(key, data[key]);
                });
            })
            .catch(() => setError('Failed to load token receipt.'))
            .finally(() => setLoading(false));
    }, [id, setValue]);

    // Auto-calculate remaining balance
    useEffect(() => {
        const total = Number(watchTotalPrice) || 0;
        const received = Number(watchAmountReceived) || 0;
        if (total > 0) {
            setValue('remainingBalance', total - received);
        }
    }, [watchTotalPrice, watchAmountReceived, setValue]);

    const onSubmit = async (data) => {
        setSubmitting(true);
        setError('');

        // Transform to uppercase as per project convention seen in CarAccount.jsx
        const transformData = (obj) => {
            const transformed = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && key !== 'showroom' && key !== 'id' && key !== '_id') {
                    transformed[key] = value.toUpperCase();
                } else {
                    transformed[key] = value;
                }
            }
            return transformed;
        };

        const payload = transformData(data);

        try {
            if (isEditMode) {
                await tokenReceiptService.update(id, payload);
            } else {
                await tokenReceiptService.create(payload);
            }
            navigate('/token-receipts');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save token receipt.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page-loading">Loading...</div>;

    return (
        <div className="car-account-page">
            <div className="page-header">
                <Link to="/token-receipts" className="car-account-back"><ArrowLeft size={16} /> Back to Token Receipts</Link>
                <h1 className="page-title">
                    <FileText size={28} className="page-title-icon" />
                    {isEditMode ? 'Edit Token Receipt' : 'New Token Receipt'}
                </h1>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit(onSubmit)} className="car-account-form">
                <section className="car-account-section">
                    <h2>Basic Information</h2>
                    <div className="form-row form-row-2">
                        {isAdmin && (
                            <div className="form-group">
                                <label>Showroom *</label>
                                <select {...register('showroom', { required: 'Select showroom' })}>
                                    <option value="">— Select —</option>
                                    {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                                {errors.showroom && <span className="form-error">{errors.showroom.message}</span>}
                            </div>
                        )}
                        <div className="form-group">
                            <label>Amount Received *</label>
                            <input type="number" {...register('amountReceived', { required: 'Required' })} />
                            {watchAmountReceived > 0 && (
                                <div className="form-hint" style={{ fontStyle: 'italic' }}>{numberToWords(watchAmountReceived)}</div>
                            )}
                        </div>
                    </div>
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label>Received From *</label>
                            <input {...register('fromMrMrs', { required: 'Required' })} placeholder="MR. / MRS." />
                        </div>
                        <div className="form-group">
                            <label>S/O, W/O, D/O</label>
                            <input {...register('fatherName')} />
                        </div>
                    </div>
                </section>

                <section className="car-account-section">
                    <h2>Vehicle Details</h2>
                    <div className="form-group">
                        <label>On Behalf Of Car Chassis No. *</label>
                        <input {...register('onBehalfOfSellingCar', { required: 'Required' })} />
                    </div>
                    <div className="form-row form-row-3">
                        <div className="form-group"><label>Make *</label><input {...register('make', { required: 'Required' })} /></div>
                        <div className="form-group"><label>Model *</label><input {...register('model', { required: 'Required' })} /></div>
                        <div className="form-group"><label>Reg #</label><input {...register('registrationNo')} /></div>
                    </div>
                    <div className="form-row form-row-2">
                        <div className="form-group"><label>Year</label><input {...register('yearOfManufacture')} /></div>
                        <div className="form-group"><label>Color</label><input {...register('colour')} /></div>
                    </div>
                    <div className="form-row form-row-2">
                        <div className="form-group"><label>Total Price *</label><input type="number" {...register('totalPrice', { required: 'Required' })} /></div>
                        <div className="form-group"><label>Balance</label><input type="number" {...register('remainingBalance')} readOnly className="readonly-input" /></div>
                    </div>
                    <div className="form-group">
                        <label>Note</label>
                        <textarea {...register('note')} rows={2} />
                    </div>
                </section>

                <div className="car-account-dealers-grid">
                    <section className="car-account-section car-account-dealers-col">
                        <h2>Purchaser Details</h2>
                        <div className="form-group"><label>Purchaser Name *</label><input {...register('purchaserName', { required: 'Required' })} /></div>
                        <div className="form-group">
                            <label>Purchaser CNIC</label>
                            <input {...register('purchaserCnic', { onChange: (e) => e.target.value = formatCnic(e.target.value) })} maxLength={15} placeholder="12345-1234567-1" />
                        </div>
                        <div className="form-group"><label>Purchaser Mobile</label><input {...register('purchaserMobile')} /></div>
                    </section>

                    <section className="car-account-section car-account-dealers-col">
                        <h2>Seller Details</h2>
                        <div className="form-group"><label>Seller Name *</label><input {...register('sellerName', { required: 'Required' })} /></div>
                        <div className="form-group">
                            <label>Seller CNIC</label>
                            <input {...register('sellerCnic', { onChange: (e) => e.target.value = formatCnic(e.target.value) })} maxLength={15} placeholder="12345-1234567-1" />
                        </div>
                        <div className="form-group"><label>Seller Mobile</label><input {...register('sellerMobile')} /></div>
                    </section>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <Save size={18} /> {submitting ? 'Saving...' : 'Save Token Receipt'}
                    </button>
                    <Link to="/token-receipts" className="btn btn-secondary">Cancel</Link>
                </div>
            </form>
        </div>
    );
}
