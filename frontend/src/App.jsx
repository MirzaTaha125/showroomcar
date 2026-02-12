import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { LoadingSpinner } from './components/LoadingSpinner';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Showrooms from './pages/Showrooms';
import Users from './pages/Users';
import CarAccount from './pages/CarAccount';
import CarAccountList from './pages/CarAccountList';
import Vehicles from './pages/Vehicles';
import Transactions from './pages/Transactions';
import ActivityLogs from './pages/ActivityLogs';
import Verify from './pages/Verify';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-sale/:id" element={<Verify />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="delivery-orders" element={<CarAccountList type="VEHICLE DELIVERY ORDER" basePath="/delivery-orders" />} />
        <Route path="delivery-orders/new" element={<CarAccount type="VEHICLE DELIVERY ORDER" basePath="/delivery-orders" />} />
        <Route path="delivery-orders/edit/:id" element={<CarAccount type="VEHICLE DELIVERY ORDER" basePath="/delivery-orders" />} />

        <Route path="token-receipts" element={<CarAccountList type="VEHICLE TOKEN RECEIPT" basePath="/token-receipts" />} />
        <Route path="token-receipts/new" element={<CarAccount type="VEHICLE TOKEN RECEIPT" basePath="/token-receipts" />} />
        <Route path="token-receipts/edit/:id" element={<CarAccount type="VEHICLE TOKEN RECEIPT" basePath="/token-receipts" />} />

        <Route path="purchase-orders" element={<CarAccountList type="VEHICLE PURCHASE ORDER" basePath="/purchase-orders" />} />
        <Route path="purchase-orders/new" element={<CarAccount type="VEHICLE PURCHASE ORDER" basePath="/purchase-orders" />} />
        <Route path="purchase-orders/edit/:id" element={<CarAccount type="VEHICLE PURCHASE ORDER" basePath="/purchase-orders" />} />
        <Route path="showrooms" element={<PrivateRoute adminOnly><Showrooms /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="transactions" element={<PrivateRoute adminOnly><Transactions /></PrivateRoute>} />
        <Route path="activity-logs" element={<PrivateRoute adminOnly><ActivityLogs /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
