import { describe, it, expect } from 'vitest';
import type { Sector } from '../types';

function generateSectorData(systemCount: number, planetsPerSystem = 5, starsPerSystem = 1): Sector {
  const systems = Array.from({ length: systemCount }, (_, i) => ({
    systemId: i + 1,
    xPos: i,
    yPos: i + 1,
    zPos: i + 2
  }));
  const stars = Array.from({ length: systemCount * starsPerSystem }, (_, i) => ({
    starId: i + 1,
    systemId: Math.floor(i / starsPerSystem) + 1,
    name: `Star${i + 1}`,
    spectralClass: 'G',
    subclass: 2
  }));
  const planets = Array.from({ length: systemCount * planetsPerSystem }, (_, i) => ({
    starId: Math.floor(i / planetsPerSystem) + 1,
    orbitalNumber: (i % planetsPerSystem) + 1,
    planetType: 'rocky',
    diameter: 10000 + i,
    moonCount: 2,
    mass: 1.0,
    gravity: 1.0,
    semiMajorAxis: 1.0,
    habitableZone: true
  }));
  return { systems, stars, planets };
}

describe('sectorData JSON size estimation', () => {
  const settings = {
    currentSeed: 12345,
    systemCount: 0,
    sectorVolume: 1000,
    zone: 'medium'
  };
  const STORAGE_KEY = 'universe-generator-sector';

  function getSizeInKB(obj: any) {
    return Buffer.byteLength(JSON.stringify(obj), 'utf8') / 1024;
  }

  it('should estimate JSON size for 10, 100, 1000, 5000 systems', () => {
    const results: Record<string, number> = {};
    [10, 100, 1000, 5000].forEach((n) => {
      const sectorData = generateSectorData(n);
      const toStore = { ...settings, sectorData, systemCount: n };
      results[n] = getSizeInKB(toStore);
    });
    console.log('Occupazione stimata (KB):', results);
    expect(results[10]).toBeLessThan(50);
    expect(results[100]).toBeLessThan(500);
    expect(results[1000]).toBeLessThan(5000);
    expect(results[5000]).toBeLessThan(50000);
  });
});

