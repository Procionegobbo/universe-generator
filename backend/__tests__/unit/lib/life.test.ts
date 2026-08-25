import seedrandom from 'seedrandom';
import { SectorZone } from '../../../src/types';
import {
  AGE_DECIMALS,
  AGE_SIGMOID_K,
  ATMOSPHERE_FACTOR,
  COMPLEXITY_DECIMALS,
  COMPLEXITY_K,
  COMPLEXITY_MIDPOINT_GYR,
  DEFAULT_ATMOSPHERE_FACTOR,
  DEFAULT_STAR_FACTOR,
  EARTH_DIAMETER_KM,
  EARTH_REFERENCE_TEMPERATURE_K,
  LIFE_START_DELAY_GYR,
  LifeInput,
  LifeAssigner,
  LifeOutcome,
  MAIN_SEQUENCE_LIFETIME_COEFF_GYR,
  MAIN_SEQUENCE_LIFETIME_EXPONENT,
  MAX_COMPLEXITY,
  PROBABILITY_DECIMALS,
  STELLAR_MASS_SOLAR,
  SYSTEM_AGE_RANGE_GYR,
  TEMPERATURE_SIGMA_K,
  ageFactor,
  atmosphereFactor,
  complexityCurve,
  habitabilityProbability,
  lifeComplexityIndex,
  mainSequenceLifetimeGyr,
  radiusFactor,
  romanNumeral,
  starFactor,
  temperatureFactor
} from '../../../src/lib/life';

// --- Fake PRNGs -------------------------------------------------------------

/** Replays a scripted list of draws; throws if the assigner draws more than expected. */
function scriptedPrng(values: number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`scripted PRNG exhausted after ${values.length} draws`);
    }
    return values[index++];
  };
}

/** Always returns the same draw. */
function constantPrng(value: number): () => number {
  return () => value;
}

/** Wraps a PRNG and records how many draws it served. */
function countingPrng(source: () => number): { prng: () => number; count: () => number } {
  let calls = 0;
  return {
    prng: () => {
      calls++;
      return source();
    },
    count: () => calls
  };
}

// --- Fixtures ---------------------------------------------------------------

const ALL_PLANET_TYPES = 'A G Q U S R E O I D C L F T N B J W H M X #'.split(' ');
const MAIN_SEQUENCE_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const OFF_MAIN_SEQUENCE_CLASSES = [
  'DA', 'DB', 'DF', 'DG', 'DK',
  'gF', 'gG', 'gK', 'gM',
  'cB', 'cA', 'cF', 'cG', 'cK', 'cM',
  'NS', 'BH'
];
const ALL_ZONES: SectorZone[] = [
  'extragalactic',
  'galactic edge',
  'medium',
  'central zone',
  'core'
];

// A take() draw of 0 always picks the first still-available pool entry.
const FIRST_AVAILABLE = 0;

const TWO_NAMES = ['Arrakis', 'Caladan'] as const;

const POOL_20 = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
  'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett',
  'Kilo', 'Lima', 'Mike', 'November', 'Oscar',
  'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango'
] as const;

/**
 * The model doc's worked example: a rocky planet of 1.1 R-earth at 295 K around
 * a K star aged 4.2 Gyr, in the habitable zone.
 */
const WORKED_EXAMPLE: LifeInput = {
  spectralClass: 'K',
  systemAgeGyr: 4.2,
  planetType: 'R',
  diameterKm: 14016,
  temperatureK: 295,
  habitableZone: true,
  starName: 'UG-0142-B',
  orbitalNumber: 4
};

/** A perfect Earth analogue: every factor scores 1.0 (decision #14). */
const EARTH_ANALOGUE: LifeInput = {
  spectralClass: 'G',
  systemAgeGyr: 8,
  planetType: 'E',
  diameterKm: EARTH_DIAMETER_KM,
  temperatureK: EARTH_REFERENCE_TEMPERATURE_K,
  habitableZone: true,
  starName: 'UG-0007-A',
  orbitalNumber: 3
};

/** Drives an assigner through a fixed input sequence, one age draw per "system". */
function runSequence(assigner: LifeAssigner, count: number): Array<number | LifeOutcome> {
  const results: Array<number | LifeOutcome> = [];
  for (let i = 1; i <= count; i++) {
    const systemAgeGyr = assigner.drawSystemAge('medium');
    results.push(systemAgeGyr);
    results.push(
      assigner.assignLife({
        ...WORKED_EXAMPLE,
        systemAgeGyr,
        starName: `UG-${String(i).padStart(4, '0')}`,
        orbitalNumber: (i % 6) + 1
      })
    );
  }
  return results;
}

describe('life', () => {
  describe('constants', () => {
    test('carry the values the spec mandates', () => {
      expect(EARTH_REFERENCE_TEMPERATURE_K).toBe(288);
      expect(TEMPERATURE_SIGMA_K).toBe(30);
      expect(EARTH_DIAMETER_KM).toBe(12742);
      expect(LIFE_START_DELAY_GYR).toBe(0.5);
      expect(AGE_SIGMOID_K).toBe(2);
      expect(MAIN_SEQUENCE_LIFETIME_COEFF_GYR).toBe(10);
      expect(MAIN_SEQUENCE_LIFETIME_EXPONENT).toBe(-2.5);
      expect(COMPLEXITY_K).toBe(1.3);
      expect(COMPLEXITY_MIDPOINT_GYR).toBe(3.2);
      expect(MAX_COMPLEXITY).toBe(6);
      expect(PROBABILITY_DECIMALS).toBe(4);
      expect(COMPLEXITY_DECIMALS).toBe(3);
      expect(AGE_DECIMALS).toBe(2);
    });

    test('declare the system age range of every sector zone', () => {
      expect(SYSTEM_AGE_RANGE_GYR).toEqual({
        extragalactic: [8.0, 13.5],
        'galactic edge': [5.0, 12.0],
        medium: [0.5, 10.0],
        'central zone': [0.5, 6.0],
        core: [6.0, 13.0]
      });
    });
  });

  // --- test 16 ---
  describe('starFactor', () => {
    test.each([
      ['G', 1.0],
      ['K', 0.9],
      ['F', 0.7],
      ['M', 0.5],
      ['A', 0.1],
      ['gM', 0.1],
      ['DA', 0.1],
      ['NS', 0.1],
      ['BH', 0.1],
      ['ZZ', 0.1]
    ])('scores %s as %d', (spectralClass, expected) => {
      expect(starFactor(spectralClass as string)).toBe(expected);
    });

    test('falls back to the default for an unknown class', () => {
      expect(starFactor('not-a-class')).toBe(DEFAULT_STAR_FACTOR);
      expect(DEFAULT_STAR_FACTOR).toBe(0.1);
    });
  });

  // --- test 17 ---
  describe('temperatureFactor', () => {
    test('peaks at the Earth reference temperature', () => {
      expect(temperatureFactor(EARTH_REFERENCE_TEMPERATURE_K)).toBe(1);
    });

    test('drops to exp(-0.5) one sigma out on either side', () => {
      const oneSigma = Math.exp(-0.5);
      expect(temperatureFactor(288 + 30)).toBeCloseTo(oneSigma, 10);
      expect(temperatureFactor(288 - 30)).toBeCloseTo(oneSigma, 10);
      expect(oneSigma).toBeCloseTo(0.6065, 4);
    });

    test('is negligible far from the reference temperature', () => {
      expect(temperatureFactor(700)).toBeLessThan(1e-6);
    });

    test('is symmetric about the reference temperature', () => {
      for (const delta of [1, 7, 15, 30, 90, 200]) {
        expect(temperatureFactor(288 + delta)).toBeCloseTo(temperatureFactor(288 - delta), 12);
      }
    });
  });

  // --- test 18 ---
  describe('radiusFactor', () => {
    const ROCKY = 'R';

    test('excludes asteroid belts at any diameter', () => {
      for (const diameter of [0, 500, EARTH_DIAMETER_KM, 100000]) {
        expect(radiusFactor('A', diameter)).toBe(0);
      }
    });

    test.each(['G', 'Q', 'U'])('scores giant type %s at 0.05 regardless of diameter', (type) => {
      for (const diameter of [0, 5000, EARTH_DIAMETER_KM, 140000]) {
        expect(radiusFactor(type, diameter)).toBe(0.05);
      }
    });

    test('applies the five radius bands to a rocky planet', () => {
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.1)).toBe(0.1);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.4)).toBe(0.5);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 1.0)).toBe(1.0);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 1.8)).toBe(0.7);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 3.0)).toBe(0.4);
    });

    test('puts each band boundary on the documented side', () => {
      // 0.3 belongs to the 0.3-0.5 band.
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.3 - 1)).toBe(0.1);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.3)).toBe(0.5);
      // 0.5 belongs to the 0.5-1.5 band.
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.5 - 1)).toBe(0.5);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 0.5)).toBe(1.0);
      // 1.5 belongs to the 0.5-1.5 band.
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 1.5)).toBe(1.0);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 1.5 + 1)).toBe(0.7);
      // 2.0 belongs to the 1.5-2.0 band.
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 2.0)).toBe(0.7);
      expect(radiusFactor(ROCKY, EARTH_DIAMETER_KM * 2.0 + 1)).toBe(0.4);
    });
  });

  // --- test 19 ---
  describe('atmosphereFactor', () => {
    test.each(['E', 'O', 'J'])('scores stable atmosphere type %s at 1.0', (type) => {
      expect(atmosphereFactor(type)).toBe(1.0);
    });

    test.each(['I', 'L', 'F', 'W', 'A', 'G', 'Q', 'U'])(
      'scores absent/unstable atmosphere type %s at 0.3',
      (type) => {
        expect(atmosphereFactor(type)).toBe(0.3);
      }
    );

    test.each(['S', 'R', 'D', 'T', '#'])('scores unknown atmosphere type %s at 0.6', (type) => {
      expect(atmosphereFactor(type)).toBe(0.6);
    });

    test('falls back to the neutral default for an unknown type code', () => {
      expect(atmosphereFactor('not-a-type')).toBe(DEFAULT_ATMOSPHERE_FACTOR);
      expect(DEFAULT_ATMOSPHERE_FACTOR).toBe(0.6);
    });
  });

  // --- test 20 ---
  describe('ATMOSPHERE_FACTOR drift guard', () => {
    test.each(ALL_PLANET_TYPES)('has an explicit entry for planet type %s', (type) => {
      expect(Object.prototype.hasOwnProperty.call(ATMOSPHERE_FACTOR, type)).toBe(true);
      expect(typeof ATMOSPHERE_FACTOR[type]).toBe('number');
    });

    test('has no entry the generator cannot emit', () => {
      expect(Object.keys(ATMOSPHERE_FACTOR).sort()).toEqual([...ALL_PLANET_TYPES].sort());
    });
  });

  // --- test 21 ---
  describe('STELLAR_MASS_SOLAR drift guard', () => {
    test.each(MAIN_SEQUENCE_CLASSES)('has a mass entry for main-sequence class %s', (cls) => {
      expect(Object.prototype.hasOwnProperty.call(STELLAR_MASS_SOLAR, cls)).toBe(true);
      expect(typeof STELLAR_MASS_SOLAR[cls]).toBe('number');
    });

    test('has no entry for an off-main-sequence class', () => {
      for (const cls of OFF_MAIN_SEQUENCE_CLASSES) {
        expect(Object.prototype.hasOwnProperty.call(STELLAR_MASS_SOLAR, cls)).toBe(false);
      }
      expect(Object.keys(STELLAR_MASS_SOLAR).sort()).toEqual([...MAIN_SEQUENCE_CLASSES].sort());
    });

    test('carries the masses the model tabulates', () => {
      expect(STELLAR_MASS_SOLAR).toEqual({ O: 25, B: 10, A: 2.0, F: 1.3, G: 1.0, K: 0.8, M: 0.3 });
    });
  });

  // --- test 22 ---
  describe('mainSequenceLifetimeGyr', () => {
    test('anchors the Sun at 10 Gyr', () => {
      expect(mainSequenceLifetimeGyr(1)).toBe(10);
    });

    test('gives an M dwarf ~202.8 Gyr', () => {
      expect(mainSequenceLifetimeGyr(0.3)).toBeCloseTo(202.8, 0);
    });

    test('gives an O star ~0.0032 Gyr', () => {
      expect(mainSequenceLifetimeGyr(25)).toBeCloseTo(0.0032, 6);
    });
  });

  // --- test 23 ---
  describe('ageFactor', () => {
    test.each(OFF_MAIN_SEQUENCE_CLASSES)('is 0 for off-main-sequence class %s at any age', (cls) => {
      for (const age of [0.5, 1, 4.2, 8, 13.5]) {
        expect(ageFactor(cls, age)).toBe(0);
      }
    });

    test.each(['O', 'B'])('is 0 for short-lived class %s at the 0.5 Gyr age floor', (cls) => {
      expect(ageFactor(cls, 0.5)).toBe(0);
    });

    test('is ~1 for a mature G star', () => {
      expect(ageFactor('G', 5)).toBeCloseTo(1, 3);
    });

    test('is 0 for a G star past its 10 Gyr lifetime', () => {
      expect(ageFactor('G', 11)).toBe(0);
    });

    test('is exactly 0.5 at the sigmoid midpoint', () => {
      expect(ageFactor('G', LIFE_START_DELAY_GYR)).toBe(0.5);
    });
  });

  // --- test 24 ---
  describe('habitabilityProbability', () => {
    test('is a hard 0 outside the habitable zone', () => {
      expect(habitabilityProbability({ ...EARTH_ANALOGUE, habitableZone: false })).toBe(0);
      expect(habitabilityProbability({ ...WORKED_EXAMPLE, habitableZone: false })).toBe(0);
    });

    // --- test 25 ---
    describe("the model doc's worked example", () => {
      test('scores S = 0.9 for the K host', () => {
        expect(starFactor(WORKED_EXAMPLE.spectralClass)).toBe(0.9);
      });

      test('scores T = 0.97314 at 295 K', () => {
        expect(temperatureFactor(WORKED_EXAMPLE.temperatureK)).toBeCloseTo(0.97314, 5);
      });

      test('scores R = 1.0 for a 1.1 R-earth rocky planet', () => {
        expect(radiusFactor(WORKED_EXAMPLE.planetType, WORKED_EXAMPLE.diameterKm)).toBe(1.0);
      });

      test('scores A = 0.6 for the unknown rocky atmosphere', () => {
        expect(atmosphereFactor(WORKED_EXAMPLE.planetType)).toBe(0.6);
      });

      test('scores A_age = 0.99939 for a 4.2 Gyr K system', () => {
        expect(ageFactor(WORKED_EXAMPLE.spectralClass, WORKED_EXAMPLE.systemAgeGyr))
          .toBeCloseTo(0.99939, 5);
      });

      // The doc prints 0.54, but its own formula gives 0.5252 (decision #26):
      // the closed-form formula is normative, the printed arithmetic is not.
      test('yields P = 0.5252, the value the formula produces', () => {
        expect(habitabilityProbability(WORKED_EXAMPLE)).toBe(0.5252);
      });
    });

    // --- test 27 ---
    describe('a perfect Earth analogue', () => {
      test('reaches the documented ceiling of 1', () => {
        expect(habitabilityProbability(EARTH_ANALOGUE)).toBe(1);
      });

      test('falls just short at 5 Gyr, before the age sigmoid saturates', () => {
        expect(habitabilityProbability({ ...EARTH_ANALOGUE, systemAgeGyr: 5 })).toBe(0.9999);
      });
    });
  });

  // --- test 26 ---
  describe('complexityCurve / lifeComplexityIndex', () => {
    test("matches the doc's second worked example", () => {
      expect(complexityCurve(3.7)).toBeCloseTo(3.942, 3);
      expect(lifeComplexityIndex(0.5252, 3.7)).toBe(2.07);
    });

    test('is near zero at the start of the biological clock', () => {
      expect(complexityCurve(0)).toBeCloseTo(0.092, 3);
    });

    test('approaches the ceiling without exceeding it', () => {
      expect(complexityCurve(20)).toBeCloseTo(MAX_COMPLEXITY, 6);
      expect(complexityCurve(20)).toBeLessThan(MAX_COMPLEXITY);
    });

    test('clamps a negative t_bio to zero', () => {
      expect(lifeComplexityIndex(1, -3)).toBe(lifeComplexityIndex(1, 0));
    });
  });

  // --- test 28 ---
  describe('romanNumeral', () => {
    test.each([
      [1, 'I'],
      [2, 'II'],
      [4, 'IV'],
      [9, 'IX'],
      [14, 'XIV'],
      [18, 'XVIII']
    ])('formats %i as %s', (value, expected) => {
      expect(romanNumeral(value as number)).toBe(expected);
    });
  });

  // --- test 29 ---
  describe('LifeAssigner.drawSystemAge', () => {
    test.each(ALL_ZONES)('stays inside the declared range of the %s zone', (zone) => {
      const [minGyr, maxGyr] = SYSTEM_AGE_RANGE_GYR[zone];

      for (const draw of [0, 0.25, 0.5, 0.75, 0.999999]) {
        const age = new LifeAssigner(constantPrng(draw), TWO_NAMES).drawSystemAge(zone);
        expect(age).toBeGreaterThanOrEqual(minGyr);
        expect(age).toBeLessThanOrEqual(maxGyr);
      }
    });

    test('rounds to two decimals', () => {
      const assigner = new LifeAssigner(constantPrng(1 / 3), TWO_NAMES);

      const age = assigner.drawSystemAge('extragalactic');

      expect(age).toBe(Number(age.toFixed(AGE_DECIMALS)));
      expect(age).toBe(9.83); // 8 + 5.5/3 = 9.8333...
    });

    test('consumes exactly one draw', () => {
      const counter = countingPrng(constantPrng(0.5));

      new LifeAssigner(counter.prng, TWO_NAMES).drawSystemAge('medium');

      expect(counter.count()).toBe(1);
    });

    test('falls back to the medium range for an unrecognised zone', () => {
      const draw = 0.75;
      const unknown = new LifeAssigner(constantPrng(draw), TWO_NAMES)
        .drawSystemAge('nowhere' as SectorZone);
      const medium = new LifeAssigner(constantPrng(draw), TWO_NAMES).drawSystemAge('medium');

      expect(unknown).toBe(medium);
    });
  });

  describe('LifeAssigner.assignLife', () => {
    // --- test 30 ---
    test('consumes exactly one draw when no name is taken', () => {
      // The presence roll lands above P, so no name is needed.
      const counter = countingPrng(scriptedPrng([0.9]));

      const outcome = new LifeAssigner(counter.prng, TWO_NAMES).assignLife(WORKED_EXAMPLE);

      expect(outcome.hasLife).toBe(false);
      expect(counter.count()).toBe(1);
    });

    test('consumes exactly one draw for an ineligible planet', () => {
      // The roll is taken unconditionally, so the stream stays independent of eligibility.
      const counter = countingPrng(scriptedPrng([0.01]));

      const outcome = new LifeAssigner(counter.prng, TWO_NAMES)
        .assignLife({ ...WORKED_EXAMPLE, habitableZone: false });

      expect(outcome.hasLife).toBe(false);
      expect(counter.count()).toBe(1);
    });

    test('consumes exactly two draws when a pool name is taken', () => {
      const counter = countingPrng(scriptedPrng([0.01, FIRST_AVAILABLE]));

      const outcome = new LifeAssigner(counter.prng, TWO_NAMES).assignLife(WORKED_EXAMPLE);

      expect(outcome.hasLife).toBe(true);
      expect(outcome.name).toBe('Arrakis');
      expect(counter.count()).toBe(2);
    });

    // --- test 31 ---
    test('realises life when the roll lands below P x ABIOGENESIS_FACTOR', () => {
      const outcome = new LifeAssigner(scriptedPrng([0.01, FIRST_AVAILABLE]), TWO_NAMES)
        .assignLife(WORKED_EXAMPLE);

      expect(outcome.hasLife).toBe(true);
      expect(outcome.name).toBeDefined();
    });

    test('leaves the planet barren when the roll lands between P x ABIOGENESIS_FACTOR and P', () => {
      // P is 0.5252 for the worked example, so the realisation threshold is
      // 0.05252. A roll in between would have carried life before the factor.
      const outcome = new LifeAssigner(scriptedPrng([0.3]), TWO_NAMES).assignLife(WORKED_EXAMPLE);

      expect(outcome.hasLife).toBe(false);
      expect(outcome.lifeProbability).toBeCloseTo(0.5252, 4);
    });

    test('leaves the planet barren when the roll lands above P', () => {
      const outcome = new LifeAssigner(scriptedPrng([0.9]), TWO_NAMES).assignLife(WORKED_EXAMPLE);

      expect(outcome.hasLife).toBe(false);
      expect(outcome.name).toBeUndefined();
    });

    test('rounds lifeProbability to 4 decimals and lifeComplexity to 3', () => {
      const outcome = new LifeAssigner(scriptedPrng([0.9]), TWO_NAMES).assignLife(WORKED_EXAMPLE);

      // t_bio = 4.2 - 0.5 = 3.7, so C_index = 0.5252 * C(3.7).
      expect(outcome.lifeProbability).toBe(0.5252);
      expect(outcome.lifeComplexity).toBe(2.07);
      expect(outcome.lifeProbability).toBe(
        Number(outcome.lifeProbability.toFixed(PROBABILITY_DECIMALS))
      );
      expect(outcome.lifeComplexity).toBe(
        Number(outcome.lifeComplexity.toFixed(COMPLEXITY_DECIMALS))
      );
    });

    test('reports the model numbers even for a planet with no life', () => {
      const outcome = new LifeAssigner(scriptedPrng([0.99]), TWO_NAMES)
        .assignLife({ ...WORKED_EXAMPLE, habitableZone: false });

      expect(outcome.hasLife).toBe(false);
      expect(outcome.lifeProbability).toBe(0);
      expect(outcome.lifeComplexity).toBe(0);
    });

    // --- test 32 ---
    test('falls back to a designation once the pool is exhausted, without throwing', () => {
      // P is 1 for the Earth analogue, so every roll produces life.
      const assigner = new LifeAssigner(constantPrng(FIRST_AVAILABLE), ['Solo']);
      const assigned: string[] = [];

      const first = assigner.assignLife({ ...EARTH_ANALOGUE, orbitalNumber: 1 });
      expect(first.hasLife).toBe(true);
      expect(first.name).toBe('Solo');
      assigned.push(first.name as string);

      for (let orbitalNumber = 2; orbitalNumber <= 10; orbitalNumber++) {
        const outcome = assigner.assignLife({
          ...EARTH_ANALOGUE,
          starName: 'UG-0142-B',
          orbitalNumber
        });
        expect(outcome.hasLife).toBe(true);
        expect(outcome.name).toBe(`UG-0142-B ${romanNumeral(orbitalNumber)}`);
        assigned.push(outcome.name as string);
      }

      expect(assigned).toContain('UG-0142-B IV');
      expect(new Set(assigned).size).toBe(assigned.length);
    });

    // --- test 33 ---
    test('never returns the same pool name twice from one instance', () => {
      const assigner = new LifeAssigner(seedrandom('no-repeats'), POOL_20);
      const poolNames = new Set<string>(POOL_20);
      const drawn: string[] = [];

      // An Earth analogue scores P = 1, so ABIOGENESIS_FACTOR makes roughly one
      // iteration in ten carry life; enough passes to drain the 20-name pool.
      for (let orbitalNumber = 1; orbitalNumber <= 2000; orbitalNumber++) {
        const outcome = assigner.assignLife({
          ...EARTH_ANALOGUE,
          starName: `UG-${String(orbitalNumber).padStart(4, '0')}`,
          orbitalNumber: (orbitalNumber % 6) + 1
        });
        if (outcome.name && poolNames.has(outcome.name)) {
          drawn.push(outcome.name);
        }
      }

      expect(drawn).toHaveLength(POOL_20.length);
      expect(new Set(drawn).size).toBe(drawn.length);
    });
  });

  // --- test 34 ---
  describe('determinism', () => {
    test('produces identical output for two instances built from the same seed', () => {
      const first = runSequence(new LifeAssigner(seedrandom('abc'), POOL_20), 50);
      const second = runSequence(new LifeAssigner(seedrandom('abc'), POOL_20), 50);

      expect(first).toEqual(second);
    });

    test('diverges for two instances built from different seeds', () => {
      const first = runSequence(new LifeAssigner(seedrandom('abc'), POOL_20), 50);
      const second = runSequence(new LifeAssigner(seedrandom('xyz'), POOL_20), 50);

      const differs = first.some((entry, i) => JSON.stringify(entry) !== JSON.stringify(second[i]));
      expect(differs).toBe(true);
    });
  });
});
