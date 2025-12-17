function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface SpeedSegment {
  positions: [number, number][];
  color: string;
  speedKmh: number;
}

export function getColorForSpeed(speedKmh: number): string {
  if (speedKmh < 5) return '#10B981';
  if (speedKmh < 20) return '#3B82F6';
  if (speedKmh < 50) return '#F59E0B';
  if (speedKmh < 80) return '#F97316';
  return '#EF4444';
}

export function createSpeedSegments(locations: any[]): SpeedSegment[] {
  if (locations.length < 2) return [];

  const segments: SpeedSegment[] = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const loc1 = locations[i];
    const loc2 = locations[i + 1];

    const distance = calculateDistance(
      loc1.latitude,
      loc1.longitude,
      loc2.latitude,
      loc2.longitude
    );

    const time1 = loc1.timestampMs || 
      (loc1.timestamp instanceof Date ? loc1.timestamp.getTime() : (loc1.timestamp as any)?.toMillis?.()) || 0;
    const time2 = loc2.timestampMs || 
      (loc2.timestamp instanceof Date ? loc2.timestamp.getTime() : (loc2.timestamp as any)?.toMillis?.()) || 0;

    const timeDiff = (time2 - time1) / 1000;

    if (timeDiff <= 0) continue;

    const speedMs = distance / timeDiff;
    const speedKmh = speedMs * 3.6;

    const color = getColorForSpeed(speedKmh);

    segments.push({
      positions: [
        [loc1.latitude, loc1.longitude],
        [loc2.latitude, loc2.longitude]
      ],
      color,
      speedKmh
    });
  }

  return segments;
}

export function getSpeedLegend() {
  return [
    { color: '#10B981', label: '0-5 km/h (Stoji)', range: '0-5' },
    { color: '#3B82F6', label: '5-20 km/h (Hoda)', range: '5-20' },
    { color: '#F59E0B', label: '20-50 km/h (Lagana vožnja)', range: '20-50' },
    { color: '#F97316', label: '50-80 km/h (Brza vožnja)', range: '50-80' },
    { color: '#EF4444', label: '80+ km/h (Autocesta)', range: '80+' }
  ];
}