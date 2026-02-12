import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Car, User, Building2, Phone, ShieldCheck, FileText, Calendar, Hash, Palette } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import './Verification.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
          <ShieldCheck className="loading-icon" size={64} />
          <h2>Verifying Transaction</h2>
          <p>Securing verification data...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="verification-page error-page">
        <div className="verification-error-card">
          <XCircle className="error-icon" size={80} />
          <h1>Invalid Verification</h1>
          <p className="error-message">{error || data?.message || 'This record could not be found in our secure database.'}</p>
          <div className="error-badge">
            <ShieldCheck size={14} />
            <span>Verification Failed</span>
          </div>
        </div>
      </div>
    );
  }

  const { receiptNumber, type, transactionDate, showroom, vehicle, purchaserName } = data;

  // Fix logo path
  let logoUrl = null;
  if (showroom?.logoPath) {
    if (showroom.logoPath.startsWith('/api')) {
      const baseUrl = API_BASE_URL.replace('/api', '');
      logoUrl = `${baseUrl}${showroom.logoPath}`;
    } else {
      logoUrl = `${API_BASE_URL}/uploads/logos/${showroom.logoPath}`;
    }
  }

  // Detect showroom and set colors
  const isCarMarkaz = showroom?.name?.toLowerCase().replace(/\s/g, '').includes('carmarkaz');
  const colorStyles = isCarMarkaz ? {
    '--primary-color': '#fd0a0b',
    '--primary-light': '#fee2e2',
    '--primary-bg': '#fef2f2',
    '--gradient-start': '#fef2f2',
    '--gradient-end': '#fee2e2',
  } : {
    '--primary-color': '#0051a3',
    '--primary-light': '#dbeafe',
    '--primary-bg': '#eff6ff',
    '--gradient-start': '#eff6ff',
    '--gradient-end': '#dbeafe',
  };

  return (
    <div className="verification-page" style={colorStyles}>
      <div className="verification-container">
        {/* Header with Logo */}
        <div className="verify-header">
          <div className="verify-logo-section">
            {logoUrl && (
              <img src={logoUrl} alt={showroom.name} className="verify-logo" />
            )}
            <h1 className="showroom-name">{showroom?.name}</h1>
          </div>
          <div className="verify-badge">
            <ShieldCheck size={16} />
            <span>Verified Transaction</span>
          </div>
        </div>

        {/* Success Hero */}
        <div className="verify-hero">
          <div className="success-icon-wrapper">
            <CheckCircle className="success-icon" size={72} />
          </div>
          <h2 className="verify-title">Transaction Authenticated</h2>
          <p className="verify-subtitle">
            This digital receipt has been verified against our secure ledger.
          </p>
          <div className="receipt-number-badge">
            <Hash size={16} />
            <span>{receiptNumber}</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="verify-content">
          {/* Vehicle Information */}
          <div className="verify-section vehicle-section">
            <div className="section-header">
              <Car size={20} />
              <h3>Vehicle Information</h3>
            </div>
            <div className="info-grid">
              <div className="info-item featured">
                <span className="info-label">Make & Model</span>
                <span className="info-value">{vehicle?.make} {vehicle?.model}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Chassis Number</span>
                <span className="info-value">{vehicle?.chassisNo || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Engine Number</span>
                <span className="info-value">{vehicle?.engineNo || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Color</span>
                <span className="info-value">
                  {vehicle?.color && <Palette size={14} className="inline-icon" />}
                  {vehicle?.color || '—'}
                </span>
              </div>
              {vehicle?.year && (
                <div className="info-item">
                  <span className="info-label">Year</span>
                  <span className="info-value">{vehicle.year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="verify-sidebar">
            <div className="verify-section">
              <div className="section-header">
                <User size={18} />
                <h3>Purchaser</h3>
              </div>
              <div className="purchaser-card">
                <p className="purchaser-name">{purchaserName || '—'}</p>
                <span className="transaction-type">{type === 'sale' ? 'Sale' : 'Purchase'}</span>
              </div>
            </div>

            <div className="verify-section">
              <div className="section-header">
                <Calendar size={18} />
                <h3>Transaction Date</h3>
              </div>
              <div className="date-card">
                <p className="date-value">
                  {transactionDate ? format(new Date(transactionDate), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="verify-footer">
          <div className="showroom-contact">
            <div className="contact-item">
              <Building2 size={18} className="contact-icon" />
              <div>
                <strong>{showroom?.name}</strong>
                <p>{showroom?.address}</p>
              </div>
            </div>
            {showroom?.phone && (
              <div className="contact-item">
                <Phone size={18} className="contact-icon" />
                <p>{showroom.phone}</p>
              </div>
            )}
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} {showroom?.name}. All rights reserved.</p>
            <div className="security-badge">
              <ShieldCheck size={12} />
              <span>Secure Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
