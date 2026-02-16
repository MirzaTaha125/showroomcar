import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, ShieldCheck, Hash, Calendar, FileText, Settings, Palette, Gauge, UserCheck, Car, MapPin, Phone } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { formatPhone, getLogoUrl } from '../api/utils';
import './Verification.css';


export default function Verify() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Invalid verification link.');
      setLoading(false);
      return;
    }
    api
      .get(`/verify/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Verification failed.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="verification-page">
        <div className="verification-loading-card">
          <div className="loading-spinner"></div>
          <h2>Verifying Document</h2>
          <p>Please wait while we authenticate the record...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="verification-page">
        <div className="verification-error-card">
          <XCircle className="error-icon" size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
          <h1>Verification Failed</h1>
          <p>{error || data?.message || 'This record could not be authenticated.'}</p>
        </div>
      </div>
    );
  }

  const { receiptNumber, transactionDate, showroom, vehicle, ownerName } = data;

  const logoUrl = getLogoUrl(showroom?.logoPath, api.defaults.baseURL);


  const isCarMarkaz = showroom?.name?.toLowerCase().replace(/\s/g, '').includes('carmarkaz');
  const accentColor = isCarMarkaz ? '#fd0a0b' : '#0051a3';

  return (
    <div className="verification-page" style={{ '--accent-primary': accentColor }}>
      <div className="verification-container">
        <header className="verify-header">
          <div className="verify-logo-section">
            {logoUrl && <img src={logoUrl} alt={showroom.name} className="verify-logo" />}
            <h1 className="showroom-name">{showroom?.name}</h1>
          </div>
        </header>

        <div className="verify-status-banner">
          <div className="status-badge">
            <UserCheck size={18} />
            <span>Authenticated Record</span>
          </div>
        </div>

        <section className="ownership-card">
          <span className="owner-label">Registered Owner</span>
          <h2 className="owner-name-display">{ownerName || 'N/A'}</h2>
        </section>

        <div className="specs-section">
          <div className="spec-item-hero" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem 2rem', marginBottom: '1rem' }}>
            <div className="brand-icon-wrapper" style={{ background: 'var(--accent-light)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <Car size={48} strokeWidth={1} />
            </div>
            <div>
              <span className="spec-label" style={{ marginBottom: '0.25rem' }}>Vehicle Information</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{vehicle?.make} {vehicle?.model}</h3>
            </div>
          </div>

          <div className="spec-item">
            <span className="spec-label">Registration No.</span>
            <span className="spec-value">{vehicle?.registrationNo || 'UNREGISTERED'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Engine Capacity</span>
            <span className="spec-value">{vehicle?.hp ? `${vehicle.hp} CC / HP` : 'N/A'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Chassis Number</span>
            <span className="spec-value">{vehicle?.chassisNo || 'N/A'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Engine Number</span>
            <span className="spec-value">{vehicle?.engineNo || 'N/A'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Make & Model</span>
            <span className="spec-value">{vehicle?.make} {vehicle?.model}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Exterior Color</span>
            <span className="spec-value">{vehicle?.color || 'N/A'}</span>
          </div>
        </div>

        <div className="verify-contact-bar">
          <div className="contact-bar-item">
            <MapPin size={24} className="contact-bar-icon" />
            <div className="contact-bar-text">
              <strong>Location</strong>
              {showroom?.address || 'N/A'}
            </div>
          </div>
          <div className="contact-bar-item">
            <Phone size={24} className="contact-bar-icon" />
            <div className="contact-bar-text">
              <strong>Contact</strong>
              {showroom?.phone ? formatPhone(showroom.phone) : 'N/A'}
            </div>

          </div>
        </div>

        <footer className="meta-footer">
          <div className="meta-item">
            <Hash size={16} />
            <span>Ref: <strong>{receiptNumber}</strong></span>
          </div>
          <div className="meta-item">
            <Calendar size={16} />
            <span>Document Date: <strong>{data.verifiedAt ? format(new Date(data.verifiedAt), 'PPP p') : (transactionDate ? format(new Date(transactionDate), 'PPP') : 'N/A')}</strong></span>
          </div>
          <div className="meta-item">
            <ShieldCheck size={16} />
            <span>Status: <strong>SECURED</strong></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
