import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import LiveMap from '../live-map/LiveMap';
import SessionMap from '../session-map/SessionMap';
import type { Session, FilterState } from '../../types';
import Filters from '../filters/Filters';
import styles from './Dashboard.module.css';

function Dashboard() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'live' | 'history'>('live');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    workerId: '',
    territoryId: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    const activeQuery = query(
      collection(db, 'sessions'),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(activeQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      
      setActiveSessions(sessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allQuery = query(collection(db, 'sessions'));
    
    const unsubscribe = onSnapshot(allQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      
      setAllSessions(sessions.sort((a, b) => 
        b.startTime?.seconds - a.startTime?.seconds
      ));
    });

    return () => unsubscribe();
  }, []);

  const getFilteredSessions = (sessions: Session[]): Session[] => {
    return sessions.filter(session => {
      if (filters.workerId && session.workerId !== filters.workerId) {
        return false;
      }

      if (filters.territoryId && session.territoryId !== filters.territoryId) {
        return false;
      }

      if (filters.status !== 'all' && session.status !== filters.status) {
        return false;
      }

      if (filters.dateFrom || filters.dateTo) {
        const sessionDate = session.startTime?.toDate?.();
        if (!sessionDate) return false;

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (sessionDate < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (sessionDate > toDate) return false;
        }
      }

      return true;
    });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  const filteredSessions = getFilteredSessions(allSessions);

  return (
    <div className={styles.dashboard}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div>
              <p className={styles.statLabel}>Aktivni Radnici</p>
              <p className={styles.statValue}>{activeSessions.length}</p>
            </div>
            <div className={styles.statIcon}>👷</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div>
              <p className={styles.statLabel}>Ukupno Sesija</p>
              <p className={styles.statValue}>{allSessions.length}</p>
            </div>
            <div className={styles.statIcon}>📊</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div>
              <p className={styles.statLabel}>Završene Danas</p>
              <p className={styles.statValue}>
              {allSessions.filter(s => {
                if (s.status !== 'completed') return false;
                
                const sessionEndDate = s.endTime?.toDate?.();
                if (!sessionEndDate) return false;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                return sessionEndDate >= today && sessionEndDate < tomorrow;
              }).length}
            </p>
            </div>
            <div className={styles.statIcon}>✅</div>
          </div>
        </div>
      </div>

      <div className={styles.toggleCard}>
        <div className={styles.toggleButtons}>
          <button
            onClick={() => setViewMode('live')}
            className={`${styles.toggleButton} ${viewMode === 'live' ? styles.active : ''}`}>
            🔴 Live Tracking
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`${styles.toggleButton} ${viewMode === 'history' ? styles.active : ''}`}>
            📜 Povijest
          </button>
        </div>
      </div>

      {viewMode === 'history' && (
        <Filters onFilterChange={setFilters} />
      )}

      <div className={styles.content}>
        {viewMode === 'live' ? (
          <div className={styles.liveView}>
            <LiveMap sessions={activeSessions} />
          </div>
        ) : (
          <div className={styles.historyView}>
            <div className={styles.historyGrid}>
              <div className={styles.sessionListColumn}>
                <h2>Povijest sesija {filteredSessions.length !== allSessions.length && `(${filteredSessions.length}/${allSessions.length})`}</h2>
                <div className={styles.sessionsList}>
                  {filteredSessions.map(session => (
                    <div 
                      key={session.id} 
                      className={`${styles.sessionCard} ${
                        selectedSession?.id === session.id ? styles.sessionCardActive : ''
                      }`}
                      onClick={() => setSelectedSession(session)}>
                      <div className={styles.sessionHeader}>
                        <span className={styles.sessionWorker}>
                          {session.workerName}
                        </span>
                        <span className={`${styles.sessionStatus} ${
                          session.status === 'active' ? styles.statusActive : styles.statusCompleted
                        }`}>
                          {session.status === 'active' ? '🟢 Aktivan' : '✅ Završen'}
                        </span>
                      </div>
                      <div className={styles.sessionInfo}>
                        <span>📍 {session.pointsCount} GPS točaka</span>
                        {session.territoryId && (
                          <span className={styles.territoryBadge}>
                            🗺️ Teren odabran
                          </span>
                        )}
                        {session.flyerCount && (
                          <span className={styles.flyerBadge}>
                            📄 {session.flyerCount} {session.flyerCount === 1 ? 'letak' : 'letaka'}
                          </span>
                        )}
                      </div>
                      <div className={styles.sessionTime}>
                        {session.startTime?.toDate?.()?.toLocaleString('hr-HR') || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.mapColumn}>
                {selectedSession ? (
                  <SessionMap session={selectedSession} />
                ) : (
                  <div className={styles.mapPlaceholder}>
                    <p className={styles.placeholderIcon}>👈</p>
                    <p className={styles.placeholderText}>
                      Odaberi sesiju za prikaz na mapi
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;