import React from 'react';
import VehicleTest from './components/VehicleTest';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { RoleSelect } from './components/auth/RoleSelect';
import { AdminLogin } from './components/auth/AdminLogin';
import { DriverAuth } from './components/auth/DriverAuth';
import { DriverDashboard } from './components/dashboard/DriverDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { NotFound } from './components/common/NotFound';

// Protected Route wrapper for simulated session
const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, role } = useAuth();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/dashboard/admin' : '/dashboard/driver'} replace />;
  }

  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/test" element={<VehicleTest />} />
        <Route path="/auth/admin" element={<AdminLogin />} />
        <Route path="/auth/driver" element={<DriverAuth />} />

        {/* Protected Cockpits */}
        <Route
          path="/dashboard/driver"
          element={
            <ProtectedRoute requiredRole="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-[#F8F9FA] text-[#111111] font-sans flex flex-col">
            {/* Top Navigation Bar */}
            <Navbar />

            {/* Main Viewport */}
            <main className="flex-1 flex flex-col justify-center">
              <AnimatedRoutes />
            </main>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
