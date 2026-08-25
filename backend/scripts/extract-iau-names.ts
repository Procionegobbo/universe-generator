/**
 * Regenerates backend/src/assets/star-proper-names.csv from the IAU Catalog of
 * Star Names (IAU-CSN).
 *
 *   Source: https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt
 *   License: Creative Commons Attribution (CC BY) — see the repo-root NOTICE.
 *
 * This is a one-off maintenance tool, not part of the running backend: nothing
 * imports it, it is not wired into an npm script, and the committed CSV is the
 * artefact the application actually reads. Run it only to refresh the asset
 * after the WGSN publishes a new catalogue edition (see Decision #18 in
 * STORIES/SPECS/system-names.md — refreshing the CSV changes which names a
 * previously used seed produces, though not the sector geometry).
 *
 * Run (from backend/):
 *   npx ts-node scripts/extract-iau-names.ts
 *
 * Options:
 *   --source=<url|path>   Override the catalogue location (default: the URL above).
 *                         A local path allows an offline re-run.
 *   --out=<path>          Override the output CSV (default: ../src/assets/star-proper-names.csv).
 *   --extracted=<date>    Value for the "# Extracted:" header line, YYYY-MM-DD
 *                         (default: today). Pass the committed file's date to
 *                         reproduce it byte-for-byte.
 *
 * IAU-CSN is FIXED-WIDTH, not delimited — 24 of the names contain a space
 * ("Alula Australis", "Arkab Posterior", "Barnard's Star", ...), so splitting on
 * whitespace silently corrupts them. Field boundaries are therefore not
 * hardcoded here: they are derived at run time from the file's own
 * "#Name/ASCII ..." label line (drop its leading '#'; each label's start offset
 * is the start of its column, and the column ends where the next one begins).
 * For the 2022-04-04 edition that yields Name/ASCII@0, Name/Diacritics@17,
 * Designation@35, ID@48, ID@54, Con@60, #@64, WDS_J@69, mag@81, bnd@86, HIP@91,
 * HD@99, RA@103, Dec@114, Date@125, Notes@136 — but a re-run recomputes them, so
 * a reformatted future edition still extracts correctly.
 *
 * Comment lines ('#') are skipped, and so is the one malformed header line in
 * the source that begins with '$' instead of '#'.
 *
 * The generated file is validated with the shipped parseStarNameCsv before it is
 * written, so this script cannot produce an asset the loader would reject.
 */

import fs from 'fs';
import path from 'path';
import { parseStarNameCsv } from '../src/lib/star-name-pool';

const DEFAULT_SOURCE = 'https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt';
const DEFAULT_OUT = path.join(__dirname, '../src/assets/star-proper-names.csv');

// Column indexes (0-based) of the four fields we keep, with the labels we expect
// to find there as a guard against the catalogue changing shape underneath us.
const KEPT_COLUMNS: ReadonlyArray<{ index: number; label: string; csvName: string }> = [
    { index: 0, label: 'Name/ASCII', csvName: 'name' },
    { index: 2, label: 'Designation', csvName: 'designation' },
    { index: 5, label: 'Con', csvName: 'constellation' },
    { index: 14, label: 'Date', csvName: 'iau_approval_date' }
];

function argValue(name: string): string | undefined {
    const prefix = `--${name}=`;
    const found = process.argv.find((arg) => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : undefined;
}

async function readSource(source: string): Promise<string> {
    if (!/^https?:\/\//.test(source)) {
        return fs.readFileSync(source, 'utf8');
    }

    const response = await fetch(source);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${source}: HTTP ${response.status}`);
    }
    return response.text();
}

/** Start offset of every fixed-width column, derived from the catalogue's own label line. */
function deriveColumns(lines: string[]): { starts: number[]; labels: string[] } {
    const labelLine = lines.find((line) => line.startsWith('#Name/ASCII'));
    if (!labelLine) {
        throw new Error('Could not find the "#Name/ASCII" label line in the source');
    }

    // Dropping the leading '#' realigns the labels with the data rows.
    const header = labelLine.slice(1);
    const starts: number[] = [];
    const labels: string[] = [];
    const token = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = token.exec(header)) !== null) {
        starts.push(match.index);
        labels.push(match[0]);
    }

    for (const { index, label } of KEPT_COLUMNS) {
        if (labels[index] !== label) {
            throw new Error(
                `Unexpected catalogue layout: expected column ${index + 1} to be "${label}", found "${labels[index]}"`
            );
        }
    }

    return { starts, labels };
}

/** The catalogue states its own edition date in a "# Last updated YYYY-MM-DD" line. */
function deriveEdition(lines: string[]): string {
    for (const line of lines) {
        const match = line.match(/^#\s*Last updated\s+(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
    }
    throw new Error('Could not find the "# Last updated" line in the source');
}

function buildCsv(rows: string[][], edition: string, extracted: string): string {
    const header = [
        '# Star names from the IAU Catalog of Star Names (IAU-CSN).',
        `# Source:   ${DEFAULT_SOURCE}`,
        '# Authority: IAU Division C Working Group on Star Names (WGSN)',
        '#           https://www.iau.org/science/scientific_bodies/working_groups/280/',
        '# License:  Creative Commons Attribution (CC BY) — IAU-produced products are',
        '#           free to use in perpetuity, world-wide, provided the source is cited.',
        '# Modified: reduced to four columns (Name/ASCII, Designation, Con, Date) and',
        '#           reformatted as CSV. No names, designations or dates were altered.',
        `# Catalogue edition: ${edition}`,
        `# Extracted: ${extracted}`,
        KEPT_COLUMNS.map((column) => column.csvName).join(',')
    ];

    return [...header, ...rows.map((row) => row.join(','))].join('\n') + '\n';
}

async function main(): Promise<void> {
    const source = argValue('source') ?? DEFAULT_SOURCE;
    const out = argValue('out') ?? DEFAULT_OUT;
    const extracted = argValue('extracted') ?? new Date().toISOString().slice(0, 10);

    console.log(`Reading ${source}`);
    const lines = (await readSource(source)).split(/\r?\n/);

    const { starts } = deriveColumns(lines);
    const edition = deriveEdition(lines);
    console.log(`Catalogue edition: ${edition}`);

    const fieldAt = (line: string, index: number): string => {
        const start = starts[index];
        const end = index + 1 < starts.length ? starts[index + 1] : line.length;
        return line.slice(start, end).trim();
    };

    const rows: string[][] = [];
    for (const line of lines) {
        // '#' is the normal comment marker; one malformed header line uses '$'.
        if (line.startsWith('#') || line.startsWith('$') || line.trim() === '') {
            continue;
        }
        rows.push(KEPT_COLUMNS.map((column) => fieldAt(line, column.index)));
    }

    const content = buildCsv(rows, edition, extracted);

    // Validate with the same parser the application uses; it throws on any
    // violation, naming the offending line, so a bad extraction never lands.
    const names = parseStarNameCsv(content);
    console.log(`Extracted ${names.length} names`);
    console.log(`Names containing a space: ${names.filter((name) => name.includes(' ')).length}`);

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content, 'utf8');
    console.log(`Wrote ${out}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
