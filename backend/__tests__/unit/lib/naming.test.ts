import seedrandom from 'seedrandom';
import {
  SectorNamer,
  SystemNaming,
  componentLetter,
  formatDesignation,
  DESIGNATION_MIN_DIGITS,
  DESIGNATION_PREFIX,
  INDEPENDENT_COMPONENT_NAME_PROBABILITY,
  NAMED_SYSTEM_PROBABILITY
} from '../../../src/lib/naming';

// --- Fake PRNGs -------------------------------------------------------------

/** Replays a scripted list of draws; throws if the namer draws more than expected. */
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

// Rolls below every probability threshold (draw a proper name / an independent
// component name) and above every threshold (fall back to designation / tied name).
const LOW_ROLL = 0.01;
const HIGH_ROLL = 0.99;
// A take() draw of 0 always picks the first still-available pool entry.
const FIRST_AVAILABLE = 0;

const TWO_NAMES = ['Necklace', 'Dust-Ball'] as const;

const POOL_20 = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
  'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett',
  'Kilo', 'Lima', 'Mike', 'November', 'Oscar',
  'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango'
] as const;

/** Drives a namer through a fixed (systemId, starCount) sequence — star counts cycle 2,3,4,1. */
function runSequence(namer: SectorNamer, systemCount: number): SystemNaming[] {
  const results: SystemNaming[] = [];
  for (let systemId = 1; systemId <= systemCount; systemId++) {
    results.push(namer.nameSystem(systemId, (systemId % 4) + 1));
  }
  return results;
}

describe('naming', () => {
  describe('constants', () => {
    test('carry the values the spec mandates', () => {
      expect(NAMED_SYSTEM_PROBABILITY).toBe(0.3);
      expect(INDEPENDENT_COMPONENT_NAME_PROBABILITY).toBe(0.15);
      expect(DESIGNATION_PREFIX).toBe('UG');
      expect(DESIGNATION_MIN_DIGITS).toBe(4);
    });
  });

  // --- test 16 ---
  describe('formatDesignation', () => {
    test('zero-pads to at least 4 digits', () => {
      expect(formatDesignation(6)).toBe('UG-0006');
      expect(formatDesignation(1)).toBe('UG-0001');
    });

    test('never truncates ids wider than the minimum', () => {
      expect(formatDesignation(12345)).toBe('UG-12345');
    });
  });

  // --- test 17 ---
  describe('componentLetter', () => {
    test('maps 1-4 to A-D', () => {
      expect(componentLetter(1)).toBe('A');
      expect(componentLetter(2)).toBe('B');
      expect(componentLetter(3)).toBe('C');
      expect(componentLetter(4)).toBe('D');
    });
  });

  describe('SectorNamer.nameSystem', () => {
    // --- test 18 ---
    test('gives a single-star proper-named system no component suffix', () => {
      const prng = scriptedPrng([LOW_ROLL, FIRST_AVAILABLE]);
      const namer = new SectorNamer(prng, TWO_NAMES);

      const naming = namer.nameSystem(6, 1);

      expect(naming.hasProperName).toBe(true);
      expect(naming.systemName).toBe('Necklace');
      expect(naming.starNames).toEqual(['Necklace']);
    });

    // --- test 19 ---
    test('names a single-star designation system after its designation', () => {
      const prng = scriptedPrng([HIGH_ROLL]);
      const namer = new SectorNamer(prng, TWO_NAMES);

      const naming = namer.nameSystem(6, 1);

      expect(naming.hasProperName).toBe(false);
      expect(naming.systemName).toBe('UG-0006');
      expect(naming.starNames).toEqual(['UG-0006']);
      expect(naming.systemName).toBe(formatDesignation(6));
    });

    // --- test 20 ---
    test('ties both components to the system name on a high component roll', () => {
      const prng = scriptedPrng([LOW_ROLL, FIRST_AVAILABLE, HIGH_ROLL]);
      const namer = new SectorNamer(prng, TWO_NAMES);

      const naming = namer.nameSystem(6, 2);

      expect(naming.starNames).toEqual(['Necklace-A', 'Necklace-B']);
    });

    // --- test 21 ---
    test('draws an independent name for a secondary on a low component roll', () => {
      const prng = scriptedPrng([
        LOW_ROLL, FIRST_AVAILABLE,   // system draws "Necklace"
        LOW_ROLL, FIRST_AVAILABLE,   // component B draws its own name
        HIGH_ROLL                    // component C stays tied
      ]);
      const namer = new SectorNamer(prng, TWO_NAMES);

      const naming = namer.nameSystem(6, 3);

      expect(naming.starNames).toEqual(['Necklace-A', 'Dust-Ball', 'Necklace-C']);
      expect(naming.starNames[1]).not.toBe(naming.systemName);
    });

    // --- test 22 ---
    test('never draws an independent name inside a designation system', () => {
      const prng = scriptedPrng([HIGH_ROLL, LOW_ROLL]);
      const namer = new SectorNamer(prng, TWO_NAMES);

      const naming = namer.nameSystem(6, 2);

      expect(naming.hasProperName).toBe(false);
      expect(naming.starNames).toEqual(['UG-0006-A', 'UG-0006-B']);
    });

    // --- test 23 ---
    test.each([1, 2, 3, 4])('returns exactly %i star names for a designation system', (starCount) => {
      const namer = new SectorNamer(constantPrng(HIGH_ROLL), POOL_20);

      expect(namer.nameSystem(6, starCount).starNames).toHaveLength(starCount);
    });

    test.each([1, 2, 3, 4])('returns exactly %i star names for a proper-named system', (starCount) => {
      const namer = new SectorNamer(constantPrng(LOW_ROLL), POOL_20);

      const naming = namer.nameSystem(6, starCount);

      expect(naming.hasProperName).toBe(true);
      expect(naming.starNames).toHaveLength(starCount);
    });

    // --- test 24 ---
    test('falls back to designations once the pool is exhausted, without throwing', () => {
      // Every roll requests a proper name, but the pool holds exactly one.
      const namer = new SectorNamer(constantPrng(LOW_ROLL), ['Solo']);

      const first = namer.nameSystem(1, 1);
      expect(first.hasProperName).toBe(true);
      expect(first.systemName).toBe('Solo');
      expect(first.starNames).toEqual(['Solo']);

      for (let systemId = 2; systemId <= 10; systemId++) {
        const naming = namer.nameSystem(systemId, 2);
        expect(naming.hasProperName).toBe(false);
        expect(naming.systemName).toBe(formatDesignation(systemId));
        // Components fall back to the tied form too, never to a pool draw.
        expect(naming.starNames).toEqual([
          `${formatDesignation(systemId)}-A`,
          `${formatDesignation(systemId)}-B`
        ]);
      }
    });

    // --- test 25 ---
    test('never returns the same proper name twice from one instance', () => {
      const namer = new SectorNamer(seedrandom('no-repeats'), POOL_20);
      const poolNames = new Set<string>(POOL_20);
      const drawn: string[] = [];

      for (const naming of runSequence(namer, 200)) {
        if (naming.hasProperName) {
          drawn.push(naming.systemName);
        }
        for (const starName of naming.starNames) {
          // Tied names carry a "-<letter>" suffix, so anything matching a pool
          // entry (other than the system name itself) is an independent draw.
          if (poolNames.has(starName) && starName !== naming.systemName) {
            drawn.push(starName);
          }
        }
      }

      expect(drawn.length).toBeGreaterThan(0);
      expect(drawn.length).toBeLessThanOrEqual(POOL_20.length);
      expect(new Set(drawn).size).toBe(drawn.length);
    });

    // --- test 26 ---
    test('produces identical output for two instances built from the same seed', () => {
      const first = runSequence(new SectorNamer(seedrandom('abc'), POOL_20), 50);
      const second = runSequence(new SectorNamer(seedrandom('abc'), POOL_20), 50);

      expect(first).toEqual(second);
    });

    // --- test 27 ---
    test('diverges for two instances built from different seeds', () => {
      const first = runSequence(new SectorNamer(seedrandom('abc'), POOL_20), 50);
      const second = runSequence(new SectorNamer(seedrandom('xyz'), POOL_20), 50);

      const differs = first.some((naming, i) => naming.systemName !== second[i].systemName);
      expect(differs).toBe(true);
    });

    // --- test 28 ---
    test('consumes the same number of draws regardless of pool size', () => {
      const systemCount = 10;
      const script = new Array(systemCount * 4).fill(HIGH_ROLL); // designation-only rolls

      const small = countingPrng(scriptedPrng([...script]));
      const large = countingPrng(scriptedPrng([...script]));

      const smallResults = runSequence(new SectorNamer(small.prng, POOL_20.slice(0, 3)), systemCount);
      const largeResults = runSequence(
        new SectorNamer(large.prng, Array.from({ length: 300 }, (_, i) => `Filler${i}`)),
        systemCount
      );

      // One roll for the system, one per secondary component: starCount draws per system.
      const expectedDraws = smallResults.reduce((sum, naming) => sum + naming.starNames.length, 0);

      expect(smallResults.every((naming) => !naming.hasProperName)).toBe(true);
      expect(largeResults.every((naming) => !naming.hasProperName)).toBe(true);
      expect(small.count()).toBe(expectedDraws);
      expect(large.count()).toBe(expectedDraws);
    });

    // --- test 28, hardened: the run above never actually exhausts either pool,
    // so on its own it cannot tell the always-draw-first implementation apart
    // from one that skips the roll when no name is available. These two drive a
    // pool to genuine exhaustion and pin the draw count on both branches.
    test('keeps consuming system rolls after its pool is exhausted', () => {
      const systemCount = 10;
      // Only the very first system requests a proper name, so both namers grant
      // exactly one. From system 2 on, the one-name pool is empty while the
      // 300-name pool is not — the only difference between the two runs.
      const script = [LOW_ROLL, FIRST_AVAILABLE, ...new Array(systemCount * 4).fill(HIGH_ROLL)];

      const exhausted = countingPrng(scriptedPrng([...script]));
      const plentiful = countingPrng(scriptedPrng([...script]));

      const exhaustedResults = runSequence(new SectorNamer(exhausted.prng, ['Solo']), systemCount);
      const plentifulResults = runSequence(
        new SectorNamer(plentiful.prng, Array.from({ length: 300 }, (_, i) => `Filler${i}`)),
        systemCount
      );

      // System 1 drains the one-name pool; every later system falls back.
      expect(exhaustedResults[0].hasProperName).toBe(true);
      expect(exhaustedResults[0].systemName).toBe('Solo');
      expect(exhaustedResults.slice(1).every((naming) => !naming.hasProperName)).toBe(true);
      expect(plentifulResults[0].hasProperName).toBe(true);
      expect(plentifulResults.slice(1).every((naming) => !naming.hasProperName)).toBe(true);

      // starCount decision rolls per system, plus the single granted name draw.
      const decisionDraws = exhaustedResults.reduce((sum, naming) => sum + naming.starNames.length, 0);
      const expectedDraws = decisionDraws + 1;

      expect(exhausted.count()).toBe(expectedDraws);
      expect(plentiful.count()).toBe(expectedDraws);
    });

    test('keeps consuming component rolls when the pool empties inside a proper-named system', () => {
      // The primary takes the pool's last name, so both secondaries roll low but
      // cannot be granted one. The rolls must still be drawn.
      const counting = countingPrng(scriptedPrng([LOW_ROLL, FIRST_AVAILABLE, LOW_ROLL, LOW_ROLL]));
      const namer = new SectorNamer(counting.prng, ['Solo']);

      const naming = namer.nameSystem(1, 3);

      expect(naming.hasProperName).toBe(true);
      expect(naming.starNames).toEqual(['Solo-A', 'Solo-B', 'Solo-C']);
      // systemRoll + the granted draw + one roll per secondary component.
      expect(counting.count()).toBe(4);
    });
  });
});
