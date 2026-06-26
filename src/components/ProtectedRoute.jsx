import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../lib/useProfile';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { profile, loading } = useProfile();

  if (loading) return <div className="empty" style={{height: '100vh'}}><span className="spinner"></span></div>;
  
  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // If they are logged in but trying to access the wrong portal, 
    // redirect them to their actual portal
    return <Navigate to={`/${profile.role}`} replace />;
  }

  return children;
}
