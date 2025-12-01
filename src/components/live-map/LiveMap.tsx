import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Session, LocationPoint, Territory } from '../../types';
import { cacheService } from '../../utils/cacheService';
import 'leaflet/dist/leaflet.css';
import styles from './LiveMap.module.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapProps {
  sessions: Session[];
}

interface SessionWithLocations {
  session: Session;
  locations: LocationPoint[];
  lastLocation: LocationPoint | null;
}

const POLLING_INTERVAL = 10000; // 10 sekundi

function LiveMap({ sessions }: LiveMapProps) {
  const [sessionsWithLocations, setSessionsWithLocations] = useState<SessionWithLocations[]>([]);
  const [territories, setTerritories] = useState<Map<string, Territory>>(new Map());
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (sessionsWithLocations.length === 0) return;

    const loadTerritories = async () => {
      const territoryIds = new Set(
        sessionsWithLocations
          .map(s => s.session.territoryId)
          .filter(id => id !== null && id !== undefined)
      );

      const territoriesMap = new Map<string, Territory>();

      for (const territoryId of territoryIds) {
        try {
          const territoryDoc = await getDoc(doc(db, 'territories', territoryId));
          if (territoryDoc.exists()) {
            territoriesMap.set(territoryId, {
              id: territoryDoc.id,
              ...territoryDoc.data()
            } as Territory);
          }
        } catch (error) {
          console.error('Error loading territory:', error);
        }
      }

      setTerritories(territoriesMap);
    };

    loadTerritories();
  }, [sessionsWithLocations]);

  useEffect(() => {
    if (sessions.length === 0) {
      setSessionsWithLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('🔄 LiveMap: Loading sessions with optimized caching...');

    const initializeAndPoll = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loadAllSessions();
      
      pollingIntervalRef.current = setInterval(() => {
        loadNewPointsOnly();
      }, POLLING_INTERVAL);
    };

    initializeAndPoll();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [sessions]);

  const loadAllSessions = async () => {
    const results: SessionWithLocations[] = [];

    for (const session of sessions) {
      try {
        const cached = cacheService.loadSessionPoints(session.id);
        
        if (cached) {
          console.log(`💾 Using ${cached.points.length} cached points for ${session.workerName}`);
          
          results.push({
            session,
            locations: cached.points,
            lastLocation: cached.points.length > 0 ? cached.points[cached.points.length - 1] : null,
          });

          lastTimestampsRef.current.set(session.id, cached.lastTimestamp);

          loadNewPointsForSession(session.id, cached.lastTimestamp);
        } else {
          console.log(`📥 Loading all points from Firestore for ${session.workerName}`);
          
          const locationsQuery = query(
            collection(db, 'locations', session.id, 'points'),
            orderBy('timestampMs', 'asc')
          );
          
          const snapshot = await getDocs(locationsQuery);
          let locations = snapshot.docs.map(doc => doc.data()) as LocationPoint[];
          
          locations.sort((a, b) => {
            const timeA = a.timestampMs || 
              (a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any)?.toMillis?.()) || 0;
            const timeB = b.timestampMs || 
              (b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any)?.toMillis?.()) || 0;
            return timeA - timeB;
          });

          console.log(`✅ Loaded ${locations.length} points for ${session.workerName}`);

          if (locations.length > 0) {
            cacheService.saveSessionPoints(session.id, locations);
            const lastTimestamp = locations[locations.length - 1].timestampMs || Date.now();
            lastTimestampsRef.current.set(session.id, lastTimestamp);
          }

          results.push({
            session,
            locations,
            lastLocation: locations.length > 0 ? locations[locations.length - 1] : null,
          });
        }
      } catch (error) {
        console.error(`❌ Error loading session ${session.id}:`, error);
      }
    }

    setSessionsWithLocations(results);
    setLoading(false);
  };

  const loadNewPointsOnly = async () => {
    console.log('🔄 Polling for new points...');

    for (const session of sessions) {
      const lastTimestamp = lastTimestampsRef.current.get(session.id) || 0;
      await loadNewPointsForSession(session.id, lastTimestamp);
    }
  };

  const loadNewPointsForSession = async (sessionId: string, lastTimestamp: number) => {
    try {
      const newPointsQuery = query(
        collection(db, 'locations', sessionId, 'points'),
        where('timestampMs', '>', lastTimestamp),
        orderBy('timestampMs', 'asc')
      );

      const snapshot = await getDocs(newPointsQuery);
      
      if (snapshot.empty) {
        return;
      }

      const newPoints = snapshot.docs.map(doc => doc.data()) as LocationPoint[];
      
      console.log(`📍 Found ${newPoints.length} new points for session ${sessionId}`);

      cacheService.appendPoints(sessionId, newPoints);

      setSessionsWithLocations(prev => {
        const updated = prev.map(item => {
          if (item.session.id !== sessionId) return item;

          const allLocations = [...item.locations, ...newPoints];
          const newLastTimestamp = newPoints[newPoints.length - 1].timestampMs || Date.now();
          
          lastTimestampsRef.current.set(sessionId, newLastTimestamp);

          return {
            session: item.session,
            locations: allLocations,
            lastLocation: allLocations[allLocations.length - 1],
          };
        });

        return updated;
      });
    } catch (error) {
      console.error(`❌ Error loading new points for ${sessionId}:`, error);
    }
  };

  const center: [number, number] = sessionsWithLocations.length > 0 && sessionsWithLocations[0].lastLocation
    ? [sessionsWithLocations[0].lastLocation.latitude, sessionsWithLocations[0].lastLocation.longitude]
    : [43.5081, 16.4402];

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.spinner}></div>
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>😴</p>
        <p className={styles.emptyText}>Nema aktivnih radnika</p>
        <p className={styles.emptySubtext}>Počnite tracking u mobilnoj aplikaciji</p>
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sessionsWithLocations.map(({ session, locations, lastLocation }) => {
          const territory = session.territoryId ? territories.get(session.territoryId) : null;
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

          return (
            <div key={session.id}>
              {territoryCoords.length > 0 && (
                <Polygon
                  positions={territoryCoords}
                  pathOptions={{
                    color: '#10B981',
                    fillColor: '#10B981',
                    fillOpacity: 0.15,
                    weight: 2
                  }}
                />
              )}

              {locations.length > 1 && (
                <Polyline
                  positions={locations.map(loc => [loc.latitude, loc.longitude])}
                  color="#EF4444"
                  weight={4}
                />
              )}

              {lastLocation && (
                <Marker position={[lastLocation.latitude, lastLocation.longitude]}>
                  <Popup>
                    <div className={styles.popup}>
                      <strong>{session.workerName}</strong>
                      <div className={styles.popupInfo}>
                        <span>📍 {locations.length} GPS točaka</span>
                        <span>⚡ {lastLocation.speed.toFixed(1)} m/s</span>
                        {territory && <span>🗺️ {territory.name}</span>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>
      
      {/* Debug info - ukloni u produkciji */}
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '8px 12px', 
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        💾 Cache Stats: {cacheService.getCacheStats().totalSessions} sessions, {cacheService.getCacheStats().totalPoints} points
      </div>
    </div>
  );
}

export default LiveMap;