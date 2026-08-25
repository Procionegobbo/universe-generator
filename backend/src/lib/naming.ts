// System and star component naming.
//
// Pure module: the PRNG and the proper-name pool are injected, so nothing here
// touches the filesystem or the generator's main random stream.

/** Chance a system draws a proper name from the pool. */
export const NAMED_SYSTEM_PROBABILITY = 0.3;
/** Chance a secondary component of a proper-named system draws its own proper name. */
export const INDEPENDENT_COMPONENT_NAME_PROBABILITY = 0.15;
/** Catalogue acronym used by designations. */
export const DESIGNATION_PREFIX = 'UG';
/** Zero-padding width of the designation number. */
export const DESIGNATION_MIN_DIGITS = 4;

export interface SystemNaming {
    systemName: string;
    hasProperName: boolean;
    starNames: string[];   // exactly `starCount` entries, index 0 = component A
}

/** `6` -> "UG-0006"; `12345` -> "UG-12345" (never truncated). */
export function formatDesignation(systemId: number): string {
    const digits = String(systemId).padStart(DESIGNATION_MIN_DIGITS, '0');
    return `${DESIGNATION_PREFIX}-${digits}`;
}

/** 1 -> "A", 2 -> "B", ... (supports 1-26; star counts are 1-4). */
export function componentLetter(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index - 1);
}

export class SectorNamer {
    private readonly names: string[];
    private cursor = 0;

    constructor(private readonly prng: () => number, pool: readonly string[]) {
        this.names = [...pool];            // per-instance mutable copy
    }

    private hasNext(): boolean {
        return this.cursor < this.names.length;
    }

    /** Partial Fisher-Yates: one PRNG draw, no repeats. */
    private take(): string {
        const i = this.cursor + Math.floor(this.prng() * (this.names.length - this.cursor));
        const picked = this.names[i];
        this.names[i] = this.names[this.cursor];
        this.names[this.cursor] = picked;
        this.cursor++;
        return picked;
    }

    nameSystem(systemId: number, starCount: number): SystemNaming {
        // 1. Always draw, then decide: keeps the stream independent of pool state.
        const systemRoll = this.prng();
        const hasProperName = systemRoll < NAMED_SYSTEM_PROBABILITY && this.hasNext();
        const systemName = hasProperName ? this.take() : formatDesignation(systemId);

        // 2. A lone star simply *is* the system.
        if (starCount === 1) {
            return { systemName, hasProperName, starNames: [systemName] };
        }

        // 3. Multi-star: primary always tied; secondaries may draw their own name.
        const starNames: string[] = [`${systemName}-${componentLetter(1)}`];
        for (let s = 2; s <= starCount; s++) {
            const componentRoll = this.prng();          // drawn unconditionally
            const independent =
                hasProperName &&
                componentRoll < INDEPENDENT_COMPONENT_NAME_PROBABILITY &&
                this.hasNext();
            starNames.push(independent ? this.take() : `${systemName}-${componentLetter(s)}`);
        }
        return { systemName, hasProperName, starNames };
    }
}
