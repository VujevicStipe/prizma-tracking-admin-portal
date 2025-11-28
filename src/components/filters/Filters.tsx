import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Worker, Territory, FilterState } from '../../types';
import styles from './Filters.module.css';

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

function Filters({ onFilterChange }: FiltersProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    workerId: '',
    territoryId: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [workersSnapshot, territoriesSnapshot] = await Promise.all([
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'territories'))
      ]);

      setWorkers(workersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Worker[]);

      setTerritories(territoriesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Territory[]);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      workerId: '',
      territoryId: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = 
    filters.workerId || 
    filters.territoryId || 
    filters.status !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.toggleButton}
          onClick={() => setExpanded(!expanded)}>
          <span className={styles.toggleIcon}>
            {expanded ? '🔽' : '▶️'}
          </span>
          <span className={styles.toggleText}>Filteri</span>
          {hasActiveFilters && !expanded && (
            <span className={styles.activeIndicator}>•</span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button className={styles.resetButton} onClick={handleReset}>
            ✕ Resetiraj
          </button>
        )}
      </div>

      {expanded && (
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Radnik</label>
            <select 
              className={styles.select}
              value={filters.workerId}
              onChange={(e) => handleFilterChange('workerId', e.target.value)}>
              <option value="">Svi radnici</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Teren</label>
            <select 
              className={styles.select}
              value={filters.territoryId}
              onChange={(e) => handleFilterChange('territoryId', e.target.value)}>
              <option value="">Svi tereni</option>
              {territories.map(territory => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Status</label>
            <select 
              className={styles.select}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value as FilterState['status'])}>
              <option value="all">Sve sesije</option>
              <option value="active">Aktivne</option>
              <option value="completed">Završene</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Datum od</label>
            <input 
              type="date"
              className={styles.input}
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Datum do</label>
            <input 
              type="date"
              className={styles.input}
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Filters;