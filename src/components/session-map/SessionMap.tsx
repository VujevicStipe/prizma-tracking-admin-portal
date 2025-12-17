import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap } from 'react-leaflet';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Session, LocationPoint, Territory } from '../../types';
import { calculateSessionStats, formatDistance, formatSpeed } from '../../utils/statistics';
import { generateSessionPDF } from '../../utils/pdfExport';
import { createSpeedSegments, getSpeedLegend } from '../../utils/speedColors';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from './SessionMap.module.css';

interface SessionMapProps {
  session: Session;
}

function SessionMap({ session }: SessionMapProps) {
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessionData();
  }, [session.id]);

  const loadSessionData = async () => {
    setLoading(true);
    
    try {
      const locationsQuery = query(
        collection(db, 'locations', session.id, 'points'),
        orderBy('timestampMs', 'asc')
      );
      
      const locationsSnapshot = await getDocs(locationsQuery);
      let locs = locationsSnapshot.docs.map(doc => doc.data()) as LocationPoint[];
      
      locs = locs.sort((a, b) => {
        const timeA = a.timestampMs || 
          (a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any)?.toMillis?.()) || 0;
        const timeB = b.timestampMs || 
          (b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any)?.toMillis?.()) || 0;
        return timeA - timeB;
      });
      
      console.log(`Loaded ${locs.length} points for session ${session.id}`);
      
      setLocations(locs);

      if (session.territoryId) {
        const territoryDoc = await getDoc(doc(db, 'territories', session.territoryId));
        if (territoryDoc.exists()) {
          setTerritory({ id: territoryDoc.id, ...territoryDoc.data() } as Territory);
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      
      try {
        const locationsQuery = query(
          collection(db, 'locations', session.id, 'points'),
          orderBy('timestamp', 'asc')
        );
        
        const locationsSnapshot = await getDocs(locationsQuery);
        const locs = locationsSnapshot.docs.map(doc => doc.data()) as LocationPoint[];
        
        console.log(`Loaded ${locs.length} points (fallback) for session ${session.id}`);
        
        setLocations(locs);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  function FitBoundsOnLoad({ locations, territoryCoords }: { locations: LocationPoint[], territoryCoords: [number, number][] }) {
    const map = useMap();
    
    useEffect(() => {
      if (locations.length === 0 && territoryCoords.length === 0) return;
      
      const allPoints: [number, number][] = [];
      
      if (territoryCoords.length > 0) {
        allPoints.push(...territoryCoords);
      }
      
      if (locations.length > 0) {
        allPoints.push(...locations.map(loc => [loc.latitude, loc.longitude] as [number, number]));
      }
      
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [map, locations, territoryCoords]);
    
    return null;
  }

  const handleExportPDF = async () => {
    if (!mapContainerRef.current) {
      alert('Greška: Mapa nije učitana');
      return;
    }

    try {
      await generateSessionPDF({
        session,
        locations,
        territory,
        mapElement: mapContainerRef.current,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Greška pri generiranju PDF-a');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Učitavam rutu...</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>📍</p>
        <p className={styles.emptyText}>Nema GPS podataka za ovu sesiju</p>
      </div>
    );
  }

  const center: [number, number] = [
    locations[0].latitude,
    locations[0].longitude
  ];

  let territoryCoords: [number, number][] = [];
  if (territory?.boundaryGeoJSON) {
    try {
      const geoJSON = JSON.parse(territory.boundaryGeoJSON);
      territoryCoords = geoJSON.coordinates[0].map((coord: number[]) => 
        [coord[1], coord[0]] as [number, number]
      );
    } catch (e) {
      console.error('Error parsing boundary:', e);
    }
  }

  const stats = calculateSessionStats(
    locations,
    session.startTime?.toDate() || new Date(),
    session.endTime?.toDate() || null
  );

  const speedSegments = createSpeedSegments(locations);
  const speedLegend = getSpeedLegend();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{session.workerName}</h3>
          <p className={styles.subtitle}>
            {session.startTime?.toDate?.()?.toLocaleString('hr-HR')}
          </p>
        </div>
        <div className={styles.headerBadges}>
          {territory && (
            <span className={styles.territoryBadge}>
              🗺️ {territory.name}
            </span>
          )}
          <span className={`${styles.statusBadge} ${
            session.status === 'active' ? styles.statusActive : styles.statusCompleted
          }`}>
            {session.status === 'active' ? '🟢 Aktivan' : '✅ Završen'}
          </span>
          <button 
            className={styles.exportButton}
            onClick={handleExportPDF}>
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <div className={styles.statIcon}>📏</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Udaljenost</p>
            <p className={styles.statValue}>{formatDistance(stats.totalDistance)}</p>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statIcon}>⏱️</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Trajanje</p>
            <p className={styles.statValue}>{stats.durationFormatted}</p>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Prosječna brzina</p>
            <p className={styles.statValue}>{formatSpeed(stats.averageSpeed)}</p>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Maks brzina</p>
            <p className={styles.statValue}>{formatSpeed(stats.maxSpeed)}</p>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statIcon}>📍</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>GPS točaka</p>
            <p className={styles.statValue}>{locations.length}</p>
          </div>
        </div>

        {session.flyerCount && (
          <div className={styles.statBox}>
            <div className={styles.statIcon}>📄</div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Odabir letaka</p>
              <p className={styles.statValue}>{session.flyerCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.speedLegend}>
        <h4 className={styles.legendTitle}>Brzina:</h4>
        {speedLegend.map((item) => (
          <div key={item.range} className={styles.legendItem}>
            <div 
              className={styles.legendColor} 
              style={{ backgroundColor: item.color }}
            />
            <span className={styles.legendLabel}>{item.label}</span>
          </div>
        ))}
      </div>

      <div ref={mapContainerRef} className={styles.mapWrapper}>
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}>
          <FitBoundsOnLoad locations={locations} territoryCoords={territoryCoords} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {territoryCoords.length > 0 && (
            <Polygon
              positions={territoryCoords}
              pathOptions={{
                color: '#10B981',
                fillColor: '#10B981',
                fillOpacity: 0.2,
                weight: 3
              }}
            />
          )}

          {speedSegments.map((segment, index) => (
            <Polyline
              key={index}
              positions={segment.positions}
              pathOptions={{
                color: segment.color,
                weight: 4,
                opacity: 0.8
              }}
            />
          ))}

          <Marker position={[locations[0].latitude, locations[0].longitude]} />

          {session.status === 'completed' && locations.length > 1 && (
            <Marker 
              position={[
                locations[locations.length - 1].latitude,
                locations[locations.length - 1].longitude
              ]}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default SessionMap;