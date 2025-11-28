import styles from './App.module.css';
import Dashboard from './components/dashboard/Dashboard';

function App() {
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

export default App;