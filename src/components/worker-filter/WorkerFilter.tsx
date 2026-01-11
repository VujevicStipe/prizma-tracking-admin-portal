import { useState, useRef, useEffect } from 'react';
import type { Session } from '../../types';
import styles from './WorkerFilter.module.css';

interface WorkerFilterProps {
  sessions: Session[];
  selectedWorkerIds: string[];
  onFilterChange: (workerIds: string[]) => void;
}

function WorkerFilter({ sessions, selectedWorkerIds, onFilterChange }: WorkerFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Unique workers
  const uniqueWorkers = Array.from(
    new Map(sessions.map(s => [s.workerId, { id: s.workerId, name: s.workerName }])).values()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      onFilterChange(selectedWorkerIds.filter(id => id !== workerId));
    } else {
      onFilterChange([...selectedWorkerIds, workerId]);
    }
  };

  const selectAll = () => {
    onFilterChange(uniqueWorkers.map(w => w.id));
  };

  const clearAll = () => {
    onFilterChange([]);
  };

  const selectedCount = selectedWorkerIds.length;
  const totalCount = uniqueWorkers.length;

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.triggerText}>
          👷 Radnici {selectedCount > 0 && `(${selectedCount}/${totalCount})`}
        </span>
        <span className={styles.triggerIcon}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <button onClick={selectAll} className={styles.headerButton}>
              Odaberi sve
            </button>
            <button onClick={clearAll} className={styles.headerButton}>
              Poništi
            </button>
          </div>

          <div className={styles.workerList}>
            {uniqueWorkers.map(worker => (
              <label key={worker.id} className={styles.workerItem}>
                <input
                  type="checkbox"
                  checked={selectedWorkerIds.includes(worker.id)}
                  onChange={() => toggleWorker(worker.id)}
                  className={styles.checkbox}
                />
                <span className={styles.workerName}>{worker.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerFilter;