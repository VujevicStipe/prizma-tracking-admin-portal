import { useState } from 'react';
import type { Session } from '../../types';
import styles from '../filters/Filters.module.css'; 

interface WorkerFilterProps {
  sessions: Session[];
  selectedWorkerIds: string[];
  onFilterChange: (workerIds: string[]) => void;
}

function WorkerFilter({ sessions, selectedWorkerIds, onFilterChange }: WorkerFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const uniqueWorkers = Array.from(
    new Map(sessions.map(s => [s.workerId, { id: s.workerId, name: s.workerName }])).values()
  );

  const toggleWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      onFilterChange(selectedWorkerIds.filter(id => id !== workerId));
    } else {
      onFilterChange([...selectedWorkerIds, workerId]);
    }
  };

  const selectAll = () => onFilterChange(uniqueWorkers.map(w => w.id));
  const clearAll = () => onFilterChange([]);

  const hasActiveFilters = selectedWorkerIds.length > 0 && selectedWorkerIds.length < uniqueWorkers.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.toggleButton}
          onClick={() => setExpanded(!expanded)}>
          <span className={styles.toggleIcon}>
            {expanded ? '🔽' : '▶️'}
          </span>
          <span className={styles.toggleText}>
            👷 Radnici {selectedWorkerIds.length > 0 && `(${selectedWorkerIds.length}/${uniqueWorkers.length})`}
          </span>
          {hasActiveFilters && !expanded && (
            <span className={styles.activeIndicator}>•</span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button className={styles.resetButton} onClick={selectAll}>
            Odaberi sve
          </button>
        )}
      </div>

      {expanded && (
        <div className={styles.filtersGrid}>
          <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
            <button 
              onClick={selectAll}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}>
              Odaberi sve
            </button>
            <button 
              onClick={clearAll}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}>
              Poništi
            </button>
          </div>

          {uniqueWorkers.map(worker => (
            <label 
              key={worker.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: '#F9FAFB',
                borderRadius: '8px',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selectedWorkerIds.includes(worker.id) ? '#10B981' : '#E5E7EB',
                transition: 'all 0.2s'
              }}>
              <input
                type="checkbox"
                checked={selectedWorkerIds.includes(worker.id)}
                onChange={() => toggleWorker(worker.id)}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#10B981'
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                {worker.name}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkerFilter;