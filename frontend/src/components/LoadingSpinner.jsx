import React from 'react';
import './LoadingSpinner.css';

export function LoadingSpinner({ size = 'medium', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`spinner spinner-${size}`}></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return <div className={`spinner spinner-${size}`}></div>;
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <LoadingSpinner size="large" />
        <p>{message}</p>
      </div>
    </div>
  );
}
