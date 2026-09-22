import React, { useState } from 'react';
import { ThemeProvider } from './utils/ThemeContext';
import LoginScreen from './screens/auth/LoginScreen';
import CaretakerApp from './CaretakerApp';
import OwnerApp from './OwnerApp';
import TenantApp from './TenantApp';
import { logout } from './services/authService';

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(null); // null = unauthenticated

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  if (currentUser.role === 'caretaker') {
    return <CaretakerApp user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'owner') {
    return <OwnerApp user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'tenant') {
    return <TenantApp user={currentUser} onLogout={handleLogout} />;
  }

  return <LoginScreen onLoginSuccess={setCurrentUser} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}
