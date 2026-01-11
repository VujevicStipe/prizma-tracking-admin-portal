import { useState } from 'react';
import type { Session } from '../../types';
import styles from './Filters.module.css';

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
          <div className={styles.workerButtons}>
            <button onClick={selectAll} className={styles.workerButton}>
              Odaberi sve
            </button>
            <button onClick={clearAll} className={styles.workerButton}>
              Poništi
            </button>
          </div>

          {uniqueWorkers.map(worker => (
            <label 
              key={worker.id}
              className={`${styles.workerCheckbox} ${selectedWorkerIds.includes(worker.id) ? styles.selected : ''}`}>
              <input
                type="checkbox"
                checked={selectedWorkerIds.includes(worker.id)}
                onChange={() => toggleWorker(worker.id)}
              />
              <span>{worker.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkerFilter;