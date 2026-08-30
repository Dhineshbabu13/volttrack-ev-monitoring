import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_ADMIN, DEMO_DRIVER } from '../data/evVehicles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('volttrack_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (currentUser && rememberMe) {
      localStorage.setItem('volttrack_user', JSON.stringify(currentUser));
    } else if (!currentUser) {
      localStorage.removeItem('volttrack_user');
    }
  }, [currentUser, rememberMe]);

  const loginAdmin = (name, adminId, token) => {
    const user = {
      ...DEMO_ADMIN,
      name: name || DEMO_ADMIN.name,
      adminId: adminId || DEMO_ADMIN.adminId,
      token: token || null,
      role: 'admin',
      loginTimestamp: new Date().toISOString()
    };
    setCurrentUser(user);
    return user;
  };

  const loginDriver = (name, driverId, token) => {
    const user = {
      ...DEMO_DRIVER,
      name: name || 'Driver',
      driverId: driverId || 'DRV-2025-00001',
      token: token || null,
      role: 'driver',
      loginTimestamp: new Date().toISOString()
    };
    setCurrentUser(user);
    return user;
  };

  const registerDriver = (driverData) => {
    const user = {
      ...DEMO_DRIVER,
      ...driverData,
      role: 'driver',
      currentBatterySoc: 85,
      estimatedRange: 420,
      odometer: 120,
      ecoScore: 98,
      status: 'Active / Connected',
      loginTimestamp: new Date().toISOString()
    };
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('volttrack_user');
  };

  const updateTelemetry = (newTelemetry) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...newTelemetry } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        rememberMe,
        setRememberMe,
        loginAdmin,
        loginDriver,
        registerDriver,
        logout,
        updateTelemetry
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
