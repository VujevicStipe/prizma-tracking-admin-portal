import type { Timestamp } from 'firebase/firestore';

export interface Worker {
  id: string;
  name: string;
  pin: string;
  active: boolean;
  assignedTerritories: string[];
}

export interface Territory {
  id: string;
  name: string;
  folder: string;
  flyerCount: number | null;
  assignedTo: string | null;
  color: string;
  boundaryGeoJSON: string;
}

export interface Session {
  id: string;
  workerId: string;
  workerName: string;
  territoryId: string | null;
  flyerCount: number | null;
  startTime: any;
  endTime: any;
  status: 'active' | 'completed';
  totalDistance: number;
  averageSpeed: number;
  pointsCount: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  timestamp: Timestamp | Date; 
  timestampMs?: number;
}


export interface FilterState {
  workerId: string;
  territoryId: string;
  status: 'all' | 'active' | 'completed';
  dateFrom: string;
  dateTo: string;
}