import fs from 'fs';
import path from 'path';

// Minimum number of data rows the CSV must contain; a smaller file means a
// truncated or half-populated asset and is treated as an error.
export const MIN_POOL_SIZE = 100;
export const CSV_HEADER = 'name,designation,constellation,iau_approval_date';
export const NAME_PATTERN = /^[A-Za-z][A-Za-z '\-]*$/;

const ASSET_FILENAME = 'star-proper-names.csv';
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 32;
const APPROVAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

let cachedNames: readonly string[] | null = null;

/**
 * Parses the proper-name CSV and returns the name column. Throws on any violation.
 *
 * Blank lines and '#' comment lines are ignored anywhere in the file; quoted
 * fields are not supported (no value may contain a comma).
 */
export function parseStarNameCsv(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const names: string[] = [];
    const seen = new Set<string>();
    let headerSeen = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }

        const lineNumber = i + 1;

        if (!headerSeen) {
            if (trimmed !== CSV_HEADER) {
                throw new Error(
                    `Invalid star name CSV header on line ${lineNumber}: expected "${CSV_HEADER}", got "${trimmed}"`
                );
            }
            headerSeen = true;
            continue;
        }

        const fields = trimmed.split(',').map((field) => field.trim());
        if (fields.length !== 4) {
            throw new Error(
                `Invalid star name CSV row on line ${lineNumber}: expected 4 comma-separated fields, got ${fields.length} in "${trimmed}"`
            );
        }

        const [name, designation, constellation, approvalDate] = fields;

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new Error(
                `Invalid star name on line ${lineNumber}: "${name}" must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
            );
        }
        if (!NAME_PATTERN.test(name)) {
            throw new Error(
                `Invalid star name on line ${lineNumber}: "${name}" contains disallowed characters`
            );
        }

        const key = name.toLowerCase();
        if (seen.has(key)) {
            throw new Error(`Duplicate star name on line ${lineNumber}: "${name}"`);
        }
        seen.add(key);

        if (designation === '') {
            throw new Error(`Missing designation on line ${lineNumber} for "${name}"`);
        }
        if (constellation === '') {
            throw new Error(`Missing constellation on line ${lineNumber} for "${name}"`);
        }
        if (approvalDate === '') {
            throw new Error(`Missing iau_approval_date on line ${lineNumber} for "${name}"`);
        }
        if (!APPROVAL_DATE_PATTERN.test(approvalDate)) {
            throw new Error(
                `Invalid iau_approval_date on line ${lineNumber} for "${name}": "${approvalDate}" is not YYYY-MM-DD`
            );
        }

        names.push(name);
    }

    if (!headerSeen) {
        throw new Error(`Invalid star name CSV: header "${CSV_HEADER}" not found`);
    }
    if (names.length < MIN_POOL_SIZE) {
        throw new Error(
            `Invalid star name CSV: expected at least ${MIN_POOL_SIZE} data rows, got ${names.length}`
        );
    }

    return names;
}

/**
 * Reads, parses and caches the packaged CSV asset. Throws if it cannot be found or is invalid.
 *
 * A missing or invalid asset is a build/deploy defect: it fails loudly rather
 * than degrading to a smaller pool, so the same seed cannot produce different
 * output on different deployments.
 */
export function loadStarProperNames(): readonly string[] {
    if (cachedNames) {
        return cachedNames;
    }

    const candidates = [
        // ts-node/nodemon dev, Jest, the compiled build and the Vercel bundle.
        path.join(__dirname, '../assets', ASSET_FILENAME),
        // Repo-root cwd.
        path.join(process.cwd(), 'backend/src/assets', ASSET_FILENAME),
        // backend/ cwd.
        path.join(process.cwd(), 'src/assets', ASSET_FILENAME)
    ];

    const assetPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!assetPath) {
        throw new Error(`${ASSET_FILENAME} not found; tried: ${candidates.join(', ')}`);
    }

    cachedNames = Object.freeze(parseStarNameCsv(fs.readFileSync(assetPath, 'utf8')));
    return cachedNames;
}
