import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Session, LocationPoint, Territory } from '../../types';
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

function LiveMap({ sessions }: LiveMapProps) {
  const [sessionsWithLocations, setSessionsWithLocations] = useState<SessionWithLocations[]>([]);
  const [territories, setTerritories] = useState<Map<string, Territory>>(new Map());

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
      return;
    }

    const unsubscribers: (() => void)[] = [];

    sessions.forEach(session => {
      // Pokušaj sortirati po timestampMs prvo, fallback na timestamp
      const locationsQuery = query(
        collection(db, 'locations', session.id, 'points'),
        orderBy('timestampMs', 'asc')
      );

      const unsubscribe = onSnapshot(
        locationsQuery, 
        (snapshot) => {
          const locations = snapshot.docs.map(doc => doc.data()) as LocationPoint[];
          
          // Double-check sorting na klijentu (backup)
          locations.sort((a, b) => {
            const timeA = a.timestampMs || 
              (a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any)?.toMillis?.()) || 0;
            const timeB = b.timestampMs || 
              (b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any)?.toMillis?.()) || 0;
            return timeA - timeB;
          });
          
          console.log(`📍 LiveMap: ${session.workerName} - ${locations.length} points`);
          
          setSessionsWithLocations(prev => {
            const filtered = prev.filter(s => s.session.id !== session.id);
            return [
              ...filtered,
              {
                session,
                locations: locations,
                lastLocation: locations.length > 0 ? locations[locations.length - 1] : null
              }
            ];
          });
        },
        (error) => {
          console.error('❌ LiveMap snapshot error:', error);
          
          // Fallback na timestamp ako timestampMs ne postoji
          const fallbackQuery = query(
            collection(db, 'locations', session.id, 'points'),
            orderBy('timestamp', 'asc')
          );
          
          const fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const locations = snapshot.docs.map(doc => doc.data()) as LocationPoint[];
            console.log(`📍 LiveMap (fallback): ${session.workerName} - ${locations.length} points`);
            
            setSessionsWithLocations(prev => {
              const filtered = prev.filter(s => s.session.id !== session.id);
              return [
                ...filtered,
                {
                  session,
                  locations: locations,
                  lastLocation: locations.length > 0 ? locations[locations.length - 1] : null
                }
              ];
            });
          });
          
          unsubscribers.push(fallbackUnsub);
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sessions]);

  const center: [number, number] = sessionsWithLocations.length > 0 && sessionsWithLocations[0].lastLocation
    ? [sessionsWithLocations[0].lastLocation.latitude, sessionsWithLocations[0].lastLocation.longitude]
    : [43.5081, 16.4402];

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
    </div>
  );
}

export default LiveMap;