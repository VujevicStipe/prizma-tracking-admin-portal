import type { LocationPoint } from '../types';

export interface SessionStats {
  totalDistance: number; // meters
  totalDistanceKm: number; // kilometers
  averageSpeed: number; // m/s
  averageSpeedKmh: number; // km/h
  maxSpeed: number; // m/s
  maxSpeedKmh: number; // km/h
  duration: number; // seconds
  durationFormatted: string; // "2h 15m"
}

// Haversine formula - calculate distance between two GPS points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function calculateSessionStats(
  locations: LocationPoint[],
  startTime: Date,
  endTime: Date | null
): SessionStats {
  if (locations.length === 0) {
    return {
      totalDistance: 0,
      totalDistanceKm: 0,
      averageSpeed: 0,
      averageSpeedKmh: 0,
      maxSpeed: 0,
      maxSpeedKmh: 0,
      duration: 0,
      durationFormatted: '0m',
    };
  }

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const distance = calculateDistance(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
    totalDistance += distance;
  }

  // Calculate speeds
  const speeds = locations.map(loc => loc.speed || 0);
  const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);

  // Calculate duration
  const end = endTime || new Date();
  const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000); // seconds

  // Format duration
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const durationFormatted =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    totalDistance,
    totalDistanceKm: totalDistance / 1000,
    averageSpeed,
    averageSpeedKmh: averageSpeed * 3.6,
    maxSpeed,
    maxSpeedKmh: maxSpeed * 3.6,
    duration,
    durationFormatted,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatSpeed(ms: number): string {
  const kmh = ms * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}