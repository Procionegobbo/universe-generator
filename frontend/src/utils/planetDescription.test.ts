import { describe, it, expect } from 'vitest';
import {
  biosphereClause,
  habitatGroup,
  planetLifeState,
  planetLongDescription,
  planetTypeLabel,
  UNKNOWN_PLANET_LABEL
} from './planetDescription';
import { lifeStageLevel } from './lifeStage';
import {
  BIOSPHERE_CLAUSES,
  DEFAULT_HABITAT_GROUP,
  PLANET_HABITAT_GROUP,
  PLANET_TYPE_DESCRIPTIONS,
  PLANET_TYPE_LIFE_LABELS,
  PLANET_TYPE_LONG_DESCRIPTIONS
} from '../types';
import type { HabitatGroup, LifeState } from '../types';

const planet = (planetType: string, hasLife: boolean, lifeComplexity = 0) =>
  ({ planetType, hasLife, lifeComplexity });

/** Every planet type code the generator can emit (example_star_generator.ts). */
const TYPE_CODES = 'A G Q U S R E O I D C L F T N B J W H M X #'.split(' ');

const GROUPS: HabitatGroup[] = ['belt', 'giant', 'temperate', 'rocky', 'frozen', 'infernal'];
const STATES: LifeState[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * A planet of `type` sitting at exactly `state`: state 0 is the no-life case,
 * and an integer complexity 1-6 rounds to that same stage.
 */
const atState = (type: string, state: LifeState) =>
  state === 0 ? planet(type, false) : planet(type, true, state);

describe('planetLifeState', () => {
  it('is 0 without life, whatever the complexity index says', () => {
    expect(planetLifeState(planet('E', false, 5.5))).toBe(0);
    expect(planetLifeState(planet('E', false, 0))).toBe(0);
    expect(planetLifeState(planet('J', false, 6))).toBe(0);
  });

  it('mirrors lifeStageLevel when life is present', () => {
    const cases: [number, number][] = [
      [0.2, 1],
      [1.4, 1],
      [1.5, 2],
      [3.2, 3],
      [4.7, 5],
      [12, 6]
    ];
    for (const [complexity, expected] of cases) {
      expect(planetLifeState(planet('E', true, complexity))).toBe(expected);
      expect(planetLifeState(planet('E', true, complexity))).toBe(lifeStageLevel(complexity));
    }
  });

  it('never leaves 0-6 across the complexity range', () => {
    for (let c = -1; c <= 8; c += 0.25) {
      for (const hasLife of [true, false]) {
        const state = planetLifeState(planet('E', hasLife, c));
        expect(Number.isInteger(state)).toBe(true);
        expect(state).toBeGreaterThanOrEqual(0);
        expect(state).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('habitatGroup', () => {
  it('maps every generator type code to its recorded group', () => {
    const mapped = Object.fromEntries(TYPE_CODES.map((code) => [code, habitatGroup(code)]));
    expect(mapped).toEqual(PLANET_HABITAT_GROUP);
  });

  it('falls back to the rocky group for unknown codes', () => {
    expect(habitatGroup('Z')).toBe(DEFAULT_HABITAT_GROUP);
    expect(habitatGroup('')).toBe(DEFAULT_HABITAT_GROUP);
    expect(DEFAULT_HABITAT_GROUP).toBe('rocky');
  });
});

describe('planetTypeLabel', () => {
  it('calls a Jungle planet a Rain World below multicellular life', () => {
    expect(planetTypeLabel(planet('J', false))).toBe('Rain World');
    expect(planetTypeLabel(planet('J', true, 1.1))).toBe('Rain World');
    expect(planetTypeLabel(planet('J', true, 2.4))).toBe('Rain World');
    expect(planetTypeLabel(planet('J', true, 3.4))).toBe('Rain World');
  });

  it('calls a Jungle planet a Jungle Planet from multicellular life onward', () => {
    expect(planetTypeLabel(planet('J', true, 3.6))).toBe('Jungle Planet');
    expect(planetTypeLabel(planet('J', true, 5.2))).toBe('Jungle Planet');
    expect(planetTypeLabel(planet('J', true, 6.0))).toBe('Jungle Planet');
  });

  it('leaves every other type unchanged at every life state', () => {
    for (const code of TYPE_CODES.filter((c) => c !== 'J')) {
      for (const state of STATES) {
        expect(planetTypeLabel(atState(code, state))).toBe(PLANET_TYPE_DESCRIPTIONS[code]);
      }
    }
  });

  it('falls back to the unknown label at every state', () => {
    for (const state of STATES) {
      expect(planetTypeLabel(atState('Z', state))).toBe('Unknown planet type');
    }
    expect(UNKNOWN_PLANET_LABEL).toBe('Unknown planet type');
  });
});

describe('planetLongDescription', () => {
  it('joins the physical core and the biosphere clause with a single space', () => {
    const representatives: [string, HabitatGroup, LifeState][] = [
      ['A', 'belt', 0],
      ['G', 'giant', 1],
      ['E', 'temperate', 5],
      ['R', 'rocky', 2],
      ['I', 'frozen', 3],
      ['H', 'infernal', 6]
    ];
    for (const [code, group, state] of representatives) {
      const subject = atState(code, state);
      const expected = `${PLANET_TYPE_LONG_DESCRIPTIONS[code]} ${BIOSPHERE_CLAUSES[group][state]}`;
      expect(planetLongDescription(subject)).toBe(expected);
      expect(biosphereClause(subject)).toBe(BIOSPHERE_CLAUSES[group][state]);
      expect(expected).not.toContain('  ');
      expect(expected.endsWith(' ')).toBe(false);
    }
  });

  it('never produces a double space or a trailing space', () => {
    for (const code of TYPE_CODES) {
      for (const state of STATES) {
        const description = planetLongDescription(atState(code, state));
        expect(description).not.toContain('  ');
        expect(description.endsWith(' ')).toBe(false);
      }
    }
  });

  it('describes a sterile Jungle planet as sterile', () => {
    const description = planetLongDescription(planet('J', false));
    expect(description.endsWith(BIOSPHERE_CLAUSES.temperate[0])).toBe(true);
    expect(description).toContain('permanent overcast');
  });

  it('describes a microbial Jungle planet as microbial', () => {
    const description = planetLongDescription(planet('J', true, 1.1));
    expect(description.endsWith(BIOSPHERE_CLAUSES.temperate[1])).toBe(true);
    expect(description).toContain('bacteria and archaea');
  });

  it('never renders undefined for an unknown type code', () => {
    for (const state of STATES) {
      const description = planetLongDescription(atState('Z', state));
      expect(description).toBe(`${UNKNOWN_PLANET_LABEL} ${BIOSPHERE_CLAUSES.rocky[state]}`);
      expect(description).not.toContain('undefined');
    }
  });
});

describe('table invariants', () => {
  it('records a habitat group for every type code and nothing else', () => {
    expect(Object.keys(PLANET_HABITAT_GROUP).sort()).toEqual([...TYPE_CODES].sort());
  });

  it('keys the description tables identically to the generator type list', () => {
    const expected = [...TYPE_CODES].sort();
    expect(Object.keys(PLANET_TYPE_DESCRIPTIONS).sort()).toEqual(expected);
    expect(Object.keys(PLANET_TYPE_LONG_DESCRIPTIONS).sort()).toEqual(expected);
  });

  it('fills all six groups by seven states with real sentences', () => {
    expect(Object.keys(BIOSPHERE_CLAUSES).sort()).toEqual([...GROUPS].sort());
    for (const group of GROUPS) {
      expect(Object.keys(BIOSPHERE_CLAUSES[group]).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6']);
      for (const state of STATES) {
        const clause = BIOSPHERE_CLAUSES[group][state];
        expect(clause).toBeTruthy();
        expect(clause).toBe(clause.trim());
        expect(clause.endsWith('.')).toBe(true);
      }
    }
  });

  it('has 42 distinct clauses', () => {
    const clauses = GROUPS.flatMap((group) => STATES.map((state) => BIOSPHERE_CLAUSES[group][state]));
    expect(clauses).toHaveLength(42);
    expect(new Set(clauses).size).toBe(42);
  });

  it('keeps life vocabulary out of the physical cores', () => {
    const lifeVocabulary =
      /\blife\b|\bliving\b|\bbiosphere\b|organism|vegetation|forest|jungle|microb|extremophile|bacteri|\balgae\b|\bfungi\b|inhabited/i;
    for (const code of TYPE_CODES) {
      expect(PLANET_TYPE_LONG_DESCRIPTIONS[code]).not.toMatch(lifeVocabulary);
    }
  });

  it('overrides labels only for real type codes and real states', () => {
    for (const [code, overrides] of Object.entries(PLANET_TYPE_LIFE_LABELS)) {
      expect(TYPE_CODES).toContain(code);
      for (const [state, label] of Object.entries(overrides)) {
        expect(Number.isInteger(Number(state))).toBe(true);
        expect(Number(state)).toBeGreaterThanOrEqual(0);
        expect(Number(state)).toBeLessThanOrEqual(6);
        expect(label).toBeTruthy();
      }
    }
  });
});
