import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import api from '../api/client';
import { formatCnic, formatPhone } from '../api/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../components/ui.css';
import './Users.css';


export default function Users() {
  const [users, setUsers] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'user', showroom: '', isActive: true, address: '', phone: '', cnic: '' },
  });
  const role = watch('role');

  const fetch = () => {
    Promise.all([api.get('/users'), api.get('/showrooms')])
      .then(([u, s]) => {
        setUsers(u.data);
        setShowrooms(s.data);
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', password: '', role: 'user', showroom: '', isActive: true, address: '', phone: '', cnic: '' });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setValue('name', row.name);
    setValue('email', row.email);
    setValue('role', row.role);
    setValue('showroom', row.showroom?._id || '');
    setValue('isActive', row.isActive !== false);
    setValue('address', row.address || '');
    setValue('phone', row.phone || '');
    setValue('cnic', row.cnic || '');
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    const payload = {
      name: data.name,
      role: data.role,
      showroom: data.role === 'user' && data.showroom ? data.showroom : undefined,
      isActive: !!data.isActive,
      address: data.address,
      phone: data.phone,
      cnic: data.cnic,
    };
    if (editing) {
      payload.email = data.email;
      if (data.password) payload.password = data.password;
    } else {
      payload.email = data.email;
      payload.password = data.password;
    }
    try {
      if (editing) {
        await api.put(`/users/${editing._id}`, payload);
      } else {
        await api.post('/auth/register', payload);
      }
      setModalOpen(false);
      fetch();
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
      await api.delete(`/users/${id}`);
      fetch();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading) return <div className="page-loading">Loading users...</div>;

  return (
    <div className="users-page">
      <div className="page-header card-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage users and assign them to showrooms (Admin only).</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={18} /> Add User
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={onDeleteConfirm}
        title="Delete user"
        message="Are you sure you want to delete this user? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Showroom</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">No users yet.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className={u.role === 'admin' ? 'badge badge-warning' : 'badge badge-muted'}>{u.role === 'admin' ? 'Admin' : 'Controller'}</span></td>
                    <td>{u.showroom?.name || '—'}</td>
                    <td><span className={u.isActive !== false ? 'badge badge-success' : 'badge badge-muted'}>{u.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}><Pencil size={14} /></button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteClick(u._id)} title="Delete"><Trash2 size={14} /></button>
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
          <div className="modal users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit User' : 'Add User'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input {...register('name', { required: 'Name is required' })} placeholder="Full name" />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} placeholder="email@example.com" disabled={!!editing} />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>
              <div className="form-group">
                <label>Password {editing ? '(leave blank to keep)' : '*'}</label>
                <input type="password" {...register('password', { required: !editing && 'Password is required', minLength: editing ? 0 : 6 })} placeholder="Min 6 characters" />
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>CNIC *</label>
                  <input
                    {...register('cnic', {
                      required: 'CNIC is required',
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
                  {errors.cnic && <span className="form-error">{errors.cnic.message}</span>}
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    {...register('phone', {
                      required: 'Phone is required',
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
                  {errors.phone && <span className="form-error">{errors.phone.message}</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Address *</label>
                <input {...register('address', { required: 'Address is required' })} placeholder="Full address" />
                {errors.address && <span className="form-error">{errors.address.message}</span>}
              </div>

              <div className="form-group">
                <label>Role</label>
                <select {...register('role')}>
                  <option value="admin">Admin</option>
                  <option value="user">Controller</option>
                </select>
              </div>
              {role === 'user' && (
                <div className="form-group">
                  <label>Showroom</label>
                  <select {...register('showroom')}>
                    <option value="">— Select —</option>
                    {showrooms.filter((s) => s.isActive !== false).map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
