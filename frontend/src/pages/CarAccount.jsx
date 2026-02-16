import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FileText, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import { numberToWords, formatCnic, formatPhone } from '../api/utils';
import { useAuth } from '../context/AuthContext';
import '../components/ui.css';
import './CarAccount.css';

const CONTROLLER_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

const DOCUMENT_CHECKLIST = [
  'Original File',
  'Original Number plates',
  'Car key(s)',
  'Tool Kit',
  'Vehicle Registeration Card',
];

export default function CarAccount({ type, basePath }) {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const { isAdmin, user } = useAuth();
  const [showrooms, setShowrooms] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addVehicleInForm, setAddVehicleInForm] = useState(true);
  const [paymentRows, setPaymentRows] = useState([{ method: 'cash', amount: '', bankDetails: '', chequeNo: '', bankName: '', accountTitle: '', date: '' }]);
  const [loadedTransaction, setLoadedTransaction] = useState(null);
  const [editExpired, setEditExpired] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      showroom: '',
      vehicleId: '',
      registrationNo: '',
      dateOfRegistration: '',
      chassisNo: '',
      engineNo: '',
      make: '',
      model: '',
      color: '',
      hp: '',
      yearOfManufacturing: '',
      deliveryTime: '',
      purchaserName: '',
      purchaserFatherName: '',
      purchaserCnic: '',
      purchaserPhone: '',
      purchaserAddress: '',
      purchaserSalesmanName: '',
      titleStampSign: '',
      sellerSignature: '',
      purchaserSignature: '',
      agentName: '',
      agentCnic: '',
      agentAddress: '',
      agentPhone: '',
      amount: '',
      commission: '',
      remarks: '',
      notes: '',
      ownerName: '',
      ownerFatherName: '',
      ownerAddress: '',
      ownerCnic: '',
      ownerTelephone: '',
      sellerName: '',
      sellerFatherName: '',
      sellerCnic: '',
      sellerAddress: '',
      sellerPhone: '',
      biometricContent: '',
      biometricSigningDate: '',
      transactionDate: '',
      biometricImagePath: '',
      includeNadraBiometric: false,
      sellerBiometricDate: '',
      purchaserBiometricDate: '',
      documentDetails: [],
      documentTitle: '',
      forCarDealers: false,
    },
  });

  const selectedShowroom = watch('showroom');
  const forCarDealers = watch('forCarDealers');
  const vehicleId = watch('vehicleId');
  const watchAmount = watch('amount');
  const watchCommission = watch('commission');
  const biometricImagePath = watch('biometricImagePath');
  const includeNadraBiometric = watch('includeNadraBiometric');

  const totalReceived = paymentRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const balance = (Number(watchAmount) || 0) - totalReceived;

  // Determine if selected showroom is Car Markaz
  const selectedShowroomObj = showrooms.find(s => s._id === selectedShowroom) || (!isAdmin ? user?.showroom : null);
  const isCarMarkaz = selectedShowroomObj?.name?.toLowerCase().replace(/\s/g, '').includes('carmarkaz');

  useEffect(() => {
    if (!isEditMode && type) {
      setValue('documentTitle', type);

      if (user) {
        // Auto-fill based on document type and logged-in user
        if (type === 'VEHICLE DELIVERY ORDER' && !forCarDealers) {
          // Seller Details are manual entry
        }

        // Auto-fill Agent Details from current user for new documents
        if (!watch('agentName')) setValue('agentName', user.name || '');
        if (!watch('agentCnic')) setValue('agentCnic', user.cnic || '');
        if (!watch('agentAddress')) setValue('agentAddress', user.address || '');
        if (!watch('agentPhone')) setValue('agentPhone', user.phone || '');
      }

      // Auto-fill Date and Time for new entries
      const now = new Date();
      setValue('transactionDate', now.toISOString().slice(0, 10));
      setValue('deliveryTime', now.toTimeString().slice(0, 5));
    }
  }, [isEditMode, type, setValue, user, selectedShowroomObj]);

  useEffect(() => {
    if (isAdmin) api.get('/showrooms').then((res) => setShowrooms(res.data)).catch(() => { });
    else if (user?.showroom) setShowrooms([user.showroom]);
  }, [isAdmin]);

  useEffect(() => {
    if (!editId) return;
    api.get(`/car-accounts/${editId}`)
      .then((res) => {
        const t = res.data;
        setLoadedTransaction(t);
        if (!isAdmin && t.createdAt && (Date.now() - new Date(t.createdAt).getTime() > CONTROLLER_EDIT_WINDOW_MS)) {
          setEditExpired(true);
        }
        const v = t.vehicle || t;
        setValue('showroom', t.showroom?._id || '');
        setValue('vehicleId', t.vehicle?._id || '');
        setAddVehicleInForm(!t.vehicle && (t.chassisNo || t.make));
        setValue('forCarDealers', t.forCarDealers !== false);
        setValue('registrationNo', v.registrationNo || '');
        setValue('dateOfRegistration', v.dateOfRegistration ? new Date(v.dateOfRegistration).toISOString().slice(0, 10) : '');
        setValue('chassisNo', v.chassisNo || '');
        setValue('engineNo', v.engineNo || '');
        setValue('make', v.make || '');
        setValue('model', v.model || '');
        setValue('color', v.color || '');
        setValue('hp', v.hp || '');
        setValue('yearOfManufacturing', v.yearOfManufacturing || '');
        setValue('deliveryTime', t.deliveryTime || '');
        setValue('ownerName', t.ownerName || '');
        setValue('ownerFatherName', t.ownerFatherName || '');
        setValue('ownerCnic', t.ownerCnic || '');
        setValue('thumbImpression', t.ownerThumbImpression || t.thumbImpression || '');
        setValue('ownerAddress', t.ownerAddress || '');
        setValue('ownerTelephone', t.ownerTelephone || '');
        setValue('sellerName', t.sellerName || '');
        setValue('sellerFatherName', t.sellerFatherName || '');
        setValue('sellerCnic', t.sellerCnic || '');
        setValue('sellerAddress', t.sellerAddress || '');
        setValue('sellerPhone', t.sellerPhone || '');
        setValue('salesmanName', t.salesmanName || '');
        setValue('purchaserName', t.purchaserName || '');
        setValue('purchaserFatherName', t.purchaserFatherName || '');
        setValue('purchaserAddress', t.purchaserAddress || '');
        setValue('purchaserCnic', t.purchaserCnic || '');
        setValue('purchaserPhone', t.purchaserPhone || '');
        setValue('titleStampSign', t.titleStampSign || '');
        setValue('sellerSignature', t.sellerSignature || '');
        setValue('purchaserSignature', t.purchaserSignature || '');
        setValue('amount', t.transaction?.amount ?? t.amount ?? '');
        setValue('commission', t.transaction?.commission ?? t.commission ?? '');
        setValue('remarks', t.remarks || '');
        setValue('notes', t.notes || '');
        setValue('biometricContent', t.biometricContent || '');
        setValue('biometricSigningDate', t.biometricSigningDate ? new Date(t.biometricSigningDate).toISOString().slice(0, 10) : '');
        setValue('biometricImagePath', t.biometricImagePath || '');
        setValue('includeNadraBiometric', t.includeNadraBiometric || false);
        setValue('sellerBiometricDate', t.sellerBiometricDate ? new Date(t.sellerBiometricDate).toISOString().slice(0, 10) : '');
        setValue('purchaserBiometricDate', t.purchaserBiometricDate ? new Date(t.purchaserBiometricDate).toISOString().slice(0, 10) : '');
        setValue('documentDetails', t.documentDetails || []);
        setValue('agentName', t.agentName || '');
        setValue('agentCnic', t.agentCnic || '');
        setValue('agentAddress', t.agentAddress || t.agentAdress || ''); // Fix potential typo from previous versions if any
        setValue('agentPhone', t.agentPhone || '');
        setValue('documentTitle', t.documentTitle || 'VEHICLE DELIVERY ORDER');
        setValue('invoiceNo', v.invoiceNo || '');
        setValue('invoiceDate', v.invoiceDate ? new Date(v.invoiceDate).toISOString().slice(0, 10) : '');
        setValue('cplcVerification', v.cplcVerification || '');
        setValue('cplcDate', v.cplcDate ? new Date(v.cplcDate).toISOString().slice(0, 10) : '');
        setValue('cplcTime', v.cplcTime || '');
        setValue('transactionDate', (t.transaction?.transactionDate || t.transactionDate) ? new Date(t.transaction?.transactionDate || t.transactionDate).toISOString().slice(0, 10) : '');
        if (Array.isArray(t.paymentMethods) && t.paymentMethods.length > 0) {
          setPaymentRows(t.paymentMethods.map((pm) => ({
            method: pm.method || 'cash',
            amount: pm.amount ?? '',
            bankDetails: pm.bankDetails || '',
            chequeNo: pm.chequeNo || '',
            bankName: pm.bankName || '',
            accountTitle: pm.accountTitle || '',
            date: pm.date ? new Date(pm.date).toISOString().slice(0, 10) : '',
          })));
        }
      })
      .catch(() => setError('Failed to load delivery order.'))
      .finally(() => setLoading(false));
  }, [editId]);

  useEffect(() => {
    if (!selectedShowroom && !isAdmin) {
      const sr = user?.showroom?._id;
      if (sr) fetchInventory(sr);
      return;
    }
    if (selectedShowroom) fetchInventory(selectedShowroom);
    else setInventory([]);
  }, [selectedShowroom, isAdmin]);

  function fetchInventory(showroomId) {
    api.get('/vehicles', { params: { showroomId: showroomId || selectedShowroom, status: 'available' } })
      .then((res) => setInventory(res.data))
      .catch(() => setInventory([]));
  }

  // Auto-fill dealer details when showroom selected and "For Car Dealers" is checked
  useEffect(() => {
    // Seller/Purchaser details (names, address, phone, cnic, salesman) are manual entry only.
  }, [selectedShowroomObj, forCarDealers, isEditMode, setValue, isAdmin, user, type]);

  // Auto-fill vehicle owner details when vehicle is selected from inventory
  useEffect(() => {
    if (isEditMode || !vehicleId || addVehicleInForm) return;

    const selectedVehicle = inventory.find(v => v._id === vehicleId);
    if (selectedVehicle) {
      setValue('registrationNo', selectedVehicle.registrationNo || '');
      setValue('dateOfRegistration', selectedVehicle.dateOfRegistration ? new Date(selectedVehicle.dateOfRegistration).toISOString().slice(0, 10) : '');
      setValue('chassisNo', selectedVehicle.chassisNo || '');
      setValue('engineNo', selectedVehicle.engineNo || '');
      setValue('make', selectedVehicle.make || '');
      setValue('model', selectedVehicle.model || '');
      setValue('color', selectedVehicle.color || '');
      setValue('hp', selectedVehicle.hp || '');
      setValue('yearOfManufacturing', selectedVehicle.yearOfManufacturing || '');
    }
  }, [vehicleId, inventory, isEditMode, addVehicleInForm, setValue]);


  const addPaymentRow = () => setPaymentRows((r) => [...r, { method: 'cash', amount: '', bankDetails: '', chequeNo: '', bankName: '', accountTitle: '', date: '' }]);
  const removePaymentRow = (i) => setPaymentRows((r) => r.filter((_, j) => j !== i));
  const updatePaymentRow = (i, field, value) => {
    setPaymentRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };
  const [uploadingBiometric, setUploadingBiometric] = useState(false);

  const handleBiometricUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBiometric(true);
    setError('');
    const fd = new FormData();
    fd.append('biometric', file);
    try {
      const res = await api.post('/car-accounts/upload-biometric', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('biometricImagePath', res.data.biometricImagePath);
    } catch (err) {
      setError(err.response?.data?.message || 'Biometric upload failed.');
    } finally {
      setUploadingBiometric(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    const totalAmount = Number(data.amount) || 0;
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

    if (isEditMode && editId) {
      try {
        const updatePayload = {
          documentTitle: data.documentTitle,
          purchaserName: data.purchaserName,
          purchaserFatherName: data.purchaserFatherName || '',
          purchaserCnic: data.purchaserCnic || '',
          purchaserPhone: data.purchaserPhone || '',
          purchaserAddress: data.purchaserAddress || '',
          purchaserSalesmanName: data.purchaserSalesmanName || '',
          ownerName: data.ownerName || '',
          ownerFatherName: data.ownerFatherName || '',
          ownerCnic: data.ownerCnic || '',
          ownerAddress: data.ownerAddress || '',
          ownerTelephone: data.ownerTelephone || '',
          ownerThumbImpression: data.thumbImpression || '',
          sellerName: data.sellerName || '',
          sellerFatherName: data.sellerFatherName || '',
          sellerCnic: data.sellerCnic || '',
          sellerAddress: data.sellerAddress || '',
          sellerPhone: data.sellerPhone || '',
          salesmanName: data.salesmanName || '',
          agentName: data.agentName || '',
          agentCnic: data.agentCnic || '',
          agentAddress: data.agentAddress || '',
          agentPhone: data.agentPhone || '',
          forCarDealers: data.forCarDealers !== false,
          documentDetails: data.documentDetails || [],
          amount: totalAmount,
          commission: Number(data.commission) || 0,
          paymentMethods: paymentMethods.length ? paymentMethods : undefined,
          transactionDate: data.transactionDate || null,
          deliveryTime: data.deliveryTime || '',
          remarks: data.remarks || '',
          notes: data.notes || '',
          registrationNo: data.registrationNo || '',
          dateOfRegistration: data.dateOfRegistration || null,
          chassisNo: data.chassisNo || '',
          engineNo: data.engineNo || '',
          make: data.make || '',
          model: data.model || '',
          color: data.color || '',
          hp: data.hp || '',
          yearOfManufacturing: data.yearOfManufacturing || '',
          registrationBookNoNew: data.registrationBookNoNew || '',
          registrationBookNo: data.registrationBookNo || '',
          salesCertificateBillOfEntryNo: data.salesCertificateBillOfEntryNo || '',
          salesCertificateDate: data.salesCertificateDate || null,
          invoiceNo: data.invoiceNo || '',
          invoiceDate: data.invoiceDate || null,
          cplcVerification: data.cplcVerification || '',
          cplcDate: data.cplcDate || null,
          cplcTime: data.cplcTime || '',
          titleStampSign: data.titleStampSign || '',
          sellerSignature: data.sellerSignature || '',
          purchaserSignature: data.purchaserSignature || '',
          biometricContent: data.biometricContent || '',
          biometricSigningDate: data.biometricSigningDate || null,
          biometricImagePath: data.biometricImagePath || '',
          includeNadraBiometric: data.includeNadraBiometric || false,
          sellerBiometricDate: data.sellerBiometricDate || null,
          purchaserBiometricDate: data.purchaserBiometricDate || null,
        };
        const response = await api.put(`/car-accounts/${editId}`, updatePayload);
        navigate('/car-account');
      } catch (e) {
        console.error('[CarAccount] Update failed:', e.response?.data || e.message);
        setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Failed to save.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const showroomId = isAdmin ? data.showroom : user?.showroom?._id;
    if (!showroomId) {
      setError('Showroom is required.');
      setSubmitting(false);
      return;
    }
    const vehicleId = data.vehicleId;
    if (!addVehicleInForm && !vehicleId) {
      setError('Please select a vehicle from inventory or add vehicle details in the form.');
      setSubmitting(false);
      return;
    }
    if (addVehicleInForm && (!data.chassisNo?.trim() || !data.engineNo?.trim() || !data.make?.trim() || !data.model?.trim())) {
      setError('When adding vehicle in form, Chassis No, Engine No, Make and Model are required.');
      setSubmitting(false);
      return;
    }
    if (isNaN(totalAmount) || totalAmount < 0) {
      setError('Please enter a valid amount.');
      setSubmitting(false);
      return;
    }
    const comm = Number(data.commission) || 0;
    if (comm < 0 || comm > 100) {
      setError('Commission must be between 0 and 100.');
      setSubmitting(false);
      return;
    }

    const transformToUpperCase = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') return obj.toUpperCase();
      if (Array.isArray(obj)) return obj.map(transformToUpperCase);
      if (typeof obj === 'object') {
        const transformed = {};
        for (const [key, value] of Object.entries(obj)) {
          // Keep internal IDs/mongo references/paths as they are
          const lowerKey = key.toLowerCase();
          if (key === '_id' || key === 'id' || key === 'userId' || key.endsWith('Id') ||
            key === 'showroom' || key === 'vehicle' || lowerKey.includes('path') ||
            key === 'biometricContent' || key === 'documentTitle' || key === 'paymentMethods') {
            transformed[key] = value;
          } else {
            transformed[key] = transformToUpperCase(value);
          }
        }
        return transformed;
      }
      return obj;
    };

    try {
      let transactionPayload = {
        ...(vehicleId ? { vehicle: vehicleId } : {
          showroom: showroomId,
          chassisNo: data.chassisNo?.trim(),
          engineNo: data.engineNo?.trim(),
          make: data.make?.trim(),
          model: data.model?.trim(),
          color: data.color?.trim() || '',
          hp: data.hp?.trim() || '',
          registrationNo: data.registrationNo?.trim() || '',
          dateOfRegistration: data.dateOfRegistration || null,
          registrationBookNoNew: data.registrationBookNoNew?.trim() || '',
          registrationBookNo: data.registrationBookNo?.trim() || '',
          salesCertificateBillOfEntryNo: data.salesCertificateBillOfEntryNo?.trim() || '',
          salesCertificateDate: data.salesCertificateDate || null,
          invoiceNo: data.invoiceNo?.trim() || '',
          invoiceDate: data.invoiceDate || null,
          cplcVerification: data.cplcVerification?.trim() || '',
          cplcDate: data.cplcDate || null,
          cplcTime: data.cplcTime?.trim() || '',
        }),
        documentTitle: data.documentTitle,
        type: 'sale',
        purchaserName: data.purchaserName,
        purchaserFatherName: data.purchaserFatherName || '',
        purchaserCnic: data.purchaserCnic || '',
        purchaserPhone: data.purchaserPhone || '',
        purchaserAddress: data.purchaserAddress || '',
        purchaserSalesmanName: data.purchaserSalesmanName || '',
        yearOfManufacturing: data.yearOfManufacturing || '',
        deliveryTime: data.deliveryTime || '',
        sellerBiometricDate: data.sellerBiometricDate || null,
        purchaserBiometricDate: data.purchaserBiometricDate || null,
        ownerName: data.ownerName || '',
        ownerFatherName: data.ownerFatherName || '',
        ownerCnic: data.ownerCnic || '',
        ownerAddress: data.ownerAddress || '',
        ownerTelephone: data.ownerTelephone || '',
        ownerThumbImpression: data.thumbImpression || '',
        sellerName: data.sellerName || '',
        sellerFatherName: data.sellerFatherName || '',
        sellerCnic: data.sellerCnic || '',
        sellerAddress: data.sellerAddress || '',
        sellerPhone: data.sellerPhone || '',
        salesmanName: data.salesmanName || '',
        agentName: data.agentName || '',
        agentCnic: data.agentCnic || '',
        agentAddress: data.agentAddress || '',
        agentPhone: data.agentPhone || '',
        forCarDealers: data.forCarDealers !== false,
        documentDetails: data.documentDetails || [],
        amount: totalAmount,
        commission: comm,
        paymentMethods: paymentMethods.length ? paymentMethods : undefined,
        transactionDate: data.transactionDate || null,
        remarks: data.remarks || '',
        notes: data.notes || '',
        titleStampSign: data.titleStampSign || '',
        sellerSignature: data.sellerSignature || '',
        purchaserSignature: data.purchaserSignature || '',
        biometricContent: data.biometricContent || '',
        biometricSigningDate: data.biometricSigningDate || null,
        biometricImagePath: data.biometricImagePath || '',
        includeNadraBiometric: data.includeNadraBiometric || false,
      };

      // Force uppercase for all text data
      transactionPayload = transformToUpperCase(transactionPayload);

      await api.post('/car-accounts', transactionPayload);
      navigate('/car-account');
    } catch (e) {
      console.error('[CarAccount] Create failed:', e.response?.data || e.message);
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Failed to create deal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && loading) return <div className="page-loading">Loading delivery order...</div>;

  if (isEditMode && editExpired) {
    return (
      <div className="car-account-page">
        <div className="page-header">
          <Link to="/car-account" className="car-account-back">← Back to Delivery Orders</Link>
          <h1 className="page-title"><FileText size={28} className="page-title-icon" /> Edit Delivery Order</h1>
        </div>
        <div className="alert alert-error">This delivery order can no longer be edited. Controllers may only edit or delete delivery orders within 12 hours of creation.</div>
        <Link to="/car-account" className="btn btn-primary">Back to Delivery Orders</Link>
      </div>
    );
  }

  return (
    <div className="car-account-page">
      <div className="page-header">
        <Link to={basePath || '/car-account'} className="car-account-back">← Back to {type ? (type === 'VEHICLE DELIVERY ORDER' ? 'Delivery Orders' : (type === 'VEHICLE SALE RECEIPT' || type === 'VEHICLE TOKEN RECEIPT') ? 'Token Receipts' : 'Purchase Orders') : 'Delivery Orders'}</Link>
        <h1 className="page-title">
          <FileText size={28} className="page-title-icon" />
          {type === 'VEHICLE DELIVERY ORDER' && 'New Delivery Order'}
          {(type === 'VEHICLE SALE RECEIPT' || type === 'VEHICLE TOKEN RECEIPT') && 'New Token Receipt'}
          {type === 'VEHICLE PURCHASE ORDER' && 'New Purchase Order'}
          {!type && 'New Order'}
        </h1>
        <p className="page-subtitle">
          {isEditMode ? 'Update contract details. PDF is not regenerated; download from list when needed.' : 'Create a digital contract. Download the PDF from the list when you need it.'}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="car-account-form">
        {isAdmin && !isEditMode && (
          <section className="car-account-section">
            <h2>Showroom</h2>
            <div className="form-group">
              <label>Showroom *</label>
              <select {...register('showroom', { required: isAdmin && 'Select showroom' })}>
                <option value="">— Select —</option>
                {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              {errors.showroom && <span className="form-error">{errors.showroom.message}</span>}
            </div>
          </section>
        )}

        <section className="car-account-section">
          <h2>Options</h2>
          {!type && (
            <div className="form-group">
              <label>Document Title (PDF Header)</label>
              <select {...register('documentTitle')}>
                <option value="VEHICLE DELIVERY ORDER">Vehicle Delivery Order</option>
                <option value="VEHICLE TOKEN RECEIPT">Vehicle Token Receipt</option>
                <option value="VEHICLE PURCHASE ORDER">Vehicle Purchase Order</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="car-account-label">Deal Type</label>
            <div className="dealer-toggle-group">
              <button
                type="button"
                className={`dealer-toggle-btn ${!forCarDealers ? 'active' : ''}`}
                onClick={() => !isEditMode && setValue('forCarDealers', false)}
                disabled={isEditMode}
              >
                Direct Sale
              </button>
              <button
                type="button"
                className={`dealer-toggle-btn ${forCarDealers ? 'active' : ''}`}
                onClick={() => !isEditMode && setValue('forCarDealers', true)}
                disabled={isEditMode}
              >
                Car Dealer
              </button>
            </div>
            <p className="car-account-dealers-desc">
              {forCarDealers
                ? 'Shows two-column layout for dealer and purchaser details.'
                : 'Standard layout for direct sales.'}
            </p>
          </div>
        </section>


        <section className="car-account-section">
          <h2>Vehicle</h2>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label>{type === 'VEHICLE PURCHASE ORDER' ? 'Date of Purchasing' : 'Date of Delivery'}</label>
              <input type="date" {...register('transactionDate')} />
            </div>
            <div className="form-group">
              <label>{type === 'VEHICLE PURCHASE ORDER' ? 'Time of Purchasing' : 'Time of Delivery'}</label>
              <input type="time" {...register('deliveryTime')} />
            </div>
          </div>
          {!isEditMode && (
            <div className="form-group">
              <label className="car-account-label">Vehicle Selection Mode</label>
              <div className="dealer-toggle-group">
                <button
                  type="button"
                  className={`dealer-toggle-btn ${!addVehicleInForm ? 'active' : ''}`}
                  onClick={() => setAddVehicleInForm(false)}
                >
                  Select from Inventory
                </button>
                <button
                  type="button"
                  className={`dealer-toggle-btn ${addVehicleInForm ? 'active' : ''}`}
                  onClick={() => {
                    setAddVehicleInForm(true);
                    setValue('vehicleId', ''); // Clear selection
                  }}
                >
                  Add Vehicle manually
                </button>
              </div>
            </div>
          )}
          {!addVehicleInForm && (
            <>
              <p className="car-account-dealers-desc">Select a vehicle from inventory. Only available vehicles are listed.</p>
              <div className="form-group">
                <label>Select from Inventory *</label>
                <select
                  {...register('vehicleId', { required: !addVehicleInForm && 'Select a vehicle or add vehicle in form' })}
                  disabled={isEditMode}
                >
                  <option value="">— Select vehicle —</option>
                  {inventory.map((v) => (
                    <option key={v._id} value={v._id}>{v.make} {v.model} – {v.chassisNo}{v.registrationNo ? ` (${v.registrationNo})` : ''}</option>
                  ))}
                </select>
                {isEditMode && <span className="form-hint">Vehicle selection cannot be changed after creation.</span>}
                {!isEditMode && inventory.length === 0 && <span className="form-hint">No available vehicles. Add vehicles in Inventory or use &quot;Add vehicle in form&quot; above.</span>}
                {errors.vehicleId && <span className="form-error">{errors.vehicleId.message}</span>}
              </div>
            </>
          )}
          {addVehicleInForm && (
            <>
              <p className="car-account-dealers-desc">Enter vehicle details below. This vehicle is not added to inventory — it is stored only with this delivery order.</p>
              <div className="form-row form-row-2">
                <div className="form-group"><label>Chassis No *</label><input {...register('chassisNo', { required: addVehicleInForm && 'Required' })} /></div>
                <div className="form-group"><label>Engine No *</label><input {...register('engineNo', { required: addVehicleInForm && 'Required' })} /></div>
                <div className="form-group"><label>Registration No</label><input {...register('registrationNo')} /></div>
                <div className="form-group"><label>Year of Registration</label><input type="date" {...register('dateOfRegistration')} /></div>
                <div className="form-group"><label>Make *</label><input {...register('make', { required: addVehicleInForm && 'Required' })} /></div>
                <div className="form-group"><label>Model *</label><input {...register('model', { required: addVehicleInForm && 'Required' })} /></div>
                <div className="form-group"><label>Year of Manufacturing</label><input {...register('yearOfManufacturing')} /></div>
                <div className="form-group"><label>Color</label><input {...register('color')} /></div>
                <div className="form-group"><label>Engine Capacity</label><input {...register('hp')} /></div>
              </div>

              <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Owner Details</h3>
              <div className="form-row form-row-2">
                <div className="form-group"><label>Owner Name *</label><input {...register('ownerName', { required: addVehicleInForm && 'Required' })} placeholder="Owner Name" /></div>
                <div className="form-group"><label>S/O</label><input {...register('ownerFatherName')} placeholder="Father's Name" /></div>
                <div className="form-group">
                  <label>Owner CNIC</label>
                  <input
                    {...register('ownerCnic', {
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
                  {errors.ownerCnic && <span className="form-error">{errors.ownerCnic.message}</span>}
                </div>
                <div className="form-group">
                  <label>Owner Phone</label>
                  <input
                    {...register('ownerTelephone', {
                      pattern: {
                        value: /^\d{4}-\d{7}$/,
                        message: 'Format: 0300-1234567'
                      },
                      onChange: (e) => {
                        e.target.value = formatPhone(e.target.value);
                      }
                    })}
                    placeholder="0300-1234567"
                    maxLength={12}
                  />
                  {errors.ownerTelephone && <span className="form-error">{errors.ownerTelephone.message}</span>}
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Owner Address</label><input {...register('ownerAddress')} placeholder="Address" /></div>
              </div>
              {(errors.chassisNo || errors.engineNo || errors.make || errors.model) && (
                <span className="form-error">Chassis No, Engine No, Make and Model are required.</span>
              )}
            </>
          )}
        </section>

        <section className="car-account-section">
          <h2>CPLC Details</h2>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label>CPLC Counter No.</label>
              <input {...register('cplcVerification')} placeholder="Counter No." />
            </div>
            <div className="form-group">
              <label>CPLC Date</label>
              <input type="date" {...register('cplcDate')} />
            </div>
            <div className="form-group">
              <label>CPLC Time</label>
              <input type="time" {...register('cplcTime')} />
            </div>
          </div>
        </section>

        <section className="car-account-section">
          <h2>Transaction Details</h2>
          <p className="car-account-dealers-desc">Total amount and payment breakdown: how much by Cash, Bank (which bank), or Cheque (cheque number).</p>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label>Total Amount (PKR) *</label>
              <input type="number" step="0.01" min="0" {...register('amount', { required: 'Required', min: 0 })} />
              {watchAmount > 0 && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: '500', fontStyle: 'italic' }}>
                  {numberToWords(watchAmount)}
                </div>
              )}
              {errors.amount && <span className="form-error">{errors.amount.message}</span>}
            </div>
            <div className="form-group">
              <label>Amount Received (Calculated)</label>
              <div className="form-control-static" style={{ color: 'var(--success-color, #10b981)', fontWeight: 'bold' }}>
                PKR {totalReceived.toLocaleString()}
              </div>
            </div>
            <div className="form-group">
              <label>Balance {balance < 0 ? '(Excess)' : '(Due)'}</label>
              <div className="form-control-static" style={{ color: balance === 0 ? 'var(--text-muted, #6b7280)' : (balance > 0 ? 'var(--danger-color, #ef4444)' : 'var(--success-color, #10b981)'), fontWeight: 'bold' }}>
                PKR {Math.abs(balance).toLocaleString()}
              </div>
              {balance < 0 && <span className="form-error" style={{ display: 'block', marginTop: '0.25rem' }}>Payments exceed total amount!</span>}
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
          <p className="car-account-label">Payment breakdown (Cash / Bank / Cheque and amount for each)</p>
          {paymentRows.map((row, i) => (
            <div key={i} className="payment-row">
              <select value={row.method} onChange={(e) => updatePaymentRow(i, 'method', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="online_banking">Online Banking</option>
                <option value="cheque">Cheque</option>
                <option value="token">Token</option>
              </select>
              <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={(e) => updatePaymentRow(i, 'amount', e.target.value)} />
              {(row.method === 'online_banking' || row.method === 'token') && <input type="text" placeholder="Details" value={row.bankDetails} onChange={(e) => updatePaymentRow(i, 'bankDetails', e.target.value)} />}
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
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Commission (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input type="number" step="0.01" min="0" max="100" placeholder="e.g. 5" {...register('commission')} style={{ flex: 1 }} />
              {watchAmount > 0 && watchCommission > 0 && (
                <span className="text-success" style={{ fontWeight: 'bold', minWidth: 'fit-content' }}>
                  Amount: PKR {((Number(watchAmount) * Number(watchCommission)) / 100).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </section>
        {forCarDealers && (
          <section className="car-account-section">
            <h2>For Car Dealers</h2>
            <p className="car-account-dealers-desc">Owner / Dealer (left) and Purchaser (right). Stamp / Sign lines are not in the form — shown as empty space for signature on the PDF.</p>
            <div className="car-account-dealers-grid">
              <div className="car-account-dealers-col">
                <div className="form-group"><label>Seller Name *</label><input {...register('sellerName')} placeholder="Seller Name" /></div>
                <div className="form-group"><label>S/O</label><input {...register('sellerFatherName')} placeholder="Father's Name" /></div>
                <div className="form-group">
                  <label>Seller CNIC</label>
                  <input
                    {...register('sellerCnic', {
                      pattern: { value: /^\d{5}-\d{7}-\d{1}$/, message: 'Format: 12345-1234567-1' },
                      onChange: (e) => e.target.value = formatCnic(e.target.value)
                    })}
                    placeholder="12345-1234567-1"
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label>Seller Phone</label>
                  <input
                    {...register('sellerPhone', {
                      pattern: { value: /^\d{4}-\d{7}$/, message: 'Format: 0300-1234567' },
                      onChange: (e) => e.target.value = formatPhone(e.target.value)
                    })}
                    placeholder="0300-1234567"
                    maxLength={12}
                  />
                </div>
                <div className="form-group"><label>Seller Address</label><input {...register('sellerAddress')} placeholder="Address" /></div>
                <div className="form-group">
                  <label>Seller Nadra Biometric Date</label>
                  <input type="date" {...register('sellerBiometricDate')} />
                </div>
                <input type="hidden" {...register('thumbImpression')} />
                <input type="hidden" {...register('titleStampSign')} />
              </div>
              <div className="car-account-dealers-col">
                <div className="form-group"><label>Name *</label><input {...register('purchaserName')} placeholder="Name" /></div>
                <div className="form-group"><label>S/O</label><input {...register('purchaserFatherName')} placeholder="Father's Name" /></div>
                <div className="form-group"><label>Phone</label><input {...register('purchaserPhone')} placeholder="Phone" /></div>
                <div className="form-group"><label>Address</label><input {...register('purchaserAddress')} placeholder="Address" /></div>
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
                <div className="form-group">
                  <label>Purchaser Nadra Biometric Date</label>
                  <input type="date" {...register('purchaserBiometricDate')} />
                </div>
                <input type="hidden" {...register('purchaserSignature')} />
              </div>
            </div>
          </section>
        )}

        {!forCarDealers && (
          <section className="car-account-section">
            <h2>Seller Details</h2>
            <p className="car-account-dealers-desc">Enter details of the person selling the vehicle (if different from Owner).</p>
            <div className="form-row form-row-2">
              <div className="form-group"><label>Seller Name *</label><input {...register('sellerName')} placeholder="Seller Name" /></div>
              <div className="form-group"><label>S/O</label><input {...register('sellerFatherName')} placeholder="Father's Name" /></div>
              <div className="form-group">
                <label>Seller CNIC</label>
                <input
                  {...register('sellerCnic', {
                    pattern: { value: /^\d{5}-\d{7}-\d{1}$/, message: 'Format: 12345-1234567-1' },
                    onChange: (e) => e.target.value = formatCnic(e.target.value)
                  })}
                  placeholder="12345-1234567-1"
                  maxLength={15}
                />
                {errors.sellerCnic && <span className="form-error">{errors.sellerCnic.message}</span>}
              </div>
              <div className="form-group">
                <label>Seller Phone</label>
                <input
                  {...register('sellerPhone', {
                    pattern: { value: /^\d{4}-\d{7}$/, message: 'Format: 0300-1234567' },
                    onChange: (e) => e.target.value = formatPhone(e.target.value)
                  })}
                  placeholder="0300-1234567"
                  maxLength={12}
                />
                {errors.sellerPhone && <span className="form-error">{errors.sellerPhone.message}</span>}
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Seller Address</label><input {...register('sellerAddress')} placeholder="Address" /></div>
              <div className="form-group">
                <label>Seller Nadra Biometric Date</label>
                <input type="date" {...register('sellerBiometricDate')} />
              </div>
            </div>
            <input type="hidden" {...register('thumbImpression')} />
            <input type="hidden" {...register('titleStampSign')} />
            <input type="hidden" {...register('purchaserSignature')} />
          </section>
        )}

        {!forCarDealers && (
          <section className="car-account-section">
            <h2>Purchaser Details</h2>
            {type === 'VEHICLE PURCHASE ORDER' ? (
              <div className="form-row form-row-2">
                <div className="form-group"><label>Name</label><input {...register('purchaserSalesmanName')} placeholder="Name" /></div>
              </div>
            ) : (
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Name *</label>
                  <input {...register('purchaserName', { required: type !== 'VEHICLE PURCHASE ORDER' && 'Purchaser name is required' })} placeholder="Purchaser name" />
                  {errors.purchaserName && <span className="form-error">{errors.purchaserName.message}</span>}
                </div>
                <div className="form-group">
                  <label>S/O, W/O, D/O</label>
                  <input {...register('purchaserFatherName')} placeholder="Father's Name" />
                </div>
              </div>
            )}
            <div className="form-row form-row-2">
              <div className="form-group"><label>Purchaser Address</label><input {...register('purchaserAddress')} /></div>
              <div className="form-group">
                <label>N.I.C / CNIC</label>
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
              <div className="form-group">
                <label>Phone</label>
                <input
                  {...register('purchaserPhone', {
                    pattern: {
                      value: /^\d{4}-\d{7}$/,
                      message: 'Format: 0300-1234567'
                    },
                    onChange: (e) => {
                      e.target.value = formatPhone(e.target.value);
                    }
                  })}
                  placeholder="0300-1234567"
                  maxLength={12}
                />
                {errors.purchaserPhone && <span className="form-error">{errors.purchaserPhone.message}</span>}
              </div>
              <div className="form-group">
                <label>Purchaser Nadra Biometric Date</label>
                <input type="date" {...register('purchaserBiometricDate')} />
              </div>
            </div>
          </section>
        )}


        <section className="car-account-section">
          <h2>Agent / Sales Person Details</h2>
          <div className="form-row form-row-2">
            <div className="form-group"><label>Agent Name</label><input {...register('agentName')} placeholder="Agent name" /></div>
            <div className="form-group">
              <label>Agent CNIC</label>
              <input
                {...register('agentCnic', {
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
              {errors.agentCnic && <span className="form-error">{errors.agentCnic.message}</span>}
            </div>
            <div className="form-group"><label>Agent Address</label><input {...register('agentAddress')} placeholder="Address" /></div>
            <div className="form-group">
              <label>Agent Phone</label>
              <input
                {...register('agentPhone', {
                  pattern: {
                    value: /^\d{4}-\d{7}$/,
                    message: 'Format: 0300-1234567'
                  },
                  onChange: (e) => {
                    e.target.value = formatPhone(e.target.value);
                  }
                })}
                placeholder="0300-1234567"
                maxLength={12}
              />
              {errors.agentPhone && <span className="form-error">{errors.agentPhone.message}</span>}
            </div>
          </div>
        </section>

        <section className="car-account-section">
          <h2>Remarks, Document Detail & Note</h2>
          <div className="form-group">
            <label>Remarks</label>
            <textarea {...register('remarks')} rows={2} />
          </div>
          <div className="form-group">
            <label>Document Detail</label>
            <div className="document-details-grid">
              {DOCUMENT_CHECKLIST.map((item) => (
                <label key={item} className="checkbox-item">
                  <input
                    type="checkbox"
                    value={item}
                    {...register('documentDetails')}
                  />
                  {item}
                </label>
              ))}
            </div>
            <span className="form-hint">Select the documents provided. These will be shown as a list on the PDF.</span>
          </div>
        </section>

        <div className="car-account-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {isEditMode ? (submitting ? 'Saving...' : 'Save changes') : (submitting ? 'Creating...' : (type === 'VEHICLE PURCHASE ORDER' ? 'Create Purchase Order' : 'Create Delivery Order'))}
          </button>
        </div>
      </form>
    </div >
  );
}
