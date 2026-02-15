import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Pencil, Trash2, MapPin, Phone, Image, Facebook, Instagram } from 'lucide-react';
import api from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './Showrooms.css';

const getLogoUrl = (logoPath) => {
  if (!logoPath) return null;
  if (logoPath.startsWith('http')) return logoPath;
  const base = (api.defaults.baseURL || '').replace(/\/api$/, '');
  return logoPath.startsWith('/') ? `${base}${logoPath}` : `${base}/api${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;
};

export default function Showrooms() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      isActive: true,
      logoPath: '',
      'socialLinks.facebook': '',
      'socialLinks.instagram': '',
      'socialLinks.whatsapp': '',
    },
  });

  const fetchShowrooms = () => {
    api.get('/showrooms').then((res) => setList(res.data)).catch((e) => setError(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShowrooms();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setLogoFile(null);
    setLogoPreview(null);
    reset({
      name: '',
      address: '',
      phone: '',
      isActive: true,
      logoPath: '',
      'socialLinks.facebook': '',
      'socialLinks.instagram': '',
      'socialLinks.whatsapp': '',
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setLogoFile(null);
    setLogoPreview(row.logoPath ? getLogoUrl(row.logoPath) : null);
    setValue('name', row.name);
    setValue('address', row.address || '');
    setValue('phone', row.phone || '');
    setValue('isActive', row.isActive !== false);
    setValue('logoPath', row.logoPath || '');
    setValue('socialLinks.facebook', row.socialLinks?.facebook || '');
    setValue('socialLinks.instagram', row.socialLinks?.instagram || '');
    setValue('socialLinks.whatsapp', row.socialLinks?.whatsapp || '');
    setModalOpen(true);
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    try {
      let logoPath = data.logoPath || editing?.logoPath || '';
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await api.post('/showrooms/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        logoPath = uploadRes.data.logoPath || logoPath;
      }
      const payload = {
        name: (data.name || '').trim(),
        address: (data.address || '').trim(),
        phone: (data.phone || '').trim(),
        isActive: editing ? !!data.isActive : true,
        logoPath: logoPath || '',
        socialLinks: {
          facebook: (data.socialLinks?.facebook ?? data['socialLinks.facebook'] ?? '').trim(),
          instagram: (data.socialLinks?.instagram ?? data['socialLinks.instagram'] ?? '').trim(),
          whatsapp: (data.socialLinks?.whatsapp ?? data['socialLinks.whatsapp'] ?? '').trim(),
        },
      };
      if (editing) {
        await api.put(`/showrooms/${editing._id}`, payload);
      } else {
        await api.post('/showrooms', payload);
      }
      setModalOpen(false);
      setError('');
      fetchShowrooms();
    } catch (e) {
      const msg = e.response?.data?.message
        || (Array.isArray(e.response?.data?.errors) && e.response.data.errors[0]?.msg)
        || e.message
        || 'Save failed.';
      setError(msg);
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
      await api.delete(`/showrooms/${id}`);
      fetchShowrooms();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading) return <div className="page-loading">Loading showrooms...</div>;

  return (
    <div className="showrooms-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title">Showrooms</h1>
          <p className="page-subtitle">Add, edit, or remove showrooms. Logo, address, and social links (Instagram, WhatsApp, Facebook).</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Showroom
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={onDeleteConfirm}
        title="Delete showroom"
        message="Are you sure you want to delete this showroom? Users and data may be affected. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Social</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">No showrooms yet. Add one to get started.</td></tr>
              ) : (
                list.map((s) => (
                  <tr key={s._id}>
                    <td>
                      {s.logoPath ? (
                        <img src={getLogoUrl(s.logoPath)} alt="" className="showroom-logo-thumb" />
                      ) : (
                        <span className="showroom-logo-placeholder"><Image size={20} /></span>
                      )}
                    </td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.address || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td className="showroom-social-cell">
                      {s.socialLinks?.instagram && <a href={s.socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">Instagram</a>}
                      {s.socialLinks?.whatsapp && <a href={`https://wa.me/${(s.socialLinks.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">WhatsApp</a>}
                      {s.socialLinks?.facebook && <a href={s.socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">Facebook</a>}
                      {!s.socialLinks?.instagram && !s.socialLinks?.whatsapp && !s.socialLinks?.facebook && '—'}
                    </td>
                    <td><span className={s.isActive !== false ? 'badge badge-success' : 'badge badge-muted'}>{s.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(s._id)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal showrooms-modal showrooms-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Showroom' : 'Add Showroom'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
              <div className="showroom-form-logo">
                <label>Logo</label>
                <div className="showroom-logo-upload">
                  <div className="showroom-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" />
                    ) : (
                      <span className="showroom-logo-empty">No logo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    key={editing?._id ?? 'new'}
                    accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                    onChange={onLogoChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input {...register('name', { required: 'Name is required' })} placeholder="Showroom name" />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input {...register('address')} placeholder="Full address" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input {...register('phone')} placeholder="Phone number" />
              </div>
              <div className="showroom-social-fields">
                <label>Social links</label>
                <div className="form-group">
                  <label className="form-label-small">Facebook (URL)</label>
                  <input {...register('socialLinks.facebook')} placeholder="https://facebook.com/..." />
                </div>
                <div className="form-group">
                  <label className="form-label-small">Instagram (URL)</label>
                  <input {...register('socialLinks.instagram')} placeholder="https://instagram.com/..." />
                </div>
                <div className="form-group">
                  <label className="form-label-small">WhatsApp (number or link)</label>
                  <input {...register('socialLinks.whatsapp')} placeholder="+92 300 1234567 or https://wa.me/..." />
                </div>
              </div>
              {editing && (
                <div className="form-group form-check">
                  <label>
                    <input type="checkbox" {...register('isActive')} />
                    Active
                  </label>
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
