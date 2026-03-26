import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/client';
import { formatCnic, formatPhone } from '../api/utils';
import './ui.css';
import '../pages/Vehicles.css';

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

export function VehicleEditModal({ vehicle, onClose, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const defaultValues = vehicleFields.reduce(
    (acc, f) => ({ ...acc, [f.name]: vehicle[f.name] || '' }),
    {
      status: vehicle.status || 'available',
      ownerName: vehicle.ownerName || '',
      fatherName: vehicle.fatherName || '',
      ownerCnic: vehicle.ownerCnic || '',
      ownerPhone: vehicle.ownerPhone || '',
      ownerAddress: vehicle.ownerAddress || '',
    }
  );

  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.put(`/vehicles/${vehicle._id}`, data);
      onSaved(res.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal vehicles-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Vehicle</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body vehicles-form">
          {error && <div className="alert alert-error">{error}</div>}
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
          <div className="form-group">
            <label>Status</label>
            <select {...register('status')}>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
