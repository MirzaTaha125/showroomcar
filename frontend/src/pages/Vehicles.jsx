import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Car, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCnic, formatPhone } from '../api/utils';
import '../components/ui.css';
import './Vehicles.css';

const vehicleFields = [
  { name: 'chassisNo', label: 'Chassis No', required: true },
  { name: 'engineNo', label: 'Engine No', required: true },
  { name: 'registrationNo', label: 'Registration No', required: false },
  { name: 'dateOfRegistration', label: 'Year of Registration', required: false, type: 'date' },
  { name: 'make', label: 'Make', required: true },
  { name: 'model', label: 'Model', required: true },
  { name: 'yearOfManufacturing', label: 'Year of Manufacturing', required: false },
  { name: 'color', label: 'Color', required: false },
  { name: 'engineCapacity', label: 'Engine Capacity', required: false },
];

export default function Vehicles() {
  const { isAdmin, isController } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterShowroom, setFilterShowroom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const defaultValues = vehicleFields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {
    showroom: '', status: 'available',
    ownerName: '', fatherName: '', ownerCnic: '', ownerPhone: '', ownerAddress: '',
  });
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ defaultValues });

  const fetchVehicles = () => {
    const params = {};
    if (isAdmin && filterShowroom) params.showroomId = filterShowroom;
    if (filterStatus) params.status = filterStatus;
    api.get('/vehicles', { params })
      .then((res) => setVehicles(res.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) api.get('/showrooms').then((res) => setShowrooms(res.data)).catch(() => { });
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    fetchVehicles();
  }, [isAdmin, filterShowroom, filterStatus]);

  const openCreate = () => {
    setEditing(null);
    reset({ ...defaultValues, showroom: isAdmin ? '' : undefined, status: 'available' });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    vehicleFields.forEach((f) => setValue(f.name, row[f.name] || ''));
    setValue('status', row.status || 'available');
    setValue('showroom', row.showroom?._id || '');
    setValue('ownerName', row.ownerName || '');
    setValue('fatherName', row.fatherName || '');
    setValue('ownerCnic', row.ownerCnic || '');
    setValue('ownerPhone', row.ownerPhone || '');
    setValue('ownerAddress', row.ownerAddress || '');
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    const payload = { ...data };
    if (!isAdmin) delete payload.showroom;
    try {
      if (editing) {
        await api.put(`/vehicles/${editing._id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.');
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
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading) return <div className="page-loading">Loading inventory...</div>;

  return (
    <div className="vehicles-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage vehicle stock. Add vehicles with full details. Vehicles are marked sold when used in a Delivery Order.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Vehicle
        </button>

      </div>


      {isAdmin && (
        <div className="vehicles-filters card">
          <select value={filterShowroom} onChange={(e) => setFilterShowroom(e.target.value)} className="vehicles-filter-select">
            <option value="">All showrooms</option>
            {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="vehicles-filter-select">
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={onDeleteConfirm}
        title="Delete vehicle"
        message="Are you sure you want to delete this vehicle from inventory? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Chassis</th>
                <th>Make / Model</th>
                <th>Color</th>
                {isAdmin && <th>Showroom</th>}
                <th>Status</th>
                {!isController && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="table-empty">No inventory yet.</td></tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v._id}>
                    <td><code>{v.chassisNo?.toUpperCase()}</code></td>
                    <td>{v.make?.toUpperCase()} {v.model?.toUpperCase()}</td>
                    <td>{v.color?.toUpperCase()}</td>
                    {isAdmin && <td>{v.showroom?.name?.toUpperCase() || '—'}</td>}
                    <td><span className={v.status === 'sold' ? 'badge badge-warning' : 'badge badge-success'}>{v.status?.toUpperCase()}</span></td>
                    {!isController && (
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}><Pencil size={14} /></button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(v._id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>

                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal vehicles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="modal-body vehicles-form">
              {isAdmin && !editing && (
                <div className="form-group">
                  <label>Showroom *</label>
                  <select {...register('showroom', { required: isAdmin && !editing && 'Showroom is required' })}>
                    <option value="">— Select —</option>
                    {showrooms.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  {errors.showroom && <span className="form-error">{errors.showroom.message}</span>}
                </div>
              )}
              <div className="form-row">
                {vehicleFields.map((f) => (
                  <div key={f.name} className="form-group">
                    <label>{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type || 'text'}
                      {...register(f.name, { required: f.required && `${f.label} is required` })}
                      placeholder={f.type === 'date' ? '' : f.label}
                    />
                    {errors[f.name] && <span className="form-error">{errors[f.name].message}</span>}
                  </div>
                ))}
              </div>
              <div className="form-section-title">Owner Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Owner Name *</label>
                  <input {...register('ownerName', { required: 'Owner Name is required' })} placeholder="Owner Name" />
                  {errors.ownerName && <span className="form-error">{errors.ownerName.message}</span>}
                </div>
                <div className="form-group">
                  <label>S/O</label>
                  <input {...register('fatherName')} placeholder="Father's Name" />
                </div>
                <div className="form-group">
                  <label>Owner CNIC</label>
                  <input
                    {...register('ownerCnic', {
                      onChange: (e) => { e.target.value = formatCnic(e.target.value); },
                    })}
                    placeholder="12345-1234567-1"
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label>Owner Phone</label>
                  <input
                    {...register('ownerPhone', {
                      onChange: (e) => { e.target.value = formatPhone(e.target.value); },
                    })}
                    placeholder="0300-1234567"
                    maxLength={12}
                  />
                </div>
                <div className="form-group">
                  <label>Owner Address</label>
                  <input {...register('ownerAddress')} placeholder="Address" />
                </div>
              </div>

              {editing && (
                <div className="form-group">
                  <label>Status</label>
                  <select {...register('status')}>
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
