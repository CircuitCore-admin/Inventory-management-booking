// src/components/ProtectedRoute.js

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  // If a token exists, allow access. Otherwise, redirect to login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
