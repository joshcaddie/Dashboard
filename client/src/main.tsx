import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store';
import { ModalProvider } from './modals/ModalProvider';
import { App } from './App';
import { AuthProvider, useAuth } from './auth';
import { LoginScreen } from './LoginScreen';
import { ResetScreen } from './ResetScreen';

function Root() {
  const { ready, user } = useAuth();

  // Password-reset / invite-accept link: /reset?token=… — reachable signed out.
  const params = new URLSearchParams(window.location.search);
  const resetToken = window.location.pathname.replace(/\/$/, '') === '/reset' ? params.get('token') : null;
  if (resetToken) return <ResetScreen token={resetToken} />;

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7C8C', fontSize: 14 }}>
        Loading Schoolhub…
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  return (
    <StoreProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </StoreProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
