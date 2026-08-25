import fs from 'fs';
import path from 'path';
import {
    CSV_HEADER,
    MIN_POOL_SIZE,
    NAME_PATTERN,
    loadStarProperNames,
    parseStarNameCsv
} from '../../../src/lib/star-name-pool';

/** Builds a CSV with the required header plus the supplied raw data lines. */
const csv = (...dataLines: string[]): string => [CSV_HEADER, ...dataLines].join('\n');

/**
 * `count` synthetic, valid data rows. The names combine `i % 20` and `i % 26`,
 * whose period (260) exceeds any count used here, so they stay unique.
 */
const fillerRows = (count: number): string[] => {
    const rows: string[] = [];
    for (let i = 0; i < count; i++) {
        const name = `Filler${'a'.repeat(i % 20)}${String.fromCharCode(65 + (i % 26))}`;
        rows.push(`${name},HR ${i},Lyr,2016-07-20`);
    }
    return rows;
};

/** A valid CSV clearing the MIN_POOL_SIZE floor, with the supplied lines first. */
const csvWithPool = (...extraLines: string[]): string =>
    csv(...extraLines, ...fillerRows(MIN_POOL_SIZE));

const VALID_ROWS = [
    'Absolutno,XO-5,Lyn,2019-12-17',
    'Acamar,HR 897,Eri,2016-07-20',
    'Alula Australis,HR 4375,UMa,2016-08-21',
    "Barnard's Star,GJ 699,Oph,2017-02-01"
];

describe('parseStarNameCsv', () => {
    // Test 1
    test('parses a valid CSV and returns the name column in file order', () => {
        const names = parseStarNameCsv(csvWithPool(...VALID_ROWS));

        expect(names.slice(0, 4)).toEqual([
            'Absolutno',
            'Acamar',
            'Alula Australis',
            "Barnard's Star"
        ]);
        expect(names).toHaveLength(VALID_ROWS.length + MIN_POOL_SIZE);
    });

    // Test 2
    test('skips comment and blank lines before the header, between rows and trailing', () => {
        const content = [
            '# leading comment',
            '',
            '# another comment',
            CSV_HEADER,
            'Absolutno,XO-5,Lyn,2019-12-17',
            '',
            '# a comment between rows',
            'Acamar,HR 897,Eri,2016-07-20',
            ...fillerRows(MIN_POOL_SIZE),
            '',
            '# trailing comment',
            ''
        ].join('\n');

        const names = parseStarNameCsv(content);

        expect(names[0]).toBe('Absolutno');
        expect(names[1]).toBe('Acamar');
        expect(names).toHaveLength(2 + MIN_POOL_SIZE);
    });

    // Test 3
    test('accepts \\r\\n line endings and trims surrounding whitespace from values', () => {
        const content = csvWithPool('  Absolutno ,  XO-5 ,  Lyn ,  2019-12-17  ')
            .split('\n')
            .join('\r\n');

        expect(parseStarNameCsv(content)[0]).toBe('Absolutno');
    });

    // Test 4
    test('throws when the header line is missing', () => {
        expect(() => parseStarNameCsv('Absolutno,XO-5,Lyn,2019-12-17')).toThrow(
            /Absolutno,XO-5,Lyn,2019-12-17/
        );
    });

    test('throws when the header line is misspelled', () => {
        const content = ['name,designation,constelation,iau_approval_date', ...VALID_ROWS].join('\n');
        expect(() => parseStarNameCsv(content)).toThrow(/constelation/);
    });

    // Test 5
    test('throws when a data row has 3 fields', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,XO-5,Lyn'))).toThrow(
            /got 3 in "Absolutno,XO-5,Lyn"/
        );
    });

    test('throws when a data row has 5 fields', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,XO-5,Lyn,2019-12-17,extra'))).toThrow(
            /got 5/
        );
    });

    // Test 6
    test('throws when a name is empty', () => {
        expect(() => parseStarNameCsv(csvWithPool(',XO-5,Lyn,2019-12-17'))).toThrow(/must be between/);
    });

    test('throws when a name is a single character', () => {
        expect(() => parseStarNameCsv(csvWithPool('A,XO-5,Lyn,2019-12-17'))).toThrow(/must be between/);
    });

    // Test 7
    test('throws when a name exceeds 32 characters', () => {
        const tooLong = 'A'.repeat(33);
        expect(() => parseStarNameCsv(csvWithPool(`${tooLong},XO-5,Lyn,2019-12-17`))).toThrow(
            /must be between/
        );
    });

    test('accepts a name of exactly 32 characters', () => {
        const exact = 'A'.repeat(32);
        expect(parseStarNameCsv(csvWithPool(`${exact},XO-5,Lyn,2019-12-17`))[0]).toBe(exact);
    });

    // Test 8
    test('throws when a name contains a digit', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno2,XO-5,Lyn,2019-12-17'))).toThrow(
            /disallowed characters/
        );
    });

    test('throws when a name contains another disallowed character', () => {
        expect(() => parseStarNameCsv(csvWithPool('Abso!utno,XO-5,Lyn,2019-12-17'))).toThrow(
            /disallowed characters/
        );
    });

    test('throws when a name does not start with a letter', () => {
        expect(() => parseStarNameCsv(csvWithPool("'Absolutno,XO-5,Lyn,2019-12-17"))).toThrow(
            /disallowed characters/
        );
    });

    // Test 9
    test('throws on a case-insensitive duplicate name', () => {
        const content = csvWithPool('Vega,HR 7001,Lyr,2016-06-30', 'vega,HR 7001,Lyr,2016-06-30');
        expect(() => parseStarNameCsv(content)).toThrow(/Duplicate star name on line 3: "vega"/);
    });

    // Test 10
    test('throws when designation is empty', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,,Lyn,2019-12-17'))).toThrow(
            /Missing designation/
        );
    });

    test('throws when constellation is empty', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,XO-5,,2019-12-17'))).toThrow(
            /Missing constellation/
        );
    });

    test('throws when iau_approval_date is empty', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,XO-5,Lyn,'))).toThrow(
            /Missing iau_approval_date/
        );
    });

    // Test 11
    test('throws when iau_approval_date is not YYYY-MM-DD', () => {
        expect(() => parseStarNameCsv(csvWithPool('Absolutno,XO-5,Lyn,17-12-2019'))).toThrow(
            /is not YYYY-MM-DD/
        );
    });

    // Test 12
    test(`throws when the file has fewer than ${MIN_POOL_SIZE} data rows`, () => {
        const content = csv(...fillerRows(MIN_POOL_SIZE - 1));

        expect(() => parseStarNameCsv(content)).toThrow(
            `Invalid star name CSV: expected at least ${MIN_POOL_SIZE} data rows, got ${MIN_POOL_SIZE - 1}`
        );
    });

    test('names the offending line number in the error message', () => {
        const content = csv('Absolutno,XO-5,Lyn,2019-12-17', 'A,XO-5,Lyn,2019-12-17');
        expect(() => parseStarNameCsv(content)).toThrow(/line 3/);
    });
});

describe('loadStarProperNames', () => {
    // Test 13
    test(`reads the packaged asset and returns at least ${MIN_POOL_SIZE} names`, () => {
        expect(loadStarProperNames().length).toBeGreaterThanOrEqual(MIN_POOL_SIZE);
    });

    // Test 14
    test('every packaged name is valid and the set is case-insensitively unique', () => {
        const names = loadStarProperNames();

        for (const name of names) {
            expect(name).toMatch(NAME_PATTERN);
        }

        const lowered = new Set(names.map((name) => name.toLowerCase()));
        expect(lowered.size).toBe(names.length);
    });

    // Test 15
    test('caches and freezes the result', () => {
        const first = loadStarProperNames();
        const second = loadStarProperNames();

        expect(second).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
    });
});

describe('star-proper-names.csv asset', () => {
    const assetPath = path.join(__dirname, '../../../src/assets/star-proper-names.csv');
    const content = fs.readFileSync(assetPath, 'utf8');

    test('carries the IAU-CSN attribution in its header comments', () => {
        expect(content).toContain('# Star names from the IAU Catalog of Star Names (IAU-CSN).');
        expect(content).toContain('https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt');
        expect(content).toContain('IAU Division C Working Group on Star Names (WGSN)');
        expect(content).toContain('Creative Commons Attribution (CC BY)');
        expect(content).toContain('# Modified: reduced to four columns');
        expect(content).toContain('# Catalogue edition: 2022-04-04');
    });

    test('holds the IAU-CSN 2022-04-04 row count', () => {
        expect(parseStarNameCsv(content)).toHaveLength(451);
    });

    test('preserves multi-word names extracted by column offset', () => {
        const names = parseStarNameCsv(content);

        expect(names).toContain('Alula Australis');
        expect(names).toContain('Arkab Posterior');
        expect(names).toContain("Barnard's Star");
        expect(names.filter((name) => name.includes(' '))).toHaveLength(24);
    });
});

describe('repo-root NOTICE', () => {
    test('carries the IAU-CSN attribution', () => {
        const notice = fs.readFileSync(path.join(__dirname, '../../../../NOTICE'), 'utf8');

        expect(notice).toContain('IAU Catalog of Star Names (IAU-CSN)');
        expect(notice).toContain('IAU Division C Working Group on Star Names (WGSN)');
        expect(notice).toContain('https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt');
        expect(notice).toContain('Creative Commons Attribution (CC BY)');
        expect(notice).toContain('The data has been modified');
    });
});

describe('vercel.json packaging', () => {
    // The asset is read from disk at runtime, so it must be bundled with the
    // serverless function; Vercel does not trace static files automatically.
    test('bundles the assets directory with the serverless function', () => {
        const config = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../../../../vercel.json'), 'utf8')
        );

        expect(config.functions['api/index.ts'].includeFiles).toBe('backend/src/assets/**');
    });
});
