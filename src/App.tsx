import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/dashboard/Dashboard';
import LoginScreen from './components/login/LoginScreen';
import styles from './App.module.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#6B7280'
      }}>
        Učitavanje...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📍 Prizma Tracker - Admin Portal</h1>
          <p className={styles.subtitle}>Live praćenje radnika i terena</p>
        </div>
      </header>
      
      <main className={styles.main}>
        <Dashboard />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;