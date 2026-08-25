import fs from 'fs';
import path from 'path';
import {
    MIN_PLANET_POOL_SIZE,
    PLANET_CSV_HEADER,
    PLANET_NAME_PATTERN,
    loadPlanetProperNames,
    parsePlanetNameCsv
} from '../../../src/lib/planet-name-pool';

/** Builds a CSV with the required header plus the supplied raw data lines. */
const csv = (...dataLines: string[]): string => [PLANET_CSV_HEADER, ...dataLines].join('\n');

/**
 * `count` synthetic, valid data rows. The names combine `i % 20` and `i % 26`,
 * whose period (520) exceeds any count used here, so they stay unique.
 */
const fillerRows = (count: number): string[] => {
    const rows: string[] = [];
    for (let i = 0; i < count; i++) {
        const name = `Filler${'a'.repeat(i % 20)}${String.fromCharCode(65 + (i % 26))}`;
        rows.push(`${name},Generic sci-fi`);
    }
    return rows;
};

/** A valid CSV clearing the MIN_PLANET_POOL_SIZE floor, with the supplied lines first. */
const csvWithPool = (...extraLines: string[]): string =>
    csv(...extraLines, ...fillerRows(MIN_PLANET_POOL_SIZE));

const VALID_ROWS = [
    'Arrakis,Dune',
    'Giedi Prime,Dune',
    'Trantor,Asimov - Foundation',
    "Qo'noS,Star Trek"
];

describe('parsePlanetNameCsv', () => {
    // Test 1
    test('parses a valid CSV and returns the name column in file order', () => {
        const names = parsePlanetNameCsv(csvWithPool(...VALID_ROWS));

        expect(names.slice(0, 4)).toEqual(['Arrakis', 'Giedi Prime', 'Trantor', "Qo'noS"]);
        expect(names).toHaveLength(VALID_ROWS.length + MIN_PLANET_POOL_SIZE);
    });

    // Test 2
    test('skips comment and blank lines before the header, between rows and trailing', () => {
        const content = [
            '# leading comment',
            '',
            '# another comment',
            PLANET_CSV_HEADER,
            'Arrakis,Dune',
            '',
            '# a comment between rows',
            'Caladan,Dune',
            ...fillerRows(MIN_PLANET_POOL_SIZE),
            '',
            '# trailing comment',
            ''
        ].join('\n');

        const names = parsePlanetNameCsv(content);

        expect(names[0]).toBe('Arrakis');
        expect(names[1]).toBe('Caladan');
        expect(names).toHaveLength(2 + MIN_PLANET_POOL_SIZE);
    });

    // Test 3
    test('accepts \\r\\n line endings and trims surrounding whitespace from values', () => {
        const content = csvWithPool('  Arrakis ,  Dune  ').split('\n').join('\r\n');

        expect(parsePlanetNameCsv(content)[0]).toBe('Arrakis');
    });

    // Test 4
    test('throws when the header line is missing', () => {
        expect(() => parsePlanetNameCsv('Arrakis,Dune')).toThrow(/Arrakis,Dune/);
    });

    test('throws when the header line is misspelled', () => {
        const content = ['name,sources', ...VALID_ROWS].join('\n');
        expect(() => parsePlanetNameCsv(content)).toThrow(/name,sources/);
    });

    // Test 5
    test('throws when a data row has 1 field', () => {
        expect(() => parsePlanetNameCsv(csvWithPool('Arrakis'))).toThrow(
            /line 2: expected 2 comma-separated fields, got 1 in "Arrakis"/
        );
    });

    test('throws when a data row has 3 fields', () => {
        expect(() => parsePlanetNameCsv(csvWithPool('Arrakis,Dune,extra'))).toThrow(
            /line 2: expected 2 comma-separated fields, got 3 in "Arrakis,Dune,extra"/
        );
    });

    // Test 6
    test('accepts a single-character name', () => {
        expect(parsePlanetNameCsv(csvWithPool('O,Le Guin - Ekumen'))[0]).toBe('O');
    });

    // Test 7
    test.each([
        ['Kepler-186f', 'Real astronomy - exoplanet'],
        ['55 Cancri e', 'Real astronomy - exoplanet'],
        ['Eden Prime', 'Mass Effect'],
        ["Qo'noS", 'Star Trek'],
        ['LV-426', 'Alien']
    ])('accepts the name "%s"', (name, source) => {
        expect(parsePlanetNameCsv(csvWithPool(`${name},${source}`))[0]).toBe(name);
    });

    // Test 8
    test('throws when a name is empty', () => {
        expect(() => parsePlanetNameCsv(csvWithPool(',Dune'))).toThrow(/must be between/);
    });

    test('throws when a name exceeds 32 characters', () => {
        const tooLong = 'A'.repeat(33);
        expect(() => parsePlanetNameCsv(csvWithPool(`${tooLong},Dune`))).toThrow(/must be between/);
    });

    test('accepts a name of exactly 32 characters', () => {
        const exact = 'A'.repeat(32);
        expect(parsePlanetNameCsv(csvWithPool(`${exact},Dune`))[0]).toBe(exact);
    });

    // Test 9
    test('throws when a name contains a disallowed character', () => {
        expect(() => parsePlanetNameCsv(csvWithPool('Zeta*,Generic sci-fi'))).toThrow(
            /disallowed characters/
        );
    });

    test('throws when a name does not start with a letter or digit', () => {
        expect(() => parsePlanetNameCsv(csvWithPool("'Arrakis,Dune"))).toThrow(
            /disallowed characters/
        );
    });

    // Test 10
    test('throws on a case-insensitive duplicate name', () => {
        const content = csvWithPool('Terra,Warhammer 40000', 'terra,Real astronomy');
        expect(() => parsePlanetNameCsv(content)).toThrow(
            /Duplicate planet name on line 3: "terra"/
        );
    });

    // Test 11
    test('throws when source is empty', () => {
        expect(() => parsePlanetNameCsv(csvWithPool('Arrakis,'))).toThrow(
            /Missing source on line 2 for "Arrakis"/
        );
    });

    // Test 12
    test(`throws when the file has fewer than ${MIN_PLANET_POOL_SIZE} data rows`, () => {
        const content = csv(...fillerRows(MIN_PLANET_POOL_SIZE - 1));

        expect(() => parsePlanetNameCsv(content)).toThrow(
            `Invalid planet name CSV: expected at least ${MIN_PLANET_POOL_SIZE} data rows, got ${MIN_PLANET_POOL_SIZE - 1}`
        );
    });

    test('names the offending line number in the error message', () => {
        const content = csv('Arrakis,Dune', 'Zeta*,Generic sci-fi');
        expect(() => parsePlanetNameCsv(content)).toThrow(/line 3/);
    });
});

describe('loadPlanetProperNames', () => {
    // Test 13
    test(`reads the packaged asset and returns at least ${MIN_PLANET_POOL_SIZE} names`, () => {
        expect(loadPlanetProperNames().length).toBeGreaterThanOrEqual(MIN_PLANET_POOL_SIZE);
    });

    // Test 14
    test('every packaged name is valid and the set is case-insensitively unique', () => {
        const names = loadPlanetProperNames();

        for (const name of names) {
            expect(name).toMatch(PLANET_NAME_PATTERN);
        }

        const lowered = new Set(names.map((name) => name.toLowerCase()));
        expect(lowered.size).toBe(names.length);
    });

    // Test 15
    test('caches and freezes the result', () => {
        const first = loadPlanetProperNames();
        const second = loadPlanetProperNames();

        expect(second).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
    });
});

describe('planet-proper-names.csv asset', () => {
    const assetPath = path.join(__dirname, '../../../src/assets/planet-proper-names.csv');
    const content = fs.readFileSync(assetPath, 'utf8');

    test('carries the provenance and attribution header comments', () => {
        expect(content).toContain(
            '# Planet proper names used to name worlds where life was generated.'
        );
        expect(content).toContain('# Source: the feature draft');
        expect(content).toContain('# The `source` column records where each name comes from');
        expect(content).toContain('it is never read at runtime');
        expect(content).toContain(
            'here purely as generated identifiers; no affiliation with, or endorsement by,'
        );
        expect(content).toContain('any rights holder is implied. See NOTICE.');
        expect(content).toContain(
            '# Duplicates in the draft list were removed, keeping the first occurrence:'
        );
        expect(content).toContain(
            '# Terra, Marte, Europa, Miranda, Ariel, Terra 2, Elysium, Nettuno, Vulcan.'
        );
    });

    test('holds the 288 unique names left after deduplicating the 297 draft rows', () => {
        expect(parsePlanetNameCsv(content)).toHaveLength(288);
    });

    test('keeps the first occurrence of each name removed as a duplicate', () => {
        const names = parsePlanetNameCsv(content);

        for (const removed of [
            'Terra',
            'Marte',
            'Europa',
            'Miranda',
            'Ariel',
            'Terra 2',
            'Elysium',
            'Nettuno',
            'Vulcan'
        ]) {
            expect(names.filter((name) => name === removed)).toHaveLength(1);
        }
    });

    test('matches the draft list once deduplicated case-insensitively', () => {
        const draft = fs.readFileSync(
            path.join(__dirname, '../../../../STORIES/SPECS/life-on-planets.draft.md'),
            'utf8'
        );
        const lines = draft.split(/\r?\n/);
        const headerIndex = lines.indexOf('name,source');
        const endIndex = lines.indexOf('```', headerIndex);
        const draftRows = lines.slice(headerIndex + 1, endIndex);

        expect(draftRows).toHaveLength(297);

        const seen = new Set<string>();
        const expected: string[] = [];
        for (const row of draftRows) {
            const name = row.split(',')[0].trim();
            const key = name.toLowerCase();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            expected.push(name);
        }

        expect(parsePlanetNameCsv(content)).toEqual(expected);
    });
});

describe('repo-root NOTICE', () => {
    const notice = fs.readFileSync(path.join(__dirname, '../../../../NOTICE'), 'utf8');

    test('carries the planet proper-name attribution paragraph', () => {
        expect(notice).toContain(
            'Planet proper names in backend/src/assets/planet-proper-names.csv are drawn from'
        );
        expect(notice).toContain(
            'works of science fiction, from mythology, and from real astronomy.'
        );
        expect(notice).toContain(
            'solely as generated identifiers for procedurally created worlds.'
        );
        expect(notice).toContain('No affiliation');
        expect(notice).toContain('with, or endorsement by, any rights holder is implied.');
        expect(notice).toContain('provenance reference only and is not used at runtime.');
    });

    test('still carries the pre-existing IAU-CSN attribution', () => {
        expect(notice).toContain('IAU Catalog of Star Names (IAU-CSN)');
        expect(notice).toContain('Creative Commons Attribution (CC BY)');
        expect(notice).toContain('See backend/src/assets/star-proper-names.csv.');
    });
});
