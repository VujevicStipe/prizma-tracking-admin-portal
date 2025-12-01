import type { LocationPoint } from '../types';

const CACHE_PREFIX = 'prizma_cache_';
const CACHE_VERSION = 'v1';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 sata

interface CachedSession {
  sessionId: string;
  points: LocationPoint[];
  lastTimestamp: number;
  cachedAt: number;
  version: string;
}

export const cacheService = {
  saveSessionPoints(sessionId: string, points: LocationPoint[]): void {
    try {
      const lastTimestamp = points.length > 0 
        ? (points[points.length - 1].timestampMs || Date.now())
        : Date.now();

      const cache: CachedSession = {
        sessionId,
        points,
        lastTimestamp,
        cachedAt: Date.now(),
        version: CACHE_VERSION,
      };

      localStorage.setItem(
        `${CACHE_PREFIX}${sessionId}`,
        JSON.stringify(cache)
      );

      console.log(`💾 Cached ${points.length} points for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
      this.clearOldCaches();
    }
  },

  loadSessionPoints(sessionId: string): { points: LocationPoint[]; lastTimestamp: number } | null {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${sessionId}`);
      if (!cached) return null;

      const data: CachedSession = JSON.parse(cached);

      if (data.version !== CACHE_VERSION) {
        console.log(`🔄 Cache version mismatch for ${sessionId}, ignoring`);
        this.clearSessionCache(sessionId);
        return null;
      }

      const age = Date.now() - data.cachedAt;
      if (age > MAX_CACHE_AGE_MS) {
        console.log(`⏰ Cache expired for ${sessionId}`);
        this.clearSessionCache(sessionId);
        return null;
      }

      console.log(`✅ Loaded ${data.points.length} cached points for session ${sessionId}`);
      
      return {
        points: data.points,
        lastTimestamp: data.lastTimestamp,
      };
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
      return null;
    }
  },

  appendPoints(sessionId: string, newPoints: LocationPoint[]): void {
    const cached = this.loadSessionPoints(sessionId);
    if (!cached) {
      this.saveSessionPoints(sessionId, newPoints);
      return;
    }

    const allPoints = [...cached.points, ...newPoints];
    this.saveSessionPoints(sessionId, allPoints);
  },

  clearSessionCache(sessionId: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${sessionId}`);
      console.log(`🗑️ Cleared cache for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  },

  clearOldCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      let cleared = 0;

      keys.forEach(key => {
        if (!key.startsWith(CACHE_PREFIX)) return;

        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;

          const data: CachedSession = JSON.parse(cached);
          const age = now - data.cachedAt;

          if (age > MAX_CACHE_AGE_MS) {
            localStorage.removeItem(key);
            cleared++;
          }
        } catch (e) {
          localStorage.removeItem(key);
          cleared++;
        }
      });

      if (cleared > 0) {
        console.log(`🗑️ Cleared ${cleared} old caches`);
      }
    } catch (error) {
      console.error('❌ Error clearing old caches:', error);
    }
  },

  clearAllCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cleared all caches');
    } catch (error) {
      console.error('❌ Error clearing all caches:', error);
    }
  },

  getCacheStats(): { totalSessions: number; totalPoints: number; totalSize: string } {
    try {
      const keys = Object.keys(localStorage);
      let totalSessions = 0;
      let totalPoints = 0;
      let totalSize = 0;

      keys.forEach(key => {
        if (!key.startsWith(CACHE_PREFIX)) return;

        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;

          const data: CachedSession = JSON.parse(cached);
          totalSessions++;
          totalPoints += data.points.length;
          totalSize += cached.length;
        } catch (e) {
        }
      });

      return {
        totalSessions,
        totalPoints,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { totalSessions: 0, totalPoints: 0, totalSize: '0 KB' };
    }
  },
};