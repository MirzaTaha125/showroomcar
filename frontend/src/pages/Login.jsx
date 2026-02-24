import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Car, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNetworkErrorMessage } from '../api/client';
import './Login.css';

// Use public path so Vite does not process this asset (avoids HMR/500 on image changes)
const mainSigninImage = '/main_signin.jpg';

// Import showroom logos from assets
import showroom1Logo from '../assets/showroom1.png';
import showroom2Logo from '../assets/showroom2.webp';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      if (keepSignedIn) {
        try {
          localStorage.setItem('showroom_keepSignedIn', 'true');
        } catch (_) {}
      }
      navigate('/');
    } catch (err) {
      setError(getNetworkErrorMessage(err) || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split">
        {/* Left: promotional panel with image */}
        <div className="login-left">
          <div className="login-left-overlay" />
          <img src={mainSigninImage} alt="Showroom" className="login-left-image" />
          <div className="login-left-content">
            <h2 className="login-left-title">Precision & Performance</h2>
            <p className="login-left-subtitle">
              Experience the peak of automotive retail management. Seamlessly track inventory, leads, and sales with our premium dashboard.
            </p>
            <div className="login-showroom-logos">
              <img src={showroom1Logo} alt="Showroom 1" className="login-showroom-logo" />
              <img src={showroom2Logo} alt="Showroom 2" className="login-showroom-logo" />
            </div>
          </div>
        </div>

        {/* Right: sign-in form */}
        <div className="login-right">
          <div className="login-right-inner">
            <div className="login-brand">
              <Car size={36} className="login-brand-icon" />
              <span className="login-brand-name">Showroom Management</span>
            </div>
            <h1 className="login-title">Welcome Back!</h1>
            <p className="login-instruction">Please enter your credentials to access the showroom management dashboard.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="login-form">
              {error && <div className="login-error">{error}</div>}
              <div className="login-form-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                  placeholder="name@showroom.com"
                  autoComplete="email"
                />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>
              <div className="login-form-group">
                <label>PASSWORD</label>
                <div className="login-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: 'Password is required' })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>
              <div className="login-options">
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
                <a href="#" className="login-forgot" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
              </div>
              <button type="submit" disabled={loading} className="login-submit">
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </button>
            </form>

            <footer className="login-footer">
              <p>© {new Date().getFullYear()} SHOWROOM MANAGEMENT.</p>
              <p className="login-footer-auth">AUTHORIZED PERSONNEL ONLY</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
