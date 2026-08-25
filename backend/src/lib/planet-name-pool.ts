import fs from 'fs';
import path from 'path';

// Minimum number of data rows the CSV must contain; a smaller file means a
// truncated or half-populated asset and is treated as an error.
export const MIN_PLANET_POOL_SIZE = 200;
export const PLANET_CSV_HEADER = 'name,source';
export const PLANET_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 '\-]*$/;

const ASSET_FILENAME = 'planet-proper-names.csv';
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 32;

let cachedNames: readonly string[] | null = null;

/**
 * Parses the planet-name CSV and returns the name column. Throws on any violation.
 *
 * Blank lines and '#' comment lines are ignored anywhere in the file; quoted
 * fields are not supported (no value may contain a comma).
 */
export function parsePlanetNameCsv(content: string): string[] {
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
            if (trimmed !== PLANET_CSV_HEADER) {
                throw new Error(
                    `Invalid planet name CSV header on line ${lineNumber}: expected "${PLANET_CSV_HEADER}", got "${trimmed}"`
                );
            }
            headerSeen = true;
            continue;
        }

        const fields = trimmed.split(',').map((field) => field.trim());
        if (fields.length !== 2) {
            throw new Error(
                `Invalid planet name CSV row on line ${lineNumber}: expected 2 comma-separated fields, got ${fields.length} in "${trimmed}"`
            );
        }

        const [name, source] = fields;

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new Error(
                `Invalid planet name on line ${lineNumber}: "${name}" must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
            );
        }
        if (!PLANET_NAME_PATTERN.test(name)) {
            throw new Error(
                `Invalid planet name on line ${lineNumber}: "${name}" contains disallowed characters`
            );
        }

        const key = name.toLowerCase();
        if (seen.has(key)) {
            throw new Error(`Duplicate planet name on line ${lineNumber}: "${name}"`);
        }
        seen.add(key);

        if (source === '') {
            throw new Error(`Missing source on line ${lineNumber} for "${name}"`);
        }

        names.push(name);
    }

    if (!headerSeen) {
        throw new Error(`Invalid planet name CSV: header "${PLANET_CSV_HEADER}" not found`);
    }
    if (names.length < MIN_PLANET_POOL_SIZE) {
        throw new Error(
            `Invalid planet name CSV: expected at least ${MIN_PLANET_POOL_SIZE} data rows, got ${names.length}`
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
export function loadPlanetProperNames(): readonly string[] {
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

    cachedNames = Object.freeze(parsePlanetNameCsv(fs.readFileSync(assetPath, 'utf8')));
    return cachedNames;
}
