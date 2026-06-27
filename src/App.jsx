import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ClientPortal from './pages/ClientPortal';
import ConsultantPortal from './pages/ConsultantPortal';
import AdminPortal from './pages/AdminPortal';
import Careers from './pages/Careers';
import UpdatePassword from './pages/UpdatePassword';
import { Toaster } from 'react-hot-toast';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)'
        }
      }} />
      <Router>
        <ErrorBoundary>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/:role" element={<Auth />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        <Route path="/client/*" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientPortal />
          </ProtectedRoute>
        } />
        
        <Route path="/consultant/*" element={
          <ProtectedRoute allowedRoles={['consultant']}>
            <ConsultantPortal />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPortal />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Router>
    </>
  );
}

export default App;
