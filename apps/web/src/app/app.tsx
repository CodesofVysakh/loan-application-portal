import '../styles.css';
import { useState } from 'react';
import { AuthScreen } from '../features/auth/AuthScreen';
import { LoanDashboard } from '../features/loans/LoanDashboard';
import {
  clearSession,
  getSavedUser,
  User,
} from '../lib/api';
import AdminDashboard from '../features/loans/AdminDashboard';

export function App() {
  const [user, setUser] = useState<User | null>(() => getSavedUser());

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <LoanDashboard user={user} onLogout={handleLogout} />;
}

export default App;