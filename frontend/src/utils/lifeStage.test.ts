import { describe, it, expect } from 'vitest';
import { lifeStageLevel } from './lifeStage';
import { LIFE_STAGE_LABELS } from '../types';

describe('lifeStageLevel', () => {
  it('rounds the raw complexity to the nearest stage', () => {
    expect(lifeStageLevel(1.4)).toBe(1);
    expect(lifeStageLevel(1.5)).toBe(2);
    expect(lifeStageLevel(3.2)).toBe(3);
    expect(lifeStageLevel(4.7)).toBe(5);
  });

  it('clamps below 1 so a realised biosphere is never "level 0"', () => {
    expect(lifeStageLevel(0)).toBe(1);
    expect(lifeStageLevel(0.4)).toBe(1);
    expect(lifeStageLevel(-2)).toBe(1);
  });

  it('clamps above 6', () => {
    expect(lifeStageLevel(6)).toBe(6);
    expect(lifeStageLevel(6.4)).toBe(6);
    expect(lifeStageLevel(12)).toBe(6);
  });

  it('always maps to a defined stage label', () => {
    for (let c = -1; c <= 8; c += 0.25) {
      expect(LIFE_STAGE_LABELS[lifeStageLevel(c)]).toBeTruthy();
    }
  });
});
