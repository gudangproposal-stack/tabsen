import React, { useState, useEffect } from 'react';
import LoginRegister from './components/LoginRegister';
import AdminPanel from './components/AdminPanel';
import EmployeePWA from './components/EmployeePWA';
import ActivationLanding from './components/ActivationLanding';

export default function App() {
  // Session authentication states
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('hadir_auth_token')
  );
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Custom router state
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Parse deep-link paths in standard JS on window load
  useEffect(() => {
    const path = window.location.pathname;
    
    // Check if path is like: /activate/inv_xxxx
    if (path.includes('/activate/')) {
      const parts = path.split('/activate/');
      if (parts[1]) {
        setActivationToken(parts[1]);
      }
    } else {
      // Also check if they pass as hash or query segment as a fallback
      const hash = window.location.hash;
      if (hash.includes('#/activate/')) {
        const parts = hash.split('#/activate/');
        if (parts[1]) {
          setActivationToken(parts[1]);
        }
      }
    }
  }, []);

  // Fetch session data if token present
  const verifySession = async (tokenValue: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenValue}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
      } else {
        // Clear stale session
        handleLogout();
      }
    } catch (err) {
      console.warn('Session verification error', err);
      handleLogout();
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      verifySession(authToken);
    } else {
      setLoadingSession(false);
    }
  }, [authToken]);

  const handleLoginSuccess = (tokenValue: string, userValue: any) => {
    localStorage.setItem('hadir_auth_token', tokenValue);
    setAuthToken(tokenValue);
    setCurrentUser(userValue);
  };

  const handleLogout = () => {
    localStorage.removeItem('hadir_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
  };

  const handleActivationSuccess = (tokenValue: string, userValue: any) => {
    // Clear activation deep-link route state from URL
    window.history.replaceState({}, document.title, "/");
    setActivationToken(null);
    handleLoginSuccess(tokenValue, userValue);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Memuat Sesi Hadir.id...</p>
      </div>
    );
  }

  // Render employee activation landing view if matching deep token links
  if (activationToken) {
    return (
      <ActivationLanding
        token={activationToken}
        onSuccess={handleActivationSuccess}
        onGotoLogin={() => {
          window.history.replaceState({}, document.title, "/");
          setActivationToken(null);
        }}
      />
    );
  }

  // Dynamic dashboard screens pivoting based on authenticated role
  if (authToken && currentUser) {
    if (currentUser.role === 'admin') {
      return (
        <div className="animate-fade-in">
          <AdminPanel token={authToken} onLogout={handleLogout} />
        </div>
      );
    } else {
      return (
        <div className="animate-fade-in">
          <EmployeePWA token={authToken} onLogout={handleLogout} />
        </div>
      );
    }
  }

  // Fallback Auth forms for Guest/Anonymous visitors
  return (
    <div className="animate-fade-in">
      <LoginRegister
        onLoginSuccess={handleLoginSuccess}
        onNavigateToInvite={(tok) => setActivationToken(tok)}
      />
    </div>
  );
}
